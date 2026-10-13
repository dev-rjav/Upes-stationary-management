from datetime import datetime, timezone, timedelta
from sqlalchemy import extract, func
from .. import db


def get_monthly_usage(teacher_id, item_id, year=None, month=None,
                      include_pending=True, exclude_request_id=None):
    """Units counting against a teacher's monthly cap for an item.

    Fulfilled requests count their fulfilled qty (actual consumption).
    Pending requests *reserve* their requested qty against the cap so a
    teacher cannot stack multiple uncollected orders past the limit. A
    reservation is released automatically once the request leaves 'pending'
    (rejected or auto-expired). Set include_pending=False for consumption-only
    reporting.
    """
    from ..models import Request, RequestLine
    now = datetime.now(timezone.utc)
    y = year or now.year
    m = month or now.month

    # Cap-override requests are exceptions and must NOT count toward cumulative
    # usage (per spec), so they are excluded from both buckets.
    fulfilled_q = (
        db.session.query(func.coalesce(func.sum(RequestLine.quantity_fulfilled), 0))
        .join(Request, RequestLine.request_id == Request.id)
        .filter(
            Request.teacher_id == teacher_id,
            RequestLine.item_id == item_id,
            Request.status == 'fulfilled',
            Request.is_cap_override.is_(False),
            extract('year', Request.fulfilled_at) == y,
            extract('month', Request.fulfilled_at) == m,
        )
    )
    if exclude_request_id is not None:
        fulfilled_q = fulfilled_q.filter(Request.id != exclude_request_id)
    total = int(fulfilled_q.scalar() or 0)

    if include_pending:
        reserved_q = (
            db.session.query(func.coalesce(func.sum(RequestLine.quantity_requested), 0))
            .join(Request, RequestLine.request_id == Request.id)
            .filter(
                Request.teacher_id == teacher_id,
                RequestLine.item_id == item_id,
                Request.status == 'pending',
                Request.is_cap_override.is_(False),
                extract('year', Request.created_at) == y,
                extract('month', Request.created_at) == m,
            )
        )
        if exclude_request_id is not None:
            reserved_q = reserved_q.filter(Request.id != exclude_request_id)
        total += int(reserved_q.scalar() or 0)

    return total


def get_weekly_usage(teacher_id, item_id, include_pending=True, exclude_request_id=None):
    """Units counting against a teacher's weekly cap (see get_monthly_usage)."""
    from ..models import Request, RequestLine
    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=now.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)

    fulfilled_q = (
        db.session.query(func.coalesce(func.sum(RequestLine.quantity_fulfilled), 0))
        .join(Request, RequestLine.request_id == Request.id)
        .filter(
            Request.teacher_id == teacher_id,
            RequestLine.item_id == item_id,
            Request.status == 'fulfilled',
            Request.is_cap_override.is_(False),
            Request.fulfilled_at >= week_start,
        )
    )
    if exclude_request_id is not None:
        fulfilled_q = fulfilled_q.filter(Request.id != exclude_request_id)
    total = int(fulfilled_q.scalar() or 0)

    if include_pending:
        reserved_q = (
            db.session.query(func.coalesce(func.sum(RequestLine.quantity_requested), 0))
            .join(Request, RequestLine.request_id == Request.id)
            .filter(
                Request.teacher_id == teacher_id,
                RequestLine.item_id == item_id,
                Request.status == 'pending',
                Request.is_cap_override.is_(False),
                Request.created_at >= week_start,
            )
        )
        if exclude_request_id is not None:
            reserved_q = reserved_q.filter(Request.id != exclude_request_id)
        total += int(reserved_q.scalar() or 0)

    return total


def check_caps(teacher_id, cluster_id, item_id, qty_requested):
    from ..models import ClusterItem, Cluster
    cluster_item = ClusterItem.query.filter_by(
        cluster_id=cluster_id, item_id=item_id, is_enabled=True
    ).first()
    if not cluster_item:
        return {'allowed': False, 'reason': 'Item not available for your department'}

    # Department-wide cap removal: skip all cap checks, keep visibility + stock rules.
    cluster = Cluster.query.get(cluster_id)
    if cluster and cluster.caps_disabled:
        return {'allowed': True, 'caps_disabled': True}

    per_cap = cluster_item.effective_per_checkout_cap()
    monthly_cap = cluster_item.effective_monthly_cap()
    weekly_cap = cluster_item.effective_weekly_cap()

    if per_cap is not None and qty_requested > per_cap:
        return {'allowed': False, 'reason': f'Per-checkout cap is {per_cap}'}

    if monthly_cap is not None:
        used = get_monthly_usage(teacher_id, item_id)
        if used + qty_requested > monthly_cap:
            return {
                'allowed': False,
                'reason': f'Monthly cap is {monthly_cap}, already used/reserved {used}',
                'monthly_used': used,
                'monthly_cap': monthly_cap,
            }

    if weekly_cap is not None:
        used_w = get_weekly_usage(teacher_id, item_id)
        if used_w + qty_requested > weekly_cap:
            return {'allowed': False, 'reason': f'Weekly cap is {weekly_cap}, already used/reserved {used_w}'}

    return {'allowed': True}


def check_approval_caps(req):
    """Re-validate caps at approval time (server is source of truth).

    The pending request already reserves its qty, so this is normally a no-op.
    It exists to catch the case where a cap was *lowered* after the request was
    placed: approving must not push fulfilled usage past the new cap. The
    request's own reservation is excluded to avoid double counting.
    Returns {'allowed': bool, 'reason': str}.
    """
    from ..models import ClusterItem, Cluster
    teacher = req.teacher
    if not teacher:
        return {'allowed': True}
    cluster_id = teacher.cluster_id

    cluster = Cluster.query.get(cluster_id)
    if cluster and cluster.caps_disabled:
        return {'allowed': True}

    for line in req.lines:
        ci = ClusterItem.query.filter_by(
            cluster_id=cluster_id, item_id=line.item_id, is_enabled=True
        ).first()
        if not ci:
            continue  # item no longer visible for cluster — don't block an existing reservation
        qty = line.quantity_requested

        per_cap = ci.effective_per_checkout_cap()
        if per_cap is not None and qty > per_cap:
            return {'allowed': False, 'reason': f'Per-checkout cap is {per_cap} for item {line.item_id}'}

        monthly_cap = ci.effective_monthly_cap()
        if monthly_cap is not None:
            used = get_monthly_usage(teacher.id, line.item_id, exclude_request_id=req.id)
            if used + qty > monthly_cap:
                return {
                    'allowed': False,
                    'reason': f'Monthly cap {monthly_cap} would be exceeded for item {line.item_id} (used/reserved {used})',
                }

        weekly_cap = ci.effective_weekly_cap()
        if weekly_cap is not None:
            used_w = get_weekly_usage(teacher.id, line.item_id, exclude_request_id=req.id)
            if used_w + qty > weekly_cap:
                return {
                    'allowed': False,
                    'reason': f'Weekly cap {weekly_cap} would be exceeded for item {line.item_id}',
                }

    return {'allowed': True}


def get_remaining(teacher_id, cluster_id, item_id):
    from ..models import ClusterItem, Cluster
    cluster_item = ClusterItem.query.filter_by(
        cluster_id=cluster_id, item_id=item_id, is_enabled=True
    ).first()
    if not cluster_item:
        return {'per_checkout': 0, 'monthly_remaining': 0, 'monthly_used': 0, 'monthly_cap': 0}

    # Department-wide cap removal: everything is unlimited.
    cluster = Cluster.query.get(cluster_id)
    if cluster and cluster.caps_disabled:
        return {
            'per_checkout': None, 'monthly_remaining': None,
            'monthly_used': get_monthly_usage(teacher_id, item_id), 'monthly_cap': None,
            'caps_disabled': True,
        }

    per_cap = cluster_item.effective_per_checkout_cap()
    monthly_cap = cluster_item.effective_monthly_cap()
    # Includes pending reservations so the teacher sees allowance already held by
    # their own uncollected requests.
    monthly_used = get_monthly_usage(teacher_id, item_id) if monthly_cap else 0
    monthly_remaining = (monthly_cap - monthly_used) if monthly_cap is not None else None

    return {
        'per_checkout': per_cap,
        'monthly_remaining': monthly_remaining,
        'monthly_used': monthly_used,
        'monthly_cap': monthly_cap,
    }
