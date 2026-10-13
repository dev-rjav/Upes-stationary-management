"""System settings — admin-only TTL control."""
from app.models import SystemSettings

AREA = 'Settings & Admin'


def test_get_settings_requires_login(seed, client):
    """Settings are not readable anonymously."""
    assert client.get('/api/settings').status_code == 401


def test_admin_can_update_ttl(seed, as_admin):
    """An admin can change the pending-request TTL."""
    r = as_admin.patch('/api/settings', json={'pending_request_ttl_hours': '24'})
    assert r.status_code == 200
    assert SystemSettings.get('pending_request_ttl_hours') == '24'


def test_guest_cannot_update_settings(seed, as_guest):
    """A guest receptionist is forbidden from changing settings (admin-only)."""
    r = as_guest.patch('/api/settings', json={'pending_request_ttl_hours': '1'})
    assert r.status_code == 403
    # value unchanged
    assert SystemSettings.get('pending_request_ttl_hours') == '48'


def test_guest_can_read_settings(seed, as_guest):
    """A guest can still read settings."""
    assert as_guest.get('/api/settings').status_code == 200
