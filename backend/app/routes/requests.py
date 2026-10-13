from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from datetime import datetime, timezone
from ..models import Request, RequestLine, Teacher, Cluster, Stock
from ..services.cap_service import check_caps, check_approval_caps
from ..services.stock_service import deduct_stock, check_stock_available
from ..utils.validators import is_valid_sap_id, SAP_ID_RULE
from .. import db
import random
import string

requests_bp = Blueprint('requests', __name__)


def _gen_ref():
    suffix = ''.join(random.choices(string.digits, k=4))
    return f'R-{suffix}'


def _unique_ref():
    for _ in range(20):
        ref = _gen_ref()
        if not Request.query.filter_by(ref_number=ref).first():
            return ref
    return f'R-{datetime.now(timezone.utc).strftime("%H%M%S%f")[:10]}'


def _valid_item_lines(items):
    """Every line must carry an item_id and a positive integer quantity."""
    for entry in items:
        if not isinstance(entry, dict):
            return False
        if entry.get('item_id') in (None, ''):
            return False
        try:
            if int(entry.get('qty')) < 1:
                return False
        except (TypeError, ValueError):
            return False
    return True


@requests_bp.post('/requests')
def create_request():
    data = request.get_json(force=True)
    sap_id = (data.get('sap_id') or '').strip()
    name = (data.get('name') or '').strip()
    cluster_name = (data.get('cluster') or '').strip()
    items = data.get('items', [])  # [{item_id, qty}]

    if not sap_id:
        return jsonify({'error': 'SAP ID required'}), 400
    if not is_valid_sap_id(sap_id):
        return jsonify({'error': SAP_ID_RULE}), 400
    if not items:
        return jsonify({'error': 'No items selected'}), 400
    if not _valid_item_lines(items):
        return jsonify({'error': 'Each item needs a valid id and a quantity of at least 1'}), 400

    cluster = Cluster.query.filter_by(name=cluster_name).first()
    if not cluster:
        return jsonify({'error': 'Invalid department'}), 400

    teacher = Teacher.query.filter_by(sap_id=sap_id).first()
    if not teacher:
        if not name:
            return jsonify({'error': 'Name required for new user'}), 400
        teacher = Teacher(sap_id=sap_id, name=name, cluster_id=cluster.id)
        db.session.add(teacher)
        db.session.flush()

    # Cap checks (teacher flow — enforce caps)
    for entry in items:
        result = check_caps(teacher.id, teacher.cluster_id, entry['item_id'], entry['qty'])
        if not result['allowed']:
            return jsonify({'error': f"Cap exceeded for item {entry['item_id']}: {result['reason']}"}), 400

    req = Request(
        ref_number=_unique_ref(),
        teacher_id=teacher.id,
        status='pending',
        is_manual=False,
        is_cap_override=False,
    )
    db.session.add(req)
    db.session.flush()

    for entry in items:
        line = RequestLine(
            request_id=req.id,
            item_id=entry['item_id'],
            quantity_requested=entry['qty'],
        )
        db.session.add(line)

    db.session.commit()
    return jsonify({'ref_number': req.ref_number, 'id': req.id}), 201


@requests_bp.get('/requests')
@login_required
def list_requests():
    status = request.args.get('status')
    cluster = request.args.get('cluster')
    q = request.args.get('q', '')
    date_from = request.args.get('from')
    date_to = request.args.get('to')
    actioned_by = request.args.get('actioned_by')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 50))

    query = Request.query.join(Teacher, Request.teacher_id == Teacher.id)

    if status and status != 'All':
        query = query.filter(Request.status == status.lower())

    if cluster:
        try:
            cluster_id = int(cluster)
            query = query.filter(Teacher.cluster_id == cluster_id)
        except (ValueError, TypeError):
            query = query.join(Cluster, Teacher.cluster_id == Cluster.id).filter(Cluster.name == cluster)

    if q:
        query = query.filter(
            db.or_(
                Teacher.name.ilike(f'%{q}%'),
                Teacher.sap_id.ilike(f'%{q}%'),
            )
        )

    if date_from:
        try:
            query = query.filter(Request.created_at >= datetime.fromisoformat(date_from))
        except ValueError:
            pass

    if date_to:
        try:
            query = query.filter(Request.created_at <= datetime.fromisoformat(date_to))
        except ValueError:
            pass

    if actioned_by and actioned_by != 'Anyone':
        from ..models import Receptionist
        rec = db.session.query(Receptionist).filter_by(role=actioned_by).first()
        if rec:
            query = query.filter(Request.fulfilled_by == rec.id)

    total = query.count()
    reqs = query.order_by(Request.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        'requests': [r.to_dict() for r in reqs],
        'total': total,
        'page': page,
        'per_page': per_page,
    })


@requests_bp.patch('/requests/<int:req_id>/approve')
@login_required
def approve(req_id):
    req = Request.query.get_or_404(req_id)
    if req.status != 'pending':
        return jsonify({'error': 'Only pending requests can be approved'}), 400

    # Source-of-truth cap re-check (skipped for logged cap-overrides).
    if not req.is_cap_override:
        result = check_approval_caps(req)
        if not result['allowed']:
            return jsonify({'error': f"Cap exceeded: {result['reason']}"}), 400

    # Stock is not reserved on pending, so two requests can race for the last
    # unit. Refuse to approve the one that would oversell.
    shortfalls = check_stock_available(req)
    if shortfalls:
        detail = '; '.join(f'{name} (have {have}, need {need})' for name, have, need in shortfalls)
        return jsonify({'error': f'Insufficient stock: {detail}'}), 409

    req.status = 'fulfilled'
    req.fulfilled_at = datetime.now(timezone.utc)
    req.fulfilled_by = current_user.id
    db.session.commit()

    deduct_stock(req_id)
    return jsonify(req.to_dict())


@requests_bp.patch('/requests/<int:req_id>/reject')
@login_required
def reject(req_id):
    data = request.get_json(force=True) or {}
    req = Request.query.get_or_404(req_id)
    if req.status != 'pending':
        return jsonify({'error': 'Only pending requests can be rejected'}), 400

    req.status = 'rejected'
    req.rejected_at = datetime.now(timezone.utc)
    req.rejection_reason = data.get('reason', '')
    req.fulfilled_by = current_user.id
    db.session.commit()
    return jsonify(req.to_dict())


@requests_bp.post('/requests/manual')
@login_required
def create_manual():
    data = request.get_json(force=True)
    sap_id = (data.get('sap_id') or '').strip()
    name = (data.get('name') or '').strip()
    cluster_name = (data.get('cluster') or '').strip()
    items = data.get('items', [])
    is_cap_override = bool(data.get('cap_override', False))
    override_reason = (data.get('override_reason') or '').strip()
    approve_now = bool(data.get('approve_now', False))

    if not sap_id:
        return jsonify({'error': 'SAP ID required'}), 400
    if not is_valid_sap_id(sap_id):
        return jsonify({'error': SAP_ID_RULE}), 400
    if not items:
        return jsonify({'error': 'No items selected'}), 400
    if not _valid_item_lines(items):
        return jsonify({'error': 'Each item needs a valid id and a quantity of at least 1'}), 400
    if is_cap_override and not override_reason:
        return jsonify({'error': 'Override reason required'}), 400

    cluster = Cluster.query.filter_by(name=cluster_name).first()
    if not cluster:
        return jsonify({'error': 'Invalid department'}), 400

    teacher = Teacher.query.filter_by(sap_id=sap_id).first()
    if not teacher:
        if not name:
            return jsonify({'error': 'Name required for new user'}), 400
        teacher = Teacher(sap_id=sap_id, name=name, cluster_id=cluster.id)
        db.session.add(teacher)
        db.session.flush()

    if not is_cap_override:
        for entry in items:
            result = check_caps(teacher.id, teacher.cluster_id, entry['item_id'], entry['qty'])
            if not result['allowed']:
                return jsonify({'error': f"Cap exceeded: {result['reason']}"}), 400

    status = 'fulfilled' if approve_now else 'pending'
    req = Request(
        ref_number=_unique_ref(),
        teacher_id=teacher.id,
        status=status,
        is_manual=True,
        is_cap_override=is_cap_override,
        override_reason=override_reason if is_cap_override else None,
        created_by=current_user.id,
        fulfilled_by=current_user.id if approve_now else None,
        fulfilled_at=datetime.now(timezone.utc) if approve_now else None,
    )
    db.session.add(req)
    db.session.flush()

    for entry in items:
        line = RequestLine(
            request_id=req.id,
            item_id=entry['item_id'],
            quantity_requested=entry['qty'],
        )
        db.session.add(line)

    db.session.commit()

    if approve_now:
        deduct_stock(req.id)

    return jsonify(req.to_dict()), 201
