import csv
import datetime as dt
from io import StringIO

from flask import Blueprint, Response, jsonify, request
from flask_login import login_required
from sqlalchemy import func

from app import db
from app.models import Cluster, Item, Request, RequestItem, Teacher

bp = Blueprint("reports", __name__, url_prefix="/api/reports")

REPORTS = {
    "monthly": "Fulfilled requests in a month (item-level detail, cost per D11 frozen rates)",
    "top_items": "Top items by quantity and spend in a month",
    "cluster": "Spend and volume per cluster in a month",
    "teacher": "Spend per teacher in a month (cap usage context)",
}


def _parse_month(ym=None):
    if not ym:
        d = dt.date.today().replace(day=1)
        return dt.datetime(d.year, d.month, 1)
    try:
        y, m = (int(x) for x in ym.split("-"))
        return dt.datetime(y, m, 1)
    except Exception:
        return dt.datetime(dt.date.today().year, dt.date.today().month, 1)


def _month_end(start):
    if start.month == 12:
        return dt.datetime(start.year + 1, 1, 1)
    return dt.datetime(start.year, start.month + 1, 1)


def _base_query(start, end):
    # Per-line detail: NO aggregates here (a stray SUM without GROUP BY collapses
    # the whole month into one row with the grand total — audit bug #2).
    return (
        db.session.query(Teacher.name.label("teacher"), Teacher.sap_id.label("sap"), Cluster.name.label("cluster"), Item.name.label("item"), Item.unit.label("unit"), RequestItem.qty.label("qty"), RequestItem.unit_rate.label("rate"), (RequestItem.qty * RequestItem.unit_rate).label("amount"), Request.is_override.label("override"), func.date(Request.fulfilled_at).label("day"))
        .join(Request, Request.teacher_id == Teacher.id)
        .join(Cluster, Cluster.id == Teacher.cluster_id)
        .join(RequestItem, RequestItem.request_id == Request.id)
        .join(Item, Item.id == RequestItem.item_id)
        .filter(Request.status == "fulfilled", Request.fulfilled_at >= start, Request.fulfilled_at < end)
    )


@bp.get("")
@login_required
def list_reports():
    return jsonify(REPORTS)


@bp.get("/<kind>")
@login_required
def report_json(kind):
    if kind not in REPORTS:
        return jsonify({"error": "unknown report"}), 404
    start = _parse_month(request.args.get("month"))
    end = _month_end(start)
    if kind == "monthly":
        rows = _base_query(start, end).order_by("day", "teacher").all()
        out = [{"date": str(r.day), "teacher": r.teacher, "sap": r.sap, "cluster": r.cluster, "item": r.item, "unit": r.unit, "qty": r.qty, "rate": r.rate, "amount": round(r.amount or 0, 2), "override": bool(r.override)} for r in rows]
    elif kind == "top_items":
        rows = (
            db.session.query(Item.name, Item.unit, func.sum(RequestItem.qty), func.sum(RequestItem.qty * RequestItem.unit_rate))
            .join(RequestItem, RequestItem.item_id == Item.id)
            .join(Request, Request.id == RequestItem.request_id)
            .filter(Request.status == "fulfilled", Request.fulfilled_at >= start, Request.fulfilled_at < end)
            .group_by(Item.id, Item.name, Item.unit)
            .order_by(func.sum(RequestItem.qty * RequestItem.unit_rate).desc())
            .limit(25)
            .all()
        )
        out = [{"item": r[0], "unit": r[1], "qty": int(r[2] or 0), "amount": round(r[3] or 0, 2)} for r in rows]
    elif kind == "cluster":
        rows = (
            db.session.query(Cluster.name, func.sum(RequestItem.qty), func.sum(RequestItem.qty * RequestItem.unit_rate))
            .select_from(Request)
            .join(Teacher, Teacher.id == Request.teacher_id)
            .join(Cluster, Cluster.id == Teacher.cluster_id)
            .join(RequestItem, RequestItem.request_id == Request.id)
            .filter(Request.status == "fulfilled", Request.fulfilled_at >= start, Request.fulfilled_at < end)
            .group_by(Cluster.name)
            .order_by(func.sum(RequestItem.qty * RequestItem.unit_rate).desc())
            .all()
        )
        out = [{"cluster": r[0], "qty": int(r[1] or 0), "amount": round(r[2] or 0, 2)} for r in rows]
    else:  # teacher
        rows = (
            db.session.query(Teacher.name, Teacher.sap_id, Cluster.name, func.sum(RequestItem.qty), func.sum(RequestItem.qty * RequestItem.unit_rate))
            .join(Cluster, Cluster.id == Teacher.cluster_id)
            .join(Request, Request.teacher_id == Teacher.id)
            .join(RequestItem, RequestItem.request_id == Request.id)
            .filter(Request.status == "fulfilled", Request.fulfilled_at >= start, Request.fulfilled_at < end)
            .group_by(Teacher.name, Teacher.sap_id, Cluster.name)
            .order_by(func.sum(RequestItem.qty * RequestItem.unit_rate).desc())
            .all()
        )
        out = [{"teacher": r[0], "sap": r[1], "cluster": r[2], "qty": int(r[3] or 0), "amount": round(r[4] or 0, 2)} for r in rows]
    return jsonify({"kind": kind, "month": start.strftime("%Y-%m"), "rows": out})


@bp.get("/<kind>/csv")
@login_required
def report_csv(kind):
    """D22: CSV-only downloads."""
    resp = report_json(kind)
    data = resp.get_data(as_text=True)
    import json as _json
    payload = _json.loads(data)
    rows = payload["rows"]
    buf = StringIO()
    if rows:
        w = csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
        w.writeheader()
        for r in rows:
            w.writerow(r)
    fname = f"{kind}_report_{payload['month']}.csv"
    return Response(buf.getvalue(), mimetype="text/csv", headers={"Content-Disposition": f"attachment; filename={fname}"})