"""D8/D9/D18: server-side cap enforcement.

Usage counted from FULFILLED requests only (D9). Per-item monthly + weekly caps (D18).
Overrides (D12/D13) never count against the budget.
"""
import datetime as dt

from sqlalchemy import func

from app import db
from app.models import Item, Request, RequestItem

WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _month_start(d=None):
    d = d or dt.date.today()
    return dt.datetime(d.year, d.month, 1)


def _week_start(d=None):
    d = (d or dt.date.today())
    monday = d - dt.timedelta(days=d.weekday())
    return dt.datetime(monday.year, monday.month, monday.day)


def get_usage(teacher_id, item_id, now=None):
    """Return {'monthly': n, 'weekly': n} fulfilled qty for a teacher+item."""
    q = (
        db.session.query(func.coalesce(func.sum(RequestItem.qty), 0))
        .join(Request, RequestItem.request_id == Request.id)
        .filter(RequestItem.item_id == item_id)
        .filter(Request.teacher_id == teacher_id)
        .filter(Request.status == "fulfilled")
        .filter(~Request.is_override)
        .filter(Request.fulfilled_at >= _week_start(now))
        .scalar()
    )
    weekly = int(q or 0)
    q = (
        db.session.query(func.coalesce(func.sum(RequestItem.qty), 0))
        .join(Request, RequestItem.request_id == Request.id)
        .filter(RequestItem.item_id == item_id)
        .filter(Request.teacher_id == teacher_id)
        .filter(Request.status == "fulfilled")
        .filter(~Request.is_override)
        .filter(Request.fulfilled_at >= _month_start(now))
        .scalar()
    )
    monthly = int(q or 0)
    return {"monthly": monthly, "weekly": weekly}


def remaining(teacher_id, item, now=None):
    """Remaining allowance for a non-override request: (monthly_left, weekly_left)."""
    if item.is_bulk:
        return (None, None)  # unlimited
    u = get_usage(teacher_id, item.id, now)
    m = item.monthly_cap - u["monthly"] if item.monthly_cap else None
    w = item.weekly_cap - u["weekly"] if item.weekly_cap else None
    return (m, w)


def check_request(teacher_id, items_qty, now=None):
    """Validate a request against caps. Returns (ok, errors, per-item remaining)."""
    errors = []
    info = {}
    for item_id, qty in items_qty:
        item = Item.query.get(item_id)
        if not item:
            errors.append({"item_id": item_id, "error": "unknown item"})
            continue
        m_left, w_left = remaining(teacher_id, item, now)
        info[item_id] = {"item": item.name, "monthly_used": None, "monthly_cap": item.monthly_cap, "weekly_cap": item.weekly_cap, "monthly_left": m_left, "weekly_left": w_left}
        if item.is_bulk:
            continue
        u = get_usage(teacher_id, item.id, now)
        if item.monthly_cap is not None and qty > (item.monthly_cap - u["monthly"]):
            errors.append({"item_id": item.id, "item": item.name, "error": f"monthly cap {item.monthly_cap}: already used {u['monthly']}, max {item.monthly_cap - u['monthly']} more this month"})
        if item.weekly_cap is not None and qty > (item.weekly_cap - u["weekly"]):
            errors.append({"item_id": item.id, "item": item.name, "error": f"weekly cap {item.weekly_cap}: already used {u['weekly']}, max {item.weekly_cap - u['weekly']} more this week"})
    return (len(errors) == 0, errors, info)


def caps_summary(teacher_id, now=None):
    """For the checkout page: usage/remaining per capped item."""
    out = []
    for item in Item.query.filter(Item.active.is_(True)).order_by(Item.name).all():
        u = {"monthly": 0, "weekly": 0}
        if not item.is_bulk:
            u = get_usage(teacher_id, item.id, now)
        m_left, w_left = remaining(teacher_id, item, now)
        out.append({
            "item_id": item.id,
            "name": item.name,
            "unit": item.unit,
            "is_bulk": item.is_bulk,
            "monthly_cap": item.monthly_cap,
            "weekly_cap": item.weekly_cap,
            "monthly_used": u["monthly"],
            "weekly_used": u["weekly"],
            "monthly_left": m_left,
            "weekly_left": w_left,
        })
    return out


def week_info(now=None):
    d = now or dt.date.today()
    monday = d - dt.timedelta(days=d.weekday())
    sunday = monday + dt.timedelta(days=6)
    return {
        "month": d.strftime("%B %Y"),
        "week_start": monday.isoformat(),
        "week_end": sunday.isoformat(),
        "weekday": WEEKDAY_NAMES[d.weekday()],
    }