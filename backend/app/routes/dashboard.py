import datetime as dt

from flask import Blueprint, jsonify
from flask_login import login_required
from sqlalchemy import func

from app import db
from app.models import Cluster, Item, Notification, Request, RequestItem, Stock, Teacher

bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


def _month_start(d=None):
    d = d or dt.date.today()
    return dt.datetime(d.year, d.month, 1)


@bp.get("")
@login_required
def dashboard():
    today = dt.date.today()
    mstart = _month_start(today)

    pending_count = Request.query.filter_by(status="pending").count()
    month_fulfilled = Request.query.filter(Request.status == "fulfilled", Request.fulfilled_at >= mstart).count()

    # True count separately — the list is display-limited (audit bug #3:
    # the stat card used to print the capped list length as the total).
    low_stock_count = (
        db.session.query(func.count(Stock.id))
        .select_from(Stock)
        .join(Item, Item.id == Stock.item_id)
        .filter(Stock.quantity_on_hand <= Item.low_stock_threshold)
        .scalar()
    )
    low = (
        db.session.query(Stock, Item)
        .join(Item, Item.id == Stock.item_id)
        .filter(Stock.quantity_on_hand <= Item.low_stock_threshold)
        .order_by(Stock.quantity_on_hand.asc())
        .limit(10)
        .all()
    )

    spend = (
        db.session.query(
            func.date(Request.fulfilled_at).label("day"), func.sum(RequestItem.qty * RequestItem.unit_rate)
        )
        .join(RequestItem, RequestItem.request_id == Request.id)
        .filter(Request.status == "fulfilled", Request.fulfilled_at >= mstart)
        .group_by(func.date(Request.fulfilled_at))
        .order_by(func.date(Request.fulfilled_at))
        .all()
    )

    top = (
        db.session.query(Item.name, func.sum(RequestItem.qty).label("qty"), func.sum(RequestItem.qty * RequestItem.unit_rate).label("amount"))
        .join(RequestItem, RequestItem.item_id == Item.id)
        .join(Request, Request.id == RequestItem.request_id)
        .filter(Request.status == "fulfilled", Request.fulfilled_at >= mstart)
        .group_by(Item.id, Item.name)
        .order_by(func.sum(RequestItem.qty * RequestItem.unit_rate).desc())
        .limit(8)
        .all()
    )

    cluster_spend = (
        db.session.query(Cluster.name, func.sum(RequestItem.qty * RequestItem.unit_rate).label("amount"))
        .select_from(Request)
        .join(Teacher, Teacher.id == Request.teacher_id)
        .join(Cluster, Cluster.id == Teacher.cluster_id)
        .join(RequestItem, RequestItem.request_id == Request.id)
        .filter(Request.status == "fulfilled", Request.fulfilled_at >= mstart)
        .group_by(Cluster.name)
        .order_by(func.sum(RequestItem.qty * RequestItem.unit_rate).desc())
        .limit(10)
        .all()
    )

    unread = Notification.query.filter_by(read=False).count()

    return jsonify(
        {
            "pending_count": pending_count,
            "month_fulfilled": month_fulfilled,
            "month_spend": round(sum(r[1] or 0 for r in spend), 2),
            "low_stock_count": low_stock_count,
            "low_stock": [
                {"item": i.name, "unit": i.unit, "qty": s.quantity_on_hand, "threshold": i.low_stock_threshold}
                for s, i in low
            ],
            "trend": [{"date": str(r[0]), "spend": round(r[1] or 0, 2)} for r in spend],
            "top_items": [
                {"name": r[0], "qty": int(r[1] or 0), "amount": round(r[2] or 0, 2)} for r in top
            ],
            "cluster_spend": [{"cluster": r[0], "amount": round(r[1] or 0, 2)} for r in cluster_spend],
            "unread_notifications": unread,
            "notifications": [n.to_dict() for n in Notification.query.order_by(Notification.created_at.desc()).limit(15)],
        }
    )


@bp.get("/notifications/unread")
@login_required
def unread():
    """P2: lightweight count for the nav bell (full dashboard payload is heavier)."""
    n = Notification.query.filter_by(read=False).count()
    return jsonify({"unread": n})


@bp.post("/notifications/read-all")
@login_required
def read_all():
    n = Notification.query.filter_by(read=False).all()
    for x in n:
        x.read = True
    from app import db as _db
    _db.session.commit()
    return jsonify({"ok": True, "count": len(n)})