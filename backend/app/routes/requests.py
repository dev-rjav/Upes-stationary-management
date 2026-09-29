import datetime as dt

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app import db
from app.models import Item, Request, RequestItem, Teacher
from app.services import cap_service, stock_service
from app.utils import notifications

bp = Blueprint("requests", __name__, url_prefix="/api/requests")


def _make_request(teacher_id, items, status="pending", is_override=False, override_reason="", created_by="teacher", fulfilled_at=None, unit_rates=None):
    req = Request(teacher_id=teacher_id, status=status, is_override=is_override, override_reason=override_reason, created_by=created_by)
    if fulfilled_at:
        req.fulfilled_at = fulfilled_at
    for item_id, qty in items:
        unit_rate = (unit_rates or {}).get(item_id, 0)
        req.items.append(RequestItem(item_id=item_id, qty=qty, unit_rate=unit_rate))
    db.session.add(req)
    return req


@bp.post("")
def create():
    """Teacher submission. D8: server-side cap check. D10: no stock move yet."""
    d = request.get_json(silent=True) or {}
    t = Teacher.query.get(d.get("teacher_id") or 0)
    if not t:
        return jsonify({"error": "unknown teacher_id"}), 404
    items = []
    for it in d.get("items") or []:
        try:
            item_id, qty = int(it["item_id"]), int(it["qty"])
        except (KeyError, TypeError, ValueError):
            return jsonify({"error": "items must be [{item_id, qty}]"}), 400
        if qty <= 0:
            return jsonify({"error": "qty must be positive"}), 400
        items.append((item_id, qty))
    if not items:
        return jsonify({"error": "no items"}), 400
    ok, errors, info = cap_service.check_request(t.id, items)
    if not ok:
        return jsonify({"error": "cap exceeded", "details": errors, "caps": {str(k): v for k, v in info.items()}}), 422
    req = _make_request(t.id, items)
    db.session.commit()
    return jsonify({"request": req.to_dict()}), 201


@bp.post("/manual")
@login_required
def create_manual():
    """D12: receptionist-created request (used for cap overrides and direct issues)."""
    d = request.get_json(silent=True) or {}
    is_override = bool(d.get("is_override"))
    if is_override and not (d.get("override_reason") or "").strip():
        return jsonify({"error": "override requires a reason"}), 400
    t = Teacher.query.get(d.get("teacher_id") or 0)
    if not t:
        return jsonify({"error": "unknown teacher_id"}), 404
    items = []
    for it in d.get("items") or []:
        item_id, qty = int(it["item_id"]), int(it["qty"])
        if qty <= 0:
            return jsonify({"error": "qty must be positive"}), 400
        items.append((item_id, qty))
    if not items:
        return jsonify({"error": "no items"}), 400
    if not is_override:
        ok, errors, _ = cap_service.check_request(t.id, items)
        if not ok:
            return jsonify({"error": "cap exceeded", "details": errors}), 422
    req = _make_request(t.id, items, is_override=is_override, override_reason=d.get("override_reason", ""), created_by=current_user.name)
    db.session.commit()
    if is_override:
        notifications.notify_event("override", f"Cap override for {t.name}: " + (d.get("override_reason") or "").strip())
    return jsonify({"request": req.to_dict()}), 201


@bp.post("/migrate")
@login_required
def migrate():
    """D23: import historical issuance rows as FULFILLED requests (date-ranged)."""
    d = request.get_json(silent=True) or {}
    rows = d.get("rows") or []
    name_to_teacher = {}
    for r in rows:
        name = (r.get("user") or "").strip()
        item_name = (r.get("item") or "").strip()
        date = r.get("date")
        qty = int(r.get("qty") or 0)
        if not name or not item_name or qty <= 0 or not date:
            continue
        try:
            day = dt.date.fromisoformat(str(date)[:10])
        except ValueError:
            continue
        # resolve or create teacher (legacy: SAP unknown)
        key = name.lower()
        if key not in name_to_teacher:
            t = Teacher.query.filter(db.func.lower(Teacher.name) == key, Teacher.is_legacy.is_(True)).first()
            if not t:
                cluster_name = (r.get("dept") or "").strip()
                c = db.session.execute(db.text("select id from clusters order by length(name) asc limit 1")).first()
                cluster_id = c[0] if c else None
                if cluster_id:
                    t = Teacher(sap_id=f"LEGACY-{abs(hash(key)) % 10**6:06d}", name=name, cluster_id=cluster_id, is_legacy=True)
                    db.session.add(t)
                    db.session.flush()
            name_to_teacher[key] = t
        # resolve item (alias-aware)
        item = Item.query.filter(db.func.lower(Item.name) == item_name.lower()).first() or Item.find_by_alias(item_name)
        if not item:
            item = Item(name=item_name, unit="EA", rate=0, monthly_cap=None, weekly_cap=None, is_bulk=True, active=True)
            db.session.add(item)
            db.session.flush()
        # merge rows per (teacher, item, date) — handled below via grouping
        d.setdefault("groups", {}).setdefault((name_to_teacher[key].id, item.id, day.isoformat()), []).append(qty)
    created = 0
    for (teacher_id, item_id, day), qtys in d.get("groups", {}).items():
        req = _make_request(teacher_id, [(item_id, sum(qtys))], status="fulfilled", created_by="migration", fulfilled_at=dt.datetime(day.year, day.month, day.day, 12, 0, 0))
        # freeze historical rate
        for ri in req.items:
            ri.unit_rate = ri.item.rate or 0
        db.session.add(req)
        created += 1
    db.session.commit()
    return jsonify({"ok": True, "requests": created})


@bp.get("")
@login_required
def list_requests():
    status = request.args.get("status")
    q = request.args.get("q", "").strip().lower()
    page = int(request.args.get("page", 1))
    per = int(request.args.get("per_page", 25))
    query = Request.query.outerjoin(Teacher, Teacher.id == Request.teacher_id)
    if status:
        query = query.filter(Request.status == status)
    if q:
        like = f"%{q}%"
        query = query.filter(db.or_(Teacher.name.ilike(like), Teacher.sap_id.ilike(like)))
    total = query.count()
    rows = query.order_by(Request.created_at.desc()).offset((page - 1) * per).limit(per).all()
    return jsonify({"total": total, "page": page, "per_page": per, "requests": [r.to_dict() for r in rows]})


@bp.post("/<int:req_id>/fulfill")
@login_required
def fulfill(req_id):
    req = Request.query.get_or_404(req_id)
    if req.status != "pending":
        return jsonify({"error": f"request is {req.status}, not pending"}), 409
    stock_service.deduct_stock(req)
    db.session.commit()
    return jsonify({"request": req.to_dict()})


@bp.post("/<int:req_id>/reject")
@login_required
def reject(req_id):
    req = Request.query.get_or_404(req_id)
    if req.status != "pending":
        return jsonify({"error": f"request is {req.status}, not pending"}), 409
    stock_service.reject(req)
    db.session.commit()
    return jsonify({"request": req.to_dict()})