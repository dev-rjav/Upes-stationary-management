from flask import Blueprint, request, jsonify, session
from flask_login import login_user, logout_user, login_required, current_user
from datetime import datetime, timezone
from ..models import Receptionist
from .. import db

auth_bp = Blueprint('auth', __name__)


@auth_bp.post('/login')
def login():
    data = request.get_json(force=True)
    username = (data.get('username') or '').strip().lower()
    password = data.get('password', '')

    user = Receptionist.query.filter(
        db.func.lower(Receptionist.username) == username
    ).first()

    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid username or password'}), 401

    login_user(user, remember=True)
    user.last_login = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify(user.to_dict())


@auth_bp.post('/logout')
@login_required
def logout():
    logout_user()
    return jsonify({'ok': True})


@auth_bp.get('/me')
@login_required
def me():
    return jsonify(current_user.to_dict())
