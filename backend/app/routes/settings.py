from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from ..models import SystemSettings

settings_bp = Blueprint('settings', __name__)


@settings_bp.get('/settings')
@login_required
def get_settings():
    rows = SystemSettings.query.all()
    return jsonify({r.key: r.value for r in rows})


@settings_bp.patch('/settings')
@login_required
def update_settings():
    if current_user.role != 'admin':
        return jsonify({'error': 'Admin only'}), 403

    data = request.get_json(force=True)
    for key, value in data.items():
        SystemSettings.set(key, value, updated_by=current_user.id)

    return jsonify({'ok': True})
