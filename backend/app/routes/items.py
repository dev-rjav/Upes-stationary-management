import datetime as dt

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from sqlalchemy import func

from app import db
from app.models import Cluster, Item, ItemAlias, Request, RequestItem, Stock

bp = Blueprint("items", __name__, url_prefix="/api/items")


@bp.get("/clusters")
def list_clusters():
    """D17: dropdown-only — this is the full allowed set."""
    return jsonify([c.to_dict() for c in Cluster.query.order_by(Cluster.name).all()])


def _item_dict(it):
    s = Stock.query.get(it.id)
    d = it.to_dict()
    d["stock"] = s.quantity_on_hand if s else 0
    d["is_low"] = bool(s and it.low_stock_threshold is not None and s.quantity_on_hand <= it.low_stock_threshold)
    d["aliases"] = [a.alias for a in it.aliases]
    return d


@bp.get("")
def list_items():
    """Public — the teacher kiosk has no login (D4). Mutations stay protected.

    ?top=N returns the N most-issued items this month (kiosk default view —
    old faculty see pens and files first, not 400 chemistry reagents)."""
    q = request.args.get("q", "").strip().lower()
    top = request.args.get("top", type=int)
    if top:
        mstart = dt.datetime(dt.date.today().year, dt.date.today().month, 1)
        ranked = (
            db.session.query(RequestItem.item_id, func.sum(RequestItem.qty).label("qty"))
            .join(Request, Request.id == RequestItem.request_id)
            .filter(Request.status == "fulfilled", Request.fulfilled_at >= mstart)
            .group_by(RequestItem.item_id)
            .order_by(func.sum(RequestItem.qty).desc())
            .limit(top * 2)
            .all()
        )
        items = []
        for r in ranked:
            it = Item.query.get(r[0])
            if it and it.active and it not in items:
                items.append(it)
            if len(items) >= top:
                break
        if len(items) < top:  # pad with alphabetically-first active items
            for it in Item.query.filter_by(active=True).order_by(Item.name):
                if it not in items:
                    items.append(it)
                if len(items) >= top:
                    break
        return jsonify([_item_dict(i) for i in items])
    items = Item.query.filter_by(active=True).order_by(Item.name).all()
    if q:
        items = [i for i in items if q in i.name.lower() or any(q in a.lower() for a in i.all_names()[1:])]
    return jsonify([_item_dict(i) for i in items])


@bp.post("")
@login_required
def create_item():
    d = request.get_json(silent=True) or {}
    if not d.get("name", "").strip():
        return jsonify({"error": "name required"}), 400
    if Item.query.filter(func_like_name(d["name"].strip())).first():
        return jsonify({"error": "item with this name exists"}), 409
    it = Item(
        name=d["name"].strip(),
        hsn_code=d.get("hsn_code", ""),
        unit=d.get("unit", "EA"),
        rate=float(d.get("rate", 0) or 0),
        low_stock_threshold=int(d.get("low_stock_threshold", 10)),
        monthly_cap=d.get("monthly_cap"),
        weekly_cap=d.get("weekly_cap"),
        is_bulk=bool(d.get("is_bulk", False)),
    )
    db.session.add(it)
    db.session.commit()
    return jsonify(_item_dict(it)), 201


def func_like_name(name):
    from sqlalchemy import func as _f
    return _f.lower(Item.name) == name.lower()


@bp.patch("/<int:item_id>")
@login_required
def update_item(item_id):
    it = Item.query.get_or_404(item_id)
    d = request.get_json(silent=True) or {}
    for f in ("name", "hsn_code", "unit", "rate", "low_stock_threshold", "monthly_cap", "weekly_cap", "active", "is_bulk"):
        if f in d:
            setattr(it, f, d[f])
    if "aliases" in d:
        existing = {a.alias.lower(): a for a in it.aliases}
        for alias in d["aliases"]:
            alias = alias.strip()
            if not alias:
                continue
            if alias.lower() in existing:
                existing[alias.lower()].item_id = it.id
            else:
                db.session.add(ItemAlias(item_id=it.id, alias=alias, source="manual"))
        for k, a in list(existing.items()):
            if k not in {x.strip().lower() for x in d["aliases"]}:
                db.session.delete(a)
    db.session.commit()
    return jsonify(_item_dict(it))


@bp.delete("/<int:item_id>")
@login_required
def deactivate(item_id):
    it = Item.query.get_or_404(item_id)
    it.active = False
    db.session.commit()
    return jsonify({"ok": True})


@bp.get("/aliases")
@login_required
def list_aliases():
    rows = (
        db.session.query(ItemAlias.alias, Item.name, ItemAlias.source)
        .join(Item, Item.id == ItemAlias.item_id)
        .order_by(Item.name)
        .all()
    )
    return jsonify([{"alias": a, "item": i, "source": s} for a, i, s in rows])


@bp.post("/aliases")
@login_required
def add_alias():
    """D14: alias learning — map a vendor/free-text name to a canonical item."""
    d = request.get_json(silent=True) or {}
    alias = (d.get("alias") or "").strip()
    item = Item.query.get(d.get("item_id") or 0)
    if not alias or not item:
        return jsonify({"error": "alias and item_id required"}), 400
    existing = ItemAlias.query.filter_by(alias=alias).first()
    if existing:
        existing.item_id = item.id
    else:
        db.session.add(ItemAlias(alias=alias, item_id=item.id, source=d.get("source", "learned")))
    db.session.commit()
    return jsonify({"ok": True})