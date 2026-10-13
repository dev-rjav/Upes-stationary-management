from flask import Blueprint, request, jsonify, send_file, make_response
from flask_login import login_required
import io
from ..services.report_service import generate_csv, generate_pdf, generate_xlsx

reports_bp = Blueprint('reports', __name__)


@reports_bp.get('/reports/monthly')
@login_required
def monthly_report():
    from datetime import date
    from ..services.report_service import _get_report_rows
    import sqlalchemy

    month = request.args.get('month')
    year = request.args.get('year')
    filters = {
        'sap_id': request.args.get('sap_id'),
        'cluster': request.args.get('cluster'),
        'item_id': request.args.get('item_id'),
        'actioned_by': request.args.get('actioned_by'),
    }
    # Convert month/year shorthand to start/end dates
    if month and year:
        import calendar
        m, y = int(month), int(year)
        filters['start'] = date(y, m, 1).isoformat()
        last_day = calendar.monthrange(y, m)[1]
        filters['end'] = date(y, m, last_day).isoformat() + 'T23:59:59'
    else:
        filters['start'] = request.args.get('start')
        filters['end'] = request.args.get('end')

    rows = _get_report_rows(filters)
    result = []
    for req, line, item in rows:
        last_si = item.stock_ins.order_by(sqlalchemy.text('id desc')).first()
        rate = last_si.rate_per_unit if last_si else 0.0
        result.append({
            'date': req.fulfilled_at.strftime('%Y-%m-%d') if req.fulfilled_at else '',
            'request_ref': req.ref_number,
            'teacher_name': req.teacher.name if req.teacher else '',
            'sap_id': req.teacher.sap_id if req.teacher else '',
            'cluster': req.teacher.cluster.name if req.teacher and req.teacher.cluster else '',
            'item_name': item.name,
            'qty': line.quantity_fulfilled or 0,
            'rate': rate,
            'total_cost': round((line.quantity_fulfilled or 0) * rate, 2),
            'actioned_by': req.fulfiller.display_name if req.fulfiller else '',
        })
    return jsonify({'rows': result})


@reports_bp.get('/reports/download')
@login_required
def download():
    from datetime import date
    import calendar as _cal
    fmt = request.args.get('format', 'csv')
    month = request.args.get('month')
    year = request.args.get('year')
    filters = {
        'sap_id': request.args.get('sap_id'),
        'cluster': request.args.get('cluster'),
        'item_id': request.args.get('item_id'),
        'actioned_by': request.args.get('actioned_by'),
    }
    if month and year:
        m, y = int(month), int(year)
        filters['start'] = date(y, m, 1).isoformat()
        filters['end'] = date(y, m, _cal.monthrange(y, m)[1]).isoformat() + 'T23:59:59'
    else:
        filters['start'] = request.args.get('start')
        filters['end'] = request.args.get('end')
    if fmt == 'pdf':
        data = generate_pdf(filters)
        response = make_response(data)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = 'attachment; filename=stationery_report.pdf'
        return response
    elif fmt in ('xlsx', 'excel'):
        data = generate_xlsx(filters)
        response = make_response(data)
        response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        response.headers['Content-Disposition'] = 'attachment; filename=stationery_report.xlsx'
        return response
    else:
        data = generate_csv(filters)
        response = make_response(data)
        response.headers['Content-Type'] = 'text/csv; charset=utf-8'
        response.headers['Content-Disposition'] = 'attachment; filename=stationery_report.csv'
        return response
