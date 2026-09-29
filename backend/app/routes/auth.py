from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required, login_user, logout_user

from app.models import Receptionist

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    user = Receptionist.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "invalid username or password"}), 401
    login_user(user, remember=True)
    return jsonify({"user": user.to_dict()})


@bp.post("/logout")
@login_required
def logout():
    logout_user()
    return jsonify({"ok": True})


@bp.get("/me")
def me():
    if current_user.is_authenticated:
        return jsonify({"user": current_user.to_dict()})
    return jsonify({"user": None})