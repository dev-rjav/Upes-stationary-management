"""SAP ID rule + request submission input validation."""
from app.utils.validators import is_valid_sap_id

AREA = 'Input Validation'


def _submit(client, sap, cluster, items, name=''):
    return client.post('/api/requests', json={'sap_id': sap, 'name': name, 'cluster': cluster, 'items': items})


# ---- SAP ID unit rule ----
def test_sap_valid():
    """A SAP ID of 8 digits starting with 4000 is valid."""
    assert is_valid_sap_id('40001234')


def test_sap_too_short():
    """Fewer than 8 digits is invalid."""
    assert not is_valid_sap_id('4000123')


def test_sap_wrong_prefix():
    """Not starting with 4000 is invalid."""
    assert not is_valid_sap_id('50001234')


def test_sap_non_numeric():
    """Non-numeric characters are invalid."""
    assert not is_valid_sap_id('4000abcd')


def test_sap_empty_or_none():
    """Empty / None is invalid, not an error."""
    assert not is_valid_sap_id('') and not is_valid_sap_id(None)


# ---- Request submission guards ----
def test_submit_rejects_bad_sap(seed, client):
    """Submitting with an invalid SAP ID is a 400."""
    r = _submit(client, '123', 'ENGINEERING', [{'item_id': seed['pen_id'], 'qty': 1}])
    assert r.status_code == 400


def test_submit_rejects_no_items(seed, client):
    """Submitting with no items is a 400."""
    assert _submit(client, '40000001', 'ENGINEERING', []).status_code == 400


def test_submit_rejects_unknown_cluster(seed, client):
    """An unknown department name is a 400."""
    r = _submit(client, '40000001', 'NO SUCH DEPT', [{'item_id': seed['pen_id'], 'qty': 1}])
    assert r.status_code == 400


def test_new_teacher_requires_name(seed, client):
    """A brand-new SAP ID with no name supplied is a 400."""
    r = _submit(client, '40009999', 'ENGINEERING', [{'item_id': seed['pen_id'], 'qty': 1}])
    assert r.status_code == 400


def test_submit_rejects_zero_qty(seed, client):
    """A quantity of zero is rejected."""
    r = _submit(client, '40000001', 'ENGINEERING', [{'item_id': seed['pen_id'], 'qty': 0}])
    assert r.status_code == 400


def test_submit_rejects_negative_qty(seed, client):
    """A negative quantity is rejected (cannot be used to inflate caps/stock)."""
    r = _submit(client, '40000001', 'ENGINEERING', [{'item_id': seed['pen_id'], 'qty': -3}])
    assert r.status_code == 400


def test_submit_rejects_missing_item_id(seed, client):
    """A line with no item_id is rejected."""
    r = _submit(client, '40000001', 'ENGINEERING', [{'qty': 1}])
    assert r.status_code == 400
