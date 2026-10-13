from flask import Blueprint, request, jsonify
from flask_login import login_required
from ..models import StationaryItem, ItemAlias, ClusterItem, Cluster, Stock
from .. import db

items_bp = Blueprint('items', __name__)


@items_bp.get('/items')
@login_required
def list_items():
    items = StationaryItem.query.order_by(StationaryItem.name).all()
    return jsonify([i.to_dict() for i in items])


@items_bp.post('/items')
@login_required
def create_item():
    data = request.get_json(force=True)
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'Name required'}), 400
    if StationaryItem.query.filter_by(name=name).first():
        return jsonify({'error': 'Item already exists'}), 409

    item = StationaryItem(
        name=name,
        unit=data.get('unit', 'EA'),
        hsn_code=data.get('hsn_code'),
        default_rate=data.get('default_rate') or None,
        low_stock_threshold=int(data.get('low_stock_threshold', 10)),
        per_checkout_cap=data.get('per_checkout_cap') or None,
        monthly_cap=data.get('monthly_cap') or None,
        weekly_cap=data.get('weekly_cap') or None,
    )
    db.session.add(item)
    db.session.flush()
    db.session.add(Stock(item_id=item.id, quantity_on_hand=0))
    db.session.commit()
    return jsonify(item.to_dict()), 201


@items_bp.patch('/items/<int:item_id>')
@login_required
def update_item(item_id):
    item = StationaryItem.query.get_or_404(item_id)
    data = request.get_json(force=True)

    for field in ('name', 'unit', 'hsn_code'):
        if field in data:
            setattr(item, field, data[field])

    if 'default_rate' in data:
        item.default_rate = float(data['default_rate']) if data['default_rate'] not in (None, '') else None

    for cap_field in ('low_stock_threshold', 'per_checkout_cap', 'monthly_cap', 'weekly_cap'):
        if cap_field in data:
            val = data[cap_field]
            setattr(item, cap_field, int(val) if val not in (None, '') else None)

    db.session.commit()
    return jsonify(item.to_dict())


@items_bp.get('/items/<int:item_id>/aliases')
@login_required
def list_aliases(item_id):
    aliases = ItemAlias.query.filter_by(item_id=item_id).all()
    return jsonify([a.to_dict() for a in aliases])


@items_bp.post('/items/<int:item_id>/aliases')
@login_required
def add_alias(item_id):
    StationaryItem.query.get_or_404(item_id)
    data = request.get_json(force=True)
    alias_str = (data.get('alias') or '').strip()
    if not alias_str:
        return jsonify({'error': 'Alias required'}), 400
    if ItemAlias.query.filter_by(item_id=item_id, alias=alias_str).first():
        return jsonify({'error': 'Alias already exists'}), 409
    alias = ItemAlias(item_id=item_id, alias=alias_str)
    db.session.add(alias)
    db.session.commit()
    return jsonify(alias.to_dict()), 201


@items_bp.get('/items/<int:item_id>/all-clusters')
@login_required
def get_item_clusters(item_id):
    StationaryItem.query.get_or_404(item_id)
    all_clusters = Cluster.query.order_by(Cluster.name).all()
    result = []
    for cluster in all_clusters:
        ci = ClusterItem.query.filter_by(cluster_id=cluster.id, item_id=item_id).first()
        result.append({
            'cluster_id': cluster.id,
            'cluster_name': cluster.name,
            'caps_disabled': cluster.caps_disabled,
            'is_enabled': ci.is_enabled if ci else False,
            'per_checkout_cap': ci.per_checkout_cap if ci else None,
            'monthly_cap': ci.monthly_cap if ci else None,
        })
    return jsonify(result)


# Department-level settings

@items_bp.patch('/clusters/<int:cluster_id>')
@login_required
def update_cluster(cluster_id):
    """Update department-level settings (currently: caps_disabled toggle)."""
    cluster = Cluster.query.get_or_404(cluster_id)
    data = request.get_json(force=True)
    if 'caps_disabled' in data:
        cluster.caps_disabled = bool(data['caps_disabled'])
    db.session.commit()
    return jsonify(cluster.to_dict())


# Cluster item visibility

@items_bp.get('/clusters/<int:cluster_id>/all-items')
@login_required
def get_cluster_items(cluster_id):
    Cluster.query.get_or_404(cluster_id)
    all_items = StationaryItem.query.order_by(StationaryItem.name).all()
    result = []
    for item in all_items:
        ci = ClusterItem.query.filter_by(cluster_id=cluster_id, item_id=item.id).first()
        result.append({
            'item_id': item.id,
            'item_name': item.name,
            'unit': item.unit,
            'is_enabled': ci.is_enabled if ci else False,
            'per_checkout_cap': ci.per_checkout_cap if ci else None,
            'monthly_cap': ci.monthly_cap if ci else None,
            'global_per_checkout_cap': item.per_checkout_cap,
            'global_monthly_cap': item.monthly_cap,
        })
    return jsonify(result)


@items_bp.put('/clusters/<int:cluster_id>/items')
@login_required
def set_cluster_items(cluster_id):
    Cluster.query.get_or_404(cluster_id)
    data = request.get_json(force=True)
    items_data = data.get('items', [])

    for entry in items_data:
        item_id = entry['item_id']
        ci = ClusterItem.query.filter_by(cluster_id=cluster_id, item_id=item_id).first()
        if ci:
            ci.is_enabled = entry.get('is_enabled', False)
            ci.per_checkout_cap = entry.get('per_checkout_cap') or None
            ci.monthly_cap = entry.get('monthly_cap') or None
        else:
            ci = ClusterItem(
                cluster_id=cluster_id, item_id=item_id,
                is_enabled=entry.get('is_enabled', False),
                per_checkout_cap=entry.get('per_checkout_cap') or None,
                monthly_cap=entry.get('monthly_cap') or None,
            )
            db.session.add(ci)

    db.session.commit()
    return jsonify({'ok': True})


@items_bp.patch('/clusters/<int:cluster_id>/items/<int:item_id>')
@login_required
def patch_cluster_item(cluster_id, item_id):
    ci = ClusterItem.query.filter_by(cluster_id=cluster_id, item_id=item_id).first()
    if not ci:
        ci = ClusterItem(cluster_id=cluster_id, item_id=item_id, is_enabled=False)
        db.session.add(ci)

    data = request.get_json(force=True)
    if 'is_enabled' in data:
        ci.is_enabled = bool(data['is_enabled'])
    if 'per_checkout_cap' in data:
        ci.per_checkout_cap = data['per_checkout_cap'] or None
    if 'monthly_cap' in data:
        ci.monthly_cap = data['monthly_cap'] or None
    if 'weekly_cap' in data:
        ci.weekly_cap = data['weekly_cap'] or None

    db.session.commit()
    return jsonify(ci.to_dict())
