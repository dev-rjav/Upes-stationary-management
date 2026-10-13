"""Authentication & session protection."""
AREA = 'Authentication'


def test_login_success(seed, client):
    """Valid admin credentials return the user and establish a session."""
    r = client.post('/api/auth/login', json={'username': 'invinder_kaur', 'password': 'adminpw'})
    assert r.status_code == 200
    assert r.get_json()['role'] == 'admin'


def test_login_is_case_insensitive_username(seed, client):
    """Username matching ignores case."""
    r = client.post('/api/auth/login', json={'username': 'Invinder_Kaur', 'password': 'adminpw'})
    assert r.status_code == 200


def test_login_wrong_password(seed, client):
    """A wrong password is rejected with 401 and no session."""
    r = client.post('/api/auth/login', json={'username': 'invinder_kaur', 'password': 'nope'})
    assert r.status_code == 401


def test_login_unknown_user(seed, client):
    """An unknown username is rejected with 401."""
    r = client.post('/api/auth/login', json={'username': 'ghost', 'password': 'x'})
    assert r.status_code == 401


def test_me_requires_login(seed, client):
    """/auth/me is protected when no session exists."""
    assert client.get('/api/auth/me').status_code == 401


def test_me_after_login(seed, as_admin):
    """/auth/me returns the current user once logged in."""
    r = as_admin.get('/api/auth/me')
    assert r.status_code == 200 and r.get_json()['username'] == 'invinder_kaur'


def test_logout_clears_session(seed, as_admin):
    """After logout, protected endpoints are inaccessible again."""
    assert as_admin.post('/api/auth/logout').status_code == 200
    assert as_admin.get('/api/auth/me').status_code == 401


def test_stock_endpoint_requires_login(seed, client):
    """Receptionist-only endpoints reject anonymous access."""
    assert client.get('/api/stock').status_code == 401
