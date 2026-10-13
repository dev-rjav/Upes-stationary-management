import os
from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_cors import CORS
from flask_apscheduler import APScheduler
from config import config

db = SQLAlchemy()
login_manager = LoginManager()
scheduler = APScheduler()


def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    db.init_app(app)
    login_manager.init_app(app)
    CORS(app, supports_credentials=True, origins=['http://localhost:3000'])

    from .models import Receptionist

    @login_manager.user_loader
    def load_user(user_id):
        return Receptionist.query.get(int(user_id))

    from .routes.auth import auth_bp
    from .routes.teacher import teacher_bp
    from .routes.requests import requests_bp
    from .routes.items import items_bp
    from .routes.stock import stock_bp
    from .routes.dashboard import dashboard_bp
    from .routes.reports import reports_bp
    from .routes.settings import settings_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(teacher_bp, url_prefix='/api')
    app.register_blueprint(requests_bp, url_prefix='/api')
    app.register_blueprint(items_bp, url_prefix='/api')
    app.register_blueprint(stock_bp, url_prefix='/api')
    app.register_blueprint(dashboard_bp, url_prefix='/api')
    app.register_blueprint(reports_bp, url_prefix='/api')
    app.register_blueprint(settings_bp, url_prefix='/api')

    _register_spa(app)

    with app.app_context():
        db.create_all()
        # Under tests we want a clean, deterministic DB: no migrations against a
        # fresh schema, no demo data, and no background scheduler.
        if not app.config.get('TESTING'):
            _run_lightweight_migrations()
            _seed_if_empty()
            _apply_password_overrides()
            # Demo data is for development only — set SEED_DEMO=0 in production.
            if os.environ.get('SEED_DEMO', '1') == '1':
                _seed_demo_data()
            _start_scheduler(app)

    @app.cli.command('purge-demo')
    def purge_demo_cmd():
        """Remove all demo seed data (teachers SAP 90000001-90000070 and their history)."""
        from seeds.demo import purge_demo
        purge_demo(db)

    return app


def _register_spa(app):
    """Serve the built React app same-origin when FRONTEND_DIST is configured.

    Any non-/api path falls back to index.html so client-side routes (e.g.
    /login, /receptionist/...) work on a hard refresh. Does nothing in dev
    (where Vite serves the frontend and FRONTEND_DIST is unset).
    """
    dist = app.config.get('FRONTEND_DIST')
    if not dist or not os.path.isdir(dist):
        return

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def _spa(path):
        if path.startswith('api/'):
            return ('Not found', 404)
        full = os.path.join(dist, path)
        if path and os.path.isfile(full):
            return send_from_directory(dist, path)
        return send_from_directory(dist, 'index.html')


def _run_lightweight_migrations():
    """Add columns introduced after initial create_all() on existing SQLite DBs.

    db.create_all() never ALTERs existing tables, so new columns on already-created
    tables must be added by hand. Each statement is idempotent (guarded by a column
    existence check) so it is safe to run on every boot.
    """
    from sqlalchemy import inspect, text

    inspector = inspect(db.engine)
    try:
        cols = {c['name'] for c in inspector.get_columns('clusters')}
    except Exception:
        return
    if 'caps_disabled' not in cols:
        db.session.execute(text(
            'ALTER TABLE clusters ADD COLUMN caps_disabled BOOLEAN NOT NULL DEFAULT 0'
        ))
        db.session.commit()


def _seed_demo_data():
    from seeds.demo import seed_demo, top_up_demo_current_month
    seed_demo(db)
    top_up_demo_current_month(db)


def _seed_if_empty():
    from .models import Receptionist, Cluster, StationaryItem, Stock, SystemSettings
    from seeds.clusters import CLUSTER_NAMES
    from seeds.items import ITEMS_DATA

    if Receptionist.query.count() == 0:
        import os
        admin_pw = os.environ.get('ADMIN_PASSWORD', 'admin123')
        guest_pw = os.environ.get('GUEST_PASSWORD', 'guest123')

        admin = Receptionist(username='invinder_kaur', display_name='Invinder Kaur', role='admin')
        admin.set_password(admin_pw)
        guest = Receptionist(username='guest', display_name='GUEST', role='guest')
        guest.set_password(guest_pw)
        db.session.add_all([admin, guest])
        db.session.commit()

    if Cluster.query.count() == 0:
        for name in CLUSTER_NAMES:
            db.session.add(Cluster(name=name))
        db.session.commit()

    if StationaryItem.query.count() == 0:
        for d in ITEMS_DATA:
            item = StationaryItem(
                name=d['name'], unit=d['unit'],
                hsn_code=d.get('hsn'), low_stock_threshold=d.get('threshold', 10),
                per_checkout_cap=d.get('per_checkout_cap'),
                monthly_cap=d.get('monthly_cap'),
            )
            db.session.add(item)
            db.session.flush()
            db.session.add(Stock(item_id=item.id, quantity_on_hand=d.get('initial_stock', 0)))
        db.session.commit()

    if not SystemSettings.get('pending_request_ttl_hours'):
        SystemSettings.set('pending_request_ttl_hours', '48')


def _apply_password_overrides():
    """Reset seeded account passwords from env when RESET_PASSWORDS=1.

    First-run seeding already honours ADMIN_PASSWORD / GUEST_PASSWORD. This lets
    a reinstall update the passwords of accounts that already exist (the
    installer sets RESET_PASSWORDS=1 only when the operator opts in).
    """
    if os.environ.get('RESET_PASSWORDS') != '1':
        return
    from .models import Receptionist
    changed = False
    for username, env_key in (('invinder_kaur', 'ADMIN_PASSWORD'), ('guest', 'GUEST_PASSWORD')):
        pw = os.environ.get(env_key)
        if not pw:
            continue
        user = Receptionist.query.filter_by(username=username).first()
        if user:
            user.set_password(pw)
            changed = True
    if changed:
        db.session.commit()


def _start_scheduler(app):
    from .services.cleanup_service import delete_stale_pending_requests

    scheduler.init_app(app)

    @scheduler.task('interval', id='cleanup_pending', hours=1, misfire_grace_time=900)
    def cleanup_job():
        with app.app_context():
            delete_stale_pending_requests()

    scheduler.start()
