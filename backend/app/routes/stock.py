from flask import Blueprint, request, jsonify, send_file
from flask_login import login_required, current_user
from datetime import datetime, timezone, date
import io
from ..models import StationaryItem, Stock, StockIn, StockInBatch, ItemAlias
from ..services.stock_service import add_stock
from .. import db

stock_bp = Blueprint('stock', __name__)


@stock_bp.get('/stock')
@login_required
def list_stock():
    items = StationaryItem.query.order_by(StationaryItem.name).all()
    result = []
    for item in items:
        on_hand = item.stock.quantity_on_hand if item.stock else 0
        status = 'ok'
        if on_hand == 0:
            status = 'out'
        elif on_hand <= item.low_stock_threshold:
            status = 'low'
        result.append({
            **item.to_dict(),
            'on_hand': on_hand,
            'status': status,
        })
    return jsonify(result)


@stock_bp.post('/stock-in')
@login_required
def manual_stock_in():
    data = request.get_json(force=True)
    lines = data.get('lines', [])
    vendor = data.get('vendor_name') or data.get('vendor', '')
    invoice_ref = data.get('invoice_ref', '')
    notes = data.get('notes', '')

    if not lines:
        return jsonify({'error': 'No items provided'}), 400

    batch = StockInBatch(
        uploaded_by=current_user.id,
        vendor_name=vendor,
        invoice_ref=invoice_ref,
        source='manual',
        confirmed_at=datetime.now(timezone.utc),
    )
    db.session.add(batch)
    db.session.flush()

    today = date.today()
    for entry in lines:
        item_id = entry.get('item_id')
        qty = int(entry.get('quantity_received') or entry.get('qty', 0))
        rate = float(entry.get('rate_per_unit') or entry.get('rate', 0))
        received_date_str = entry.get('received_date') or entry.get('date') or data.get('received_date')
        try:
            received_date = datetime.fromisoformat(str(received_date_str)).date() if received_date_str else today
        except (ValueError, TypeError):
            received_date = today

        if not item_id or qty <= 0:
            continue

        si = StockIn(
            batch_id=batch.id,
            item_id=item_id,
            quantity_received=qty,
            rate_per_unit=rate,
            received_date=received_date,
            notes=notes,
        )
        db.session.add(si)

    db.session.commit()
    add_stock(batch.id)
    return jsonify({'ok': True, 'batch_id': batch.id}), 201


@stock_bp.post('/stock-in/parse-excel')
@login_required
def parse_excel():
    from ..services.excel_parser import parse_excel as _parse
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    f = request.files['file']
    try:
        rows = _parse(f, f.filename)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    return jsonify({'rows': rows, 'filename': f.filename})


@stock_bp.post('/stock-in/confirm')
@login_required
def confirm_excel():
    data = request.get_json(force=True)
    rows = data.get('rows', [])
    vendor = data.get('vendor', '')
    invoice_ref = data.get('invoice_ref', '')
    filename = data.get('filename', '')

    batch = StockInBatch(
        uploaded_by=current_user.id,
        vendor_name=vendor,
        invoice_ref=invoice_ref,
        source='excel_upload',
        original_filename=filename,
        confirmed_at=datetime.now(timezone.utc),
    )
    db.session.add(batch)
    db.session.flush()

    today = date.today()
    for row in rows:
        item_id = row.get('item_id') or row.get('matched_item_id')
        if not item_id:
            continue
        qty = int(row.get('quantity_received') or row.get('qty', 0))
        rate = float(row.get('rate_per_unit') or row.get('rate', 0))
        vendor_name = row.get('vendor_name', '')

        # Learn alias mapping
        if vendor_name:
            existing = ItemAlias.query.filter_by(item_id=item_id, alias=vendor_name).first()
            if not existing:
                db.session.add(ItemAlias(item_id=item_id, alias=vendor_name))

        si = StockIn(
            batch_id=batch.id,
            item_id=item_id,
            quantity_received=qty,
            rate_per_unit=rate,
            received_date=today,
        )
        db.session.add(si)

    db.session.commit()
    add_stock(batch.id)
    return jsonify({'ok': True, 'batch_id': batch.id}), 201
