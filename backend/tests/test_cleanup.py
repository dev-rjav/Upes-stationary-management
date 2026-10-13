"""Auto-expiry of stale pending requests (and that it releases reservations)."""
from datetime import datetime, timezone, timedelta
from app.models import Request, RequestLine
from app.services.cleanup_service import delete_stale_pending_requests
from app import db

AREA = 'Auto-Expiry'


def _submit(client, sap, item_id, qty):
    return client.post('/api/requests', json={
        'sap_id': sap, 'cluster': 'ENGINEERING',
        'items': [{'item_id': item_id, 'qty': qty}],
    })


def _backdate(req_id, hours):
    req = Request.query.get(req_id)
    req.created_at = datetime.now(timezone.utc) - timedelta(hours=hours)
    db.session.commit()


def test_stale_pending_is_deleted(seed, client):
    """A pending request older than the TTL (48h) is purged."""
    rid = _submit(client, '40000001', seed['pen_id'], 2).get_json()['id']
    _backdate(rid, 72)
    assert delete_stale_pending_requests() == 1
    assert Request.query.get(rid) is None


def test_recent_pending_is_kept(seed, client):
    """A fresh pending request is not purged."""
    rid = _submit(client, '40000001', seed['pen_id'], 2).get_json()['id']
    _backdate(rid, 1)
    assert delete_stale_pending_requests() == 0
    assert Request.query.get(rid) is not None


def test_fulfilled_never_deleted(seed, as_admin):
    """Fulfilled requests are retained permanently even when old."""
    rid = _submit(as_admin, '40000001', seed['pen_id'], 2).get_json()['id']
    as_admin.patch(f'/api/requests/{rid}/approve')
    _backdate(rid, 1000)
    delete_stale_pending_requests()
    assert Request.query.get(rid) is not None


def test_expiry_cascades_to_lines(seed, client):
    """Deleting a stale request also removes its request lines."""
    rid = _submit(client, '40000001', seed['pen_id'], 2).get_json()['id']
    _backdate(rid, 72)
    delete_stale_pending_requests()
    assert RequestLine.query.filter_by(request_id=rid).count() == 0


def test_expiry_releases_cap_reservation(seed, client):
    """A purged pending request frees the monthly cap it had reserved."""
    r1 = _submit(client, '40000001', seed['pen_id'], 5)
    _submit(client, '40000001', seed['pen_id'], 5)
    # cap fully reserved
    assert _submit(client, '40000001', seed['pen_id'], 1).status_code == 400
    _backdate(r1.get_json()['id'], 72)
    delete_stale_pending_requests()
    # 5 units freed -> a 5-unit request is allowed again
    assert _submit(client, '40000001', seed['pen_id'], 5).status_code == 201
