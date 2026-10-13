from flask import Blueprint, request, jsonify
from flask_login import login_required
from ..models import Teacher, Cluster, ClusterItem, StationaryItem
from ..services.cap_service import get_remaining
from .. import db

teacher_bp = Blueprint('teacher', __name__)


@teacher_bp.post('/teacher/lookup')
def lookup():
    data = request.get_json(force=True)
    sap_id = (data.get('sap_id') or '').strip()
    if not sap_id:
        return jsonify({'error': 'SAP ID required'}), 400

    teacher = Teacher.query.filter_by(sap_id=sap_id).first()
    if teacher:
        return jsonify({'found': True, **teacher.to_dict()})
    return jsonify({'found': False, 'sap_id': sap_id}), 200


@teacher_bp.get('/clusters')
def list_clusters():
    clusters = Cluster.query.order_by(Cluster.name).all()
    return jsonify([c.to_dict() for c in clusters])


@teacher_bp.get('/clusters/<int:cluster_id>/items')
def cluster_items(cluster_id):
    """Items available for teacher checkout in a cluster."""
    sap_id = request.args.get('sap_id')
    teacher = Teacher.query.filter_by(sap_id=sap_id).first() if sap_id else None

    cluster = Cluster.query.get(cluster_id)
    caps_off = bool(cluster and cluster.caps_disabled)

    enabled = ClusterItem.query.filter_by(cluster_id=cluster_id, is_enabled=True).all()
    result = []
    for ci in enabled:
        item = ci.item
        if not item:
            continue
        d = {
            'id': item.id,
            'name': item.name,
            'unit': item.unit,
            'on_hand': item.stock.quantity_on_hand if item.stock else 0,
            # When the department has caps removed, report unlimited (stock-only).
            'per_checkout_cap': None if caps_off else ci.effective_per_checkout_cap(),
            'monthly_cap': None if caps_off else ci.effective_monthly_cap(),
            'weekly_cap': None if caps_off else ci.effective_weekly_cap(),
            'caps_disabled': caps_off,
        }
        if teacher:
            remaining = get_remaining(teacher.id, cluster_id, item.id)
            d.update({
                'monthly_used': remaining['monthly_used'],
                'monthly_remaining': remaining['monthly_remaining'],
            })
        result.append(d)

    result.sort(key=lambda x: x['name'])
    return jsonify(result)


@teacher_bp.patch('/clusters/<int:cluster_id>')
@login_required
def patch_cluster(cluster_id):
    cluster = Cluster.query.get_or_404(cluster_id)
    data = request.get_json(force=True)
    if 'caps_disabled' in data:
        cluster.caps_disabled = bool(data['caps_disabled'])
    db.session.commit()
    return jsonify(cluster.to_dict())
