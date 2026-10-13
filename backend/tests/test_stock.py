"""Stock deduction, the last-unit race, and no-oversell guarantees."""
from app.models import Request, RequestLine, Stock
from app import db

AREA = 'Stock & Race Conditions'


def _submit(client, sap, item_id, qty):
    return client.post('/api/requests', json={
        'sap_id': sap, 'cluster': 'ENGINEERING',
        'items': [{'item_id': item_id, 'qty': qty}],
    })


def test_stock_unchanged_until_approval(seed, as_admin):
    """Submitting a request does NOT deduct stock; only approval does."""
    before = Stock.query.filter_by(item_id=seed['pen_id']).first().quantity_on_hand
    _submit(as_admin, '40000001', seed['pen_id'], 3)
    assert Stock.query.filter_by(item_id=seed['pen_id']).first().quantity_on_hand == before
    # now approve
    rid = Request.query.first().id
    as_admin.patch(f'/api/requests/{rid}/approve')
    assert Stock.query.filter_by(item_id=seed['pen_id']).first().quantity_on_hand == before - 3


def test_last_unit_race_second_approval_blocked(seed, as_admin):
    """THE key scenario: two teachers pend for the last TONER; only one is approved.

    TONER stock = 1. T1 and T2 both submit (both allowed — stock isn't reserved
    on pending). Approving T1 succeeds; approving T2 is refused (409) instead of
    overselling. T2 stays pending so the receptionist can reject/restock.
    """
    r1 = _submit(as_admin, '40000001', seed['toner_id'], 1)
    r2 = _submit(as_admin, '40000002', seed['toner_id'], 1)
    assert r1.status_code == 201 and r2.status_code == 201

    a1 = as_admin.patch(f"/api/requests/{r1.get_json()['id']}/approve")
    assert a1.status_code == 200
    assert Stock.query.filter_by(item_id=seed['toner_id']).first().quantity_on_hand == 0

    a2 = as_admin.patch(f"/api/requests/{r2.get_json()['id']}/approve")
    assert a2.status_code == 409 and 'Insufficient stock' in a2.get_json()['error']

    r2_obj = Request.query.get(r2.get_json()['id'])
    assert r2_obj.status == 'pending'


def test_fulfilled_qty_matches_deduction(seed, as_admin):
    """Approved line records exactly what was deducted (no phantom fulfilment)."""
    r = _submit(as_admin, '40000001', seed['toner_id'], 1)
    as_admin.patch(f"/api/requests/{r.get_json()['id']}/approve")
    line = RequestLine.query.filter_by(request_id=r.get_json()['id']).first()
    assert line.quantity_fulfilled == 1


def test_manual_override_never_oversells(seed, as_admin):
    """A manual override for more than on hand floors stock at 0 and fulfils only the available qty."""
    # TONER stock = 1, override-request 3 and check out now.
    r = as_admin.post('/api/requests/manual', json={
        'sap_id': '40000001', 'cluster': 'ENGINEERING',
        'items': [{'item_id': seed['toner_id'], 'qty': 3}],
        'cap_override': True, 'override_reason': 'urgent', 'approve_now': True,
    })
    assert r.status_code == 201
    assert Stock.query.filter_by(item_id=seed['toner_id']).first().quantity_on_hand == 0
    line = RequestLine.query.filter_by(request_id=r.get_json()['id']).first()
    assert line.quantity_fulfilled == 1  # only what existed, not 3


def test_manual_stock_in_increments(seed, as_admin):
    """Manual stock-in adds to on-hand quantity."""
    before = Stock.query.filter_by(item_id=seed['toner_id']).first().quantity_on_hand
    r = as_admin.post('/api/stock-in', json={
        'lines': [{'item_id': seed['toner_id'], 'quantity_received': 10, 'rate_per_unit': 50}],
        'vendor': 'Acme',
    })
    assert r.status_code == 201
    assert Stock.query.filter_by(item_id=seed['toner_id']).first().quantity_on_hand == before + 10


def test_restock_unblocks_second_request(seed, as_admin):
    """After the race, restocking lets the previously-blocked request be approved."""
    r1 = _submit(as_admin, '40000001', seed['toner_id'], 1)
    r2 = _submit(as_admin, '40000002', seed['toner_id'], 1)
    as_admin.patch(f"/api/requests/{r1.get_json()['id']}/approve")
    assert as_admin.patch(f"/api/requests/{r2.get_json()['id']}/approve").status_code == 409
    # restock one unit
    as_admin.post('/api/stock-in', json={'lines': [{'item_id': seed['toner_id'], 'quantity_received': 1, 'rate_per_unit': 50}]})
    assert as_admin.patch(f"/api/requests/{r2.get_json()['id']}/approve").status_code == 200
