import os

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from werkzeug.security import check_password_hash

from config import config

db = SQLAlchemy()
login_manager = LoginManager()


def create_app(config_name="default"):
    app = Flask(__name__)
    app.config.from_object(config.get(config_name, config["default"]))

    # make sure the sqlite file has a writable home
    if app.config["SQLALCHEMY_DATABASE_URI"].startswith("sqlite:///") and not app.config["SQLALCHEMY_DATABASE_URI"].startswith("sqlite:////"):
        base = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        rel = app.config["SQLALCHEMY_DATABASE_URI"].replace("sqlite:///", "", 1)
        app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(base, rel)

    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"

    from app.models import cluster, item, notification, receptionist, request, stock, teacher  # noqa: F401

    @login_manager.user_loader
    def load_user(user_id):
        return receptionist.Receptionist.query.get(int(user_id))

    with app.app_context():
        db.create_all()
        from app.seeds import seed_if_empty
        seed_if_empty()

    from app.routes import auth, dashboard, items, reports, requests as req_routes, stock as stock_routes, teacher
    for bp in (auth.bp, dashboard.bp, items.bp, reports.bp, req_routes.bp, stock_routes.bp, teacher.bp):
        app.register_blueprint(bp)

    @app.get("/")
    def index():
        return {"name": "UPES Stationery Management API", "status": "ok"}

    @app.get("/healthz")
    def health():
        return {"ok": True}

    @app.errorhandler(404)
    def not_found(e):
        return {"error": "not found"}, 404

    @app.errorhandler(400)
    def bad_request(e):
        return {"error": "bad request", "detail": getattr(e, "description", str(e))}, 400

    @app.errorhandler(500)
    def server_error(e):
        return {"error": "internal server error"}, 500

    return app