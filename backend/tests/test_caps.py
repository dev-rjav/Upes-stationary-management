"""Cap enforcement: per-checkout, monthly reservation, release, override, caps-off."""
from app.models import Teacher, Cluster
from app import db

AREA = 'Cap Enforcement'


def _submit(client, sap, cluster, item_id, qty, name=''):
    return client.post('/api/requests', json={
        'sap_id': sap, 'name': name, 'cluster': cluster,
        'items': [{'item_id': item_id, 'qty': qty}],
    })


def test_per_checkout_cap_blocks(seed, client):
    """Requesting more than the per-checkout cap (5) in one go is blocked."""
    r = _submit(client, '40000001', 'ENGINEERING', seed['pen_id'], 6)
    assert r.status_code == 400 and 'Per-checkout' in r.get_json()['error']


def test_per_checkout_cap_ok(seed, client):
    """Requesting exactly the per-checkout cap succeeds."""
    assert _submit(client, '40000001', 'ENGINEERING', seed['pen_id'], 5).status_code == 201


def test_pending_reserves_monthly_cap(seed, client):
    """Pending requests reserve the monthly cap so it can't be over-stacked.

    Monthly cap 10: two pending requests of 5 fill it; a third unit is blocked.
    """
    assert _submit(client, '40000001', 'ENGINEERING', seed['pen_id'], 5).status_code == 201
    assert _submit(client, '40000001', 'ENGINEERING', seed['pen_id'], 5).status_code == 201
    r3 = _submit(client, '40000001', 'ENGINEERING', seed['pen_id'], 1)
    assert r3.status_code == 400 and 'Monthly' in r3.get_json()['error']


def test_rejecting_releases_reservation(seed, as_admin):
    """Rejecting a pending request frees its reserved cap for a new request."""
    r1 = _submit(as_admin, '40000001', 'ENGINEERING', seed['pen_id'], 5)
    _submit(as_admin, '40000001', 'ENGINEERING', seed['pen_id'], 5)
    # cap now fully reserved -> blocked
    assert _submit(as_admin, '40000001', 'ENGINEERING', seed['pen_id'], 1).status_code == 400
    # reject the first -> 5 units freed
    rid = r1.get_json()['id']
    assert as_admin.patch(f'/api/requests/{rid}/reject', json={'reason': 'x'}).status_code == 200
    assert _submit(as_admin, '40000001', 'ENGINEERING', seed['pen_id'], 5).status_code == 201


def test_caps_disabled_department_bypasses(seed, client):
    """A department with caps_disabled ignores per-checkout and monthly caps."""
    t = Teacher(sap_id='40000003', name='Carol', cluster_id=seed['free_dept_id'])
    db.session.add(t)
    db.session.commit()
    r = _submit(client, '40000003', 'FREE DEPT', seed['pen_id'], 50)
    assert r.status_code == 201


def test_approval_rechecks_lowered_cap(seed, as_admin):
    """If the cap is lowered after a request is placed, approval is refused."""
    r = _submit(as_admin, '40000001', 'ENGINEERING', seed['pen_id'], 5)
    rid = r.get_json()['id']
    # Admin lowers PEN monthly cap below the pending amount.
    as_admin.patch(f"/api/items/{seed['pen_id']}", json={'monthly_cap': 3})
    resp = as_admin.patch(f'/api/requests/{rid}/approve')
    assert resp.status_code == 400 and 'Cap' in resp.get_json()['error']


def test_cap_override_manual_bypasses(seed, as_admin):
    """A receptionist manual request with cap_override checks out past the cap."""
    r = as_admin.post('/api/requests/manual', json={
        'sap_id': '40000001', 'cluster': 'ENGINEERING',
        'items': [{'item_id': seed['pen_id'], 'qty': 40}],
        'cap_override': True, 'override_reason': 'cluster head approved', 'approve_now': True,
    })
    assert r.status_code == 201
    body = r.get_json()
    assert body['status'] == 'fulfilled' and body['is_cap_override'] is True


def test_manual_without_override_still_capped(seed, as_admin):
    """A manual request WITHOUT override is still subject to caps."""
    r = as_admin.post('/api/requests/manual', json={
        'sap_id': '40000001', 'cluster': 'ENGINEERING',
        'items': [{'item_id': seed['pen_id'], 'qty': 6}],
    })
    assert r.status_code == 400


def test_override_does_not_consume_future_cap(seed, as_admin):
    """An override checkout is an exception and does not block later normal use.

    Per spec, override usage is not counted against the teacher's cap. After a
    40-unit override, a normal 5-unit (within cap) request still succeeds.
    """
    as_admin.post('/api/requests/manual', json={
        'sap_id': '40000001', 'cluster': 'ENGINEERING',
        'items': [{'item_id': seed['pen_id'], 'qty': 40}],
        'cap_override': True, 'override_reason': 'head approved', 'approve_now': True,
    })
    assert _submit(as_admin, '40000001', 'ENGINEERING', seed['pen_id'], 5).status_code == 201
