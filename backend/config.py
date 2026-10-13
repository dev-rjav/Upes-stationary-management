import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-change-in-production')
    # DB location is configurable so a packaged/service deployment can keep the
    # database in a stable, writable folder (NOT inside a PyInstaller temp dir).
    # Priority: DATABASE_URL > STATIONERY_DB_PATH (a file path) > local default.
    _db_path = os.environ.get('STATIONERY_DB_PATH', os.path.join(BASE_DIR, 'stationary.db'))
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', f"sqlite:///{_db_path}")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Folder holding the built frontend (index.html + assets). When set, the app
    # serves the SPA same-origin so /api and session cookies just work on the LAN.
    FRONTEND_DIST = os.environ.get('FRONTEND_DIST')
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    SCHEDULER_API_ENABLED = False


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


class TestingConfig(Config):
    """In-memory DB, no demo seed, no scheduler — for the pytest suite.

    StaticPool keeps the single in-memory SQLite database alive and shared
    across connections within the test process.
    """
    TESTING = True
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = 'sqlite://'  # in-memory
    from sqlalchemy.pool import StaticPool
    SQLALCHEMY_ENGINE_OPTIONS = {
        'connect_args': {'check_same_thread': False},
        'poolclass': StaticPool,
    }


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig,
}
