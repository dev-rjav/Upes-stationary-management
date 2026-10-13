"""Request lifecycle: pending -> fulfilled / rejected, and state guards."""
from app.models import Request, Teacher

AREA = 'Request Lifecycle'


def _submit(client, sap, item_id, qty, name=''):
    return client.post('/api/requests', json={
        'sap_id': sap, 'name': name, 'cluster': 'ENGINEERING',
        'items': [{'item_id': item_id, 'qty': qty}],
    })


def test_submit_creates_pending_with_ref(seed, client):
    """A submission creates a pending request with a reference number."""
    r = _submit(client, '40000001', seed['pen_id'], 2)
    assert r.status_code == 201 and r.get_json()['ref_number'].startswith('R-')
    assert Request.query.first().status == 'pending'


def test_new_teacher_created_on_submit(seed, client):
    """A new SAP ID with a name creates a teacher record on first submit."""
    _submit(client, '40007777', seed['pen_id'], 1, name='Dave')
    assert Teacher.query.filter_by(sap_id='40007777').first().name == 'Dave'


def test_approve_sets_fulfilled_and_actioner(seed, as_admin):
    """Approving sets status fulfilled and records who actioned it."""
    rid = _submit(as_admin, '40000001', seed['pen_id'], 2).get_json()['id']
    body = as_admin.patch(f'/api/requests/{rid}/approve').get_json()
    assert body['status'] == 'fulfilled' and body['actioned_by'] == 'Invinder Kaur'


def test_reject_sets_rejected_with_reason(seed, as_admin):
    """Rejecting sets status rejected and stores the reason."""
    rid = _submit(as_admin, '40000001', seed['pen_id'], 2).get_json()['id']
    body = as_admin.patch(f'/api/requests/{rid}/reject', json={'reason': 'out of policy'}).get_json()
    assert body['status'] == 'rejected' and body['rejection_reason'] == 'out of policy'


def test_cannot_approve_twice(seed, as_admin):
    """A non-pending request cannot be approved again."""
    rid = _submit(as_admin, '40000001', seed['pen_id'], 2).get_json()['id']
    as_admin.patch(f'/api/requests/{rid}/approve')
    assert as_admin.patch(f'/api/requests/{rid}/approve').status_code == 400


def test_cannot_reject_fulfilled(seed, as_admin):
    """A fulfilled request cannot be rejected."""
    rid = _submit(as_admin, '40000001', seed['pen_id'], 2).get_json()['id']
    as_admin.patch(f'/api/requests/{rid}/approve')
    assert as_admin.patch(f'/api/requests/{rid}/reject', json={'reason': 'x'}).status_code == 400


def test_approve_requires_login(seed, client):
    """Approval is receptionist-only."""
    rid = _submit(client, '40000001', seed['pen_id'], 2).get_json()['id']
    assert client.patch(f'/api/requests/{rid}/approve').status_code == 401


def test_list_requests_filters_by_status(seed, as_admin):
    """The request list supports status filtering."""
    _submit(as_admin, '40000001', seed['pen_id'], 2)
    r = as_admin.get('/api/requests?status=pending')
    assert r.status_code == 200 and r.get_json()['total'] >= 1
