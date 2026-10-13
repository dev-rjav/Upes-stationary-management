"""Production entrypoint — serves the API + built SPA via Waitress.

Runs identically whether launched as a plain Python script (dev machine) or
from a PyInstaller bundle (receptionist laptop with no Python). All runtime
locations resolve to stable, writable folders so data survives restarts.

Environment (all optional; sensible defaults):
  PORT                 TCP port to listen on            (default 8080)
  STATIONERY_DATA_DIR  folder for the SQLite database   (default C:\\StationeryApp\\data)
  SECRET_KEY           Flask session key (set a fixed value so logins survive restarts)
  ADMIN_PASSWORD       seeded admin password on first run
  GUEST_PASSWORD       seeded guest password on first run
"""
import os
import sys


def _resource(rel):
    """Path to a bundled resource — works in source and in a PyInstaller bundle."""
    base = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, rel)


def _bootstrap_env():
    data_dir = os.environ.get('STATIONERY_DATA_DIR') or r'C:\StationeryApp\data'
    os.makedirs(data_dir, exist_ok=True)
    os.environ.setdefault('STATIONERY_DB_PATH', os.path.join(data_dir, 'stationary.db'))

    # Frontend build is bundled next to this script as "frontend_dist".
    dist = _resource('frontend_dist')
    if os.path.isdir(dist):
        os.environ.setdefault('FRONTEND_DIST', dist)

    os.environ.setdefault('SEED_DEMO', '0')          # no demo data in production
    os.environ.setdefault('FLASK_ENV', 'production')
    return data_dir


def main():
    _bootstrap_env()
    from waitress import serve
    from app import create_app

    app = create_app('production')
    port = int(os.environ.get('PORT', '8080'))
    # threads: a handful is plenty for a reception desk + a few LAN clients.
    serve(app, host='0.0.0.0', port=port, threads=8, channel_timeout=120)


if __name__ == '__main__':
    main()
