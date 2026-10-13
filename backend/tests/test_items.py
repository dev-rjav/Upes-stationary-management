"""Item catalogue, aliases, and per-cluster visibility."""
AREA = 'Items & Visibility'


def test_list_items_requires_login(seed, client):
    """The item catalogue is receptionist-only."""
    assert client.get('/api/items').status_code == 401


def test_create_item(seed, as_admin):
    """A new item can be created and starts with zero stock."""
    r = as_admin.post('/api/items', json={'name': 'Marker', 'unit': 'EA'})
    assert r.status_code == 201 and r.get_json()['on_hand'] == 0


def test_create_duplicate_item_conflicts(seed, as_admin):
    """Creating an item with an existing name is a 409."""
    as_admin.post('/api/items', json={'name': 'Marker'})
    assert as_admin.post('/api/items', json={'name': 'Marker'}).status_code == 409


def test_create_item_requires_name(seed, as_admin):
    """An item with no name is a 400."""
    assert as_admin.post('/api/items', json={'name': '  '}).status_code == 400


def test_update_item_caps(seed, as_admin):
    """Item caps and threshold can be updated."""
    r = as_admin.patch(f"/api/items/{seed['pen_id']}", json={'monthly_cap': 25, 'low_stock_threshold': 7})
    body = r.get_json()
    assert body['monthly_cap'] == 25 and body['low_stock_threshold'] == 7


def test_add_alias_and_reject_duplicate(seed, as_admin):
    """An alias can be added once; a duplicate is a 409."""
    assert as_admin.post(f"/api/items/{seed['pen_id']}/aliases", json={'alias': 'Biro'}).status_code == 201
    assert as_admin.post(f"/api/items/{seed['pen_id']}/aliases", json={'alias': 'Biro'}).status_code == 409


def test_hidden_item_absent_from_cluster_checkout(seed, client):
    """An item not enabled for a cluster does not appear in its checkout list."""
    r = client.get(f"/api/clusters/{seed['dept_id']}/items")
    names = [i['name'] for i in r.get_json()]
    assert 'PEN' in names and 'HIDDEN' not in names


def test_submit_disabled_item_blocked(seed, client):
    """Submitting a request for a non-enabled item is rejected."""
    r = client.post('/api/requests', json={
        'sap_id': '40000001', 'cluster': 'ENGINEERING',
        'items': [{'item_id': seed['hidden_id'], 'qty': 1}],
    })
    assert r.status_code == 400


def test_toggle_cluster_item_visibility(seed, as_admin):
    """A single cluster-item can be toggled on."""
    r = as_admin.patch(f"/api/clusters/{seed['dept_id']}/items/{seed['hidden_id']}", json={'is_enabled': True})
    assert r.status_code == 200 and r.get_json()['is_enabled'] is True
