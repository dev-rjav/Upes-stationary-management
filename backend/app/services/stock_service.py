"""D10/D11: stock moves. Deduction happens on approval; rate frozen from the batch."""
import datetime as dt

from app import db
from app.models import Item, Stock, StockIn
from app.utils import notifications


def get_stock(item_id):
    s = Stock.query.get(item_id)
    if s is None:
        s = Stock(item_id=item_id, quantity_on_hand=0)
        db.session.add(s)
        db.session.flush()
    return s


def add_stock(item_id, qty, unit_rate, source="manual", note="", created_by=""):
    item = Item.query.get(item_id)
    s = get_stock(item_id)
    s.quantity_on_hand += qty
    s.last_updated = dt.datetime.utcnow()
    if unit_rate:
        item.rate = unit_rate  # latest known rate for cost reporting
    db.session.add(
        StockIn(item_id=item_id, qty=qty, unit_rate=unit_rate or item.rate or 0, source=source, note=note, created_by=created_by)
    )
    db.session.flush()
    return s


def deduct_stock(request):
    """On approval (D10). Freezes each batch's rate onto the request line (D11)."""
    from app.models import RequestItem

    now = dt.datetime.utcnow()
    for ri in request.items:
        s = get_stock(ri.item_id)
        s.quantity_on_hand = max(0, s.quantity_on_hand - ri.qty)
        s.last_updated = now
        if not ri.unit_rate:
            # FIFO: oldest remaining batch's rate = actual purchase cost of these units
            from app.models import StockIn as SI
            r = (
                db.session.query(SI.unit_rate)
                .filter(SI.item_id == ri.item_id)
                .order_by(SI.id.asc())
                .first()
            )
            ri.unit_rate = r[0] if r else (ri.item.rate or 0)
        if s.quantity_on_hand <= (ri.item.low_stock_threshold or 0):
            notifications.notify_low_stock(ri.item_id, s.quantity_on_hand, ri.item.low_stock_threshold)
    request.status = "fulfilled"
    request.fulfilled_at = now


def reject(request):
    request.status = "rejected"
    request.fulfilled_at = dt.datetime.utcnow()