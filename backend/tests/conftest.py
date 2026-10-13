"""Pytest harness for the stationery backend.

Provides an isolated in-memory app per test, seed fixtures, login helpers, and a
result collector that writes tests/_results.json for the Excel report builder.
"""
import os
import sys
import json
import datetime as _dt

import pytest

# Make the backend package importable when pytest is run from anywhere.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db as _db  # noqa: E402
from app.models import (  # noqa: E402
    Receptionist, Cluster, Teacher, StationaryItem, Stock, ClusterItem, SystemSettings,
)


# --------------------------------------------------------------------------- #
# Core fixtures
# --------------------------------------------------------------------------- #
@pytest.fixture()
def app():
    app = create_app('testing')
    ctx = app.app_context()
    ctx.push()
    yield app
    _db.session.remove()
    _db.drop_all()
    ctx.pop()


@pytest.fixture()
def db(app):
    return _db


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def seed(app):
    """Minimal deterministic dataset shared by most tests.

    Returns a dict of ids/handles. One department 'ENGINEERING' with:
      - PEN: stock 100, per-checkout cap 5, monthly cap 10
      - TONER: stock 1 (the 'last unit' item), no caps
      - HIDDEN: exists globally but NOT enabled for the cluster
    Two teachers T1 (40000001) and T2 (40000002), plus admin + guest accounts.
    """
    admin = Receptionist(username='invinder_kaur', display_name='Invinder Kaur', role='admin')
    admin.set_password('adminpw')
    guest = Receptionist(username='guest', display_name='GUEST', role='guest')
    guest.set_password('guestpw')
    _db.session.add_all([admin, guest])

    dept = Cluster(name='ENGINEERING')
    free_dept = Cluster(name='FREE DEPT', caps_disabled=True)
    _db.session.add_all([dept, free_dept])
    _db.session.flush()

    pen = StationaryItem(name='PEN', unit='EA', low_stock_threshold=10,
                         per_checkout_cap=5, monthly_cap=10, weekly_cap=None)
    toner = StationaryItem(name='TONER', unit='EA', low_stock_threshold=2)
    hidden = StationaryItem(name='HIDDEN', unit='EA', low_stock_threshold=1)
    _db.session.add_all([pen, toner, hidden])
    _db.session.flush()

    _db.session.add_all([
        Stock(item_id=pen.id, quantity_on_hand=100),
        Stock(item_id=toner.id, quantity_on_hand=1),
        Stock(item_id=hidden.id, quantity_on_hand=50),
    ])
    # Enable PEN (caps inherited) and TONER for ENGINEERING; HIDDEN stays off.
    _db.session.add_all([
        ClusterItem(cluster_id=dept.id, item_id=pen.id, is_enabled=True),
        ClusterItem(cluster_id=dept.id, item_id=toner.id, is_enabled=True),
        ClusterItem(cluster_id=dept.id, item_id=hidden.id, is_enabled=False),
        # FREE DEPT sees PEN too (caps disabled at dept level)
        ClusterItem(cluster_id=free_dept.id, item_id=pen.id, is_enabled=True),
    ])

    t1 = Teacher(sap_id='40000001', name='Alice', cluster_id=dept.id)
    t2 = Teacher(sap_id='40000002', name='Bob', cluster_id=dept.id)
    _db.session.add_all([t1, t2])

    SystemSettings.set('pending_request_ttl_hours', '48')
    _db.session.commit()

    return {
        'dept_id': dept.id, 'dept_name': 'ENGINEERING',
        'free_dept_id': free_dept.id, 'free_dept_name': 'FREE DEPT',
        'pen_id': pen.id, 'toner_id': toner.id, 'hidden_id': hidden.id,
        't1_id': t1.id, 't2_id': t2.id,
        't1_sap': '40000001', 't2_sap': '40000002',
        'admin_id': admin.id, 'guest_id': guest.id,
    }


@pytest.fixture()
def as_admin(client):
    client.post('/api/auth/login', json={'username': 'invinder_kaur', 'password': 'adminpw'})
    return client


@pytest.fixture()
def as_guest(client):
    client.post('/api/auth/login', json={'username': 'guest', 'password': 'guestpw'})
    return client


# --------------------------------------------------------------------------- #
# Result collection -> tests/_results.json (consumed by make_report.py)
# --------------------------------------------------------------------------- #
_COLLECTED = []


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()
    if report.when != 'call' and not (report.when == 'setup' and report.outcome != 'passed'):
        return
    if report.when == 'setup' and report.outcome == 'passed':
        return
    doc = (item.function.__doc__ or '').strip().split('\n')[0] if hasattr(item, 'function') else ''
    module = item.nodeid.split('::')[0].replace('tests/', '').replace('.py', '')
    _COLLECTED.append({
        'nodeid': item.nodeid,
        'name': item.name,
        'area': getattr(item.module, 'AREA', module),
        'description': doc,
        'outcome': report.outcome,
        'duration': round(getattr(report, 'duration', 0.0), 4),
        'message': (str(report.longrepr).splitlines()[-1][:300] if report.failed else ''),
    })


def pytest_sessionfinish(session, exitstatus):
    out = os.path.join(os.path.dirname(__file__), '_results.json')
    payload = {
        'generated_at': _dt.datetime.now().isoformat(timespec='seconds'),
        'python': sys.version.split()[0],
        'exit_status': int(exitstatus),
        'results': _COLLECTED,
    }
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(payload, f, indent=2)
