from flask import Blueprint, request, jsonify
from flask_login import login_required
from datetime import datetime, timezone, timedelta
from sqlalchemy import func, extract
from ..models import Request, RequestLine, StationaryItem, Teacher, Cluster, Receptionist, StockIn
from .. import db

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.get('/dashboard')
@login_required
def dashboard():
    now = datetime.now(timezone.utc)
    month = int(request.args.get('month', now.month))
    year = int(request.args.get('year', now.year))
    cluster_filter = request.args.get('cluster')

    base_q = (
        db.session.query(Request, RequestLine, StationaryItem)
        .join(RequestLine, RequestLine.request_id == Request.id)
        .join(StationaryItem, RequestLine.item_id == StationaryItem.id)
        .filter(
            Request.status == 'fulfilled',
            extract('year', Request.fulfilled_at) == year,
            extract('month', Request.fulfilled_at) == month,
        )
    )
    if cluster_filter:
        base_q = (base_q
                  .join(Teacher, Request.teacher_id == Teacher.id)
                  .join(Cluster, Teacher.cluster_id == Cluster.id)
                  .filter(Cluster.name == cluster_filter))

    rows = base_q.all()

    # KPIs
    total_spend = 0.0
    total_units = 0
    item_qty = {}
    item_cost = {}
    cluster_spend = {}

    for req, line, item in rows:
        qty = line.quantity_fulfilled or 0
        last_si = item.stock_ins.order_by(db.text('id desc')).first()
        rate = last_si.rate_per_unit if last_si else 0.0
        cost = qty * rate
        total_spend += cost
        total_units += qty
        item_qty[item.name] = item_qty.get(item.name, 0) + qty
        item_cost[item.name] = item_cost.get(item.name, 0) + cost
        cl = req.teacher.cluster.name if req.teacher and req.teacher.cluster else 'Unknown'
        cluster_spend[cl] = cluster_spend.get(cl, 0) + cost

    # Pre-load last stock-in rate per item (ascending so last write wins)
    last_rates = {}
    for si in StockIn.query.order_by(StockIn.id.asc()).all():
        last_rates[si.item_id] = si.rate_per_unit

    # Monthly trend (last 12 months)
    monthly_trend = []
    for i in range(11, -1, -1):
        d = now - timedelta(days=30 * i)
        month_lines = (
            db.session.query(RequestLine)
            .join(Request, RequestLine.request_id == Request.id)
            .filter(
                Request.status == 'fulfilled',
                extract('year', Request.fulfilled_at) == d.year,
                extract('month', Request.fulfilled_at) == d.month,
            )
            .all()
        )
        qty_sum = sum(ln.quantity_fulfilled or 0 for ln in month_lines)
        spend_sum = sum(
            (ln.quantity_fulfilled or 0) * last_rates.get(ln.item_id, 0.0)
            for ln in month_lines
        )
        monthly_trend.append({
            'month': d.month,
            'year': d.year,
            'total_units': qty_sum,
            'total_spend': round(spend_sum, 2),
        })

    # Top items
    top_qty = sorted(item_qty.items(), key=lambda x: x[1], reverse=True)[:10]
    top_cost = sorted(item_cost.items(), key=lambda x: x[1], reverse=True)[:10]
    top_clusters = sorted(cluster_spend.items(), key=lambda x: x[1], reverse=True)

    # Low stock
    from ..models import Stock
    low_stock = (
        db.session.query(StationaryItem, Stock)
        .join(Stock, Stock.item_id == StationaryItem.id)
        .filter(Stock.quantity_on_hand <= StationaryItem.low_stock_threshold)
        .all()
    )

    # Per-teacher usage
    teacher_usage = (
        db.session.query(
            Teacher,
            func.sum(RequestLine.quantity_fulfilled).label('units'),
        )
        .join(Request, Request.teacher_id == Teacher.id)
        .join(RequestLine, RequestLine.request_id == Request.id)
        .filter(
            Request.status == 'fulfilled',
            extract('year', Request.fulfilled_at) == year,
            extract('month', Request.fulfilled_at) == month,
        )
        .group_by(Teacher.id)
        .order_by(db.text('units desc'))
        .limit(50)
        .all()
    )

    # Account activity (last 30 days)
    thirty_ago = now - timedelta(days=30)
    activity = []
    for rec in Receptionist.query.all():
        approved = Request.query.filter(
            Request.fulfilled_by == rec.id,
            Request.status == 'fulfilled',
            Request.fulfilled_at >= thirty_ago,
        ).count()
        rejected = Request.query.filter(
            Request.fulfilled_by == rec.id,
            Request.status == 'rejected',
            Request.rejected_at >= thirty_ago,
        ).count()
        activity.append({
            'username': rec.username,
            'display_name': rec.display_name,
            'role': rec.role,
            'approved': approved,
            'rejected': rejected,
        })

    return jsonify({
        'total_spend': round(total_spend, 2),
        'total_units': total_units,
        'total_requests': len(set(r.id for r, _, _ in rows)),
        'monthly_trend': monthly_trend,
        'top_qty': [{'name': n, 'total_qty': q} for n, q in top_qty],
        'top_cost': [{'name': n, 'total_cost': round(c, 2)} for n, c in top_cost],
        'cluster_spend': [{'cluster': n, 'total_spend': round(s, 2)} for n, s in top_clusters],
        'low_stock': [
            {
                'id': item.id,
                'name': item.name,
                'quantity_on_hand': stock.quantity_on_hand,
                'low_stock_threshold': item.low_stock_threshold,
                'status': 'out' if stock.quantity_on_hand == 0 else 'low',
            }
            for item, stock in low_stock
        ],
        'teacher_usage': [
            {
                'sap_id': t.sap_id,
                'name': t.name,
                'cluster': t.cluster.name if t.cluster else '',
                'total_units': int(units or 0),
                'total_requests': 1,  # per-teacher request count not separately queried
            }
            for t, units in teacher_usage
        ],
        'activity': activity,
    })


def _department_breakdown(dept_name, month, year):
    """Per-user breakdown within one department for the selected month.

    Returns (users, totals) where users is a list of
    {sap_id, name, total_units, total_spend, items:[{name, qty, rate, total}]}.
    """
    rates = {si.item_id: si.rate_per_unit for si in StockIn.query.order_by(StockIn.id.asc()).all()}

    rows = (
        db.session.query(Teacher, StationaryItem, func.sum(RequestLine.quantity_fulfilled).label('qty'))
        .join(Request, Request.teacher_id == Teacher.id)
        .join(RequestLine, RequestLine.request_id == Request.id)
        .join(StationaryItem, RequestLine.item_id == StationaryItem.id)
        .join(Cluster, Teacher.cluster_id == Cluster.id)
        .filter(
            Request.status == 'fulfilled',
            Cluster.name == dept_name,
            extract('year', Request.fulfilled_at) == year,
            extract('month', Request.fulfilled_at) == month,
        )
        .group_by(Teacher.id, StationaryItem.id)
        .all()
    )

    users = {}
    for teacher, item, qty in rows:
        qty = int(qty or 0)
        rate = rates.get(item.id, 0.0)
        total = qty * rate
        u = users.setdefault(teacher.sap_id, {
            'sap_id': teacher.sap_id, 'name': teacher.name,
            'total_units': 0, 'total_spend': 0.0, 'items': [],
        })
        u['total_units'] += qty
        u['total_spend'] += total
        u['items'].append({'name': item.name, 'qty': qty, 'rate': round(rate, 2), 'total': round(total, 2)})

    user_list = sorted(users.values(), key=lambda x: x['total_spend'], reverse=True)
    for u in user_list:
        u['total_spend'] = round(u['total_spend'], 2)
        u['items'].sort(key=lambda x: x['total'], reverse=True)

    totals = {
        'total_units': sum(u['total_units'] for u in user_list),
        'total_spend': round(sum(u['total_spend'] for u in user_list), 2),
        'users': len(user_list),
    }
    return user_list, totals


@dashboard_bp.get('/dashboard/department')
@login_required
def department_breakdown():
    now = datetime.now(timezone.utc)
    dept = request.args.get('cluster')
    if not dept:
        return jsonify({'error': 'department required'}), 400
    month = int(request.args.get('month', now.month))
    year = int(request.args.get('year', now.year))
    users, totals = _department_breakdown(dept, month, year)
    return jsonify({'department': dept, 'month': month, 'year': year, 'users': users, 'totals': totals})


@dashboard_bp.get('/dashboard/department/download')
@login_required
def department_breakdown_download():
    import csv
    import io
    from flask import make_response
    now = datetime.now(timezone.utc)
    dept = request.args.get('cluster')
    if not dept:
        return jsonify({'error': 'department required'}), 400
    month = int(request.args.get('month', now.month))
    year = int(request.args.get('year', now.year))
    users, totals = _department_breakdown(dept, month, year)

    output = io.StringIO()
    writer = csv.writer(output)
    # Rupee sign on price column headers only.
    writer.writerow([f'Department: {dept}', f'{month:02d}/{year}'])
    writer.writerow([])
    writer.writerow(['User', 'SAP ID', 'Item', 'Qty', 'Rate (₹)', 'Total (₹)'])
    for u in users:
        for it in u['items']:
            writer.writerow([u['name'], u['sap_id'], it['name'], it['qty'], f"{it['rate']:.2f}", f"{it['total']:.2f}"])
        writer.writerow([f"{u['name']} — subtotal", u['sap_id'], '', u['total_units'], '', f"{u['total_spend']:.2f}"])
        writer.writerow([])
    writer.writerow(['DEPARTMENT TOTAL', '', '', totals['total_units'], '', f"{totals['total_spend']:.2f}"])

    response = make_response(output.getvalue().encode('utf-8'))
    response.headers['Content-Type'] = 'text/csv; charset=utf-8'
    safe = ''.join(ch if ch.isalnum() else '_' for ch in dept)
    response.headers['Content-Disposition'] = f'attachment; filename=department_{safe}_{year}_{month:02d}.csv'
    return response
