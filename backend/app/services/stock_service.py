from datetime import datetime, timezone
from .. import db


def deduct_stock(request_id):
    from ..models import Request, RequestLine, Stock
    req = Request.query.get(request_id)
    if not req:
        return

    for line in req.lines:
        stock = Stock.query.filter_by(item_id=line.item_id).first()
        if stock:
            # Never fulfil (or deduct) more than is physically on hand. The
            # approve() route guards against this up front, but keep the
            # primitive safe so manual/override paths can't oversell either.
            fulfilled = min(line.quantity_requested, stock.quantity_on_hand)
            stock.quantity_on_hand = max(0, stock.quantity_on_hand - fulfilled)
            stock.last_updated = datetime.now(timezone.utc)
            line.quantity_fulfilled = fulfilled
        else:
            line.quantity_fulfilled = 0

    db.session.commit()
    _check_low_stock_all(req.lines)


def check_stock_available(req):
    """Return a list of (item_name, have, need) shortfalls for a request.

    Stock is first-come-first-served at approval time (never reserved on
    pending, per spec), so two pending requests can both target the last unit.
    This lets the approve route refuse the second one instead of overselling.
    An empty list means every line can be fully fulfilled.
    """
    from ..models import Stock, StationaryItem
    shortfalls = []
    # Aggregate per item in case the same item appears on multiple lines.
    need_by_item = {}
    for line in req.lines:
        need_by_item[line.item_id] = need_by_item.get(line.item_id, 0) + (line.quantity_requested or 0)
    for item_id, need in need_by_item.items():
        stock = Stock.query.filter_by(item_id=item_id).first()
        have = stock.quantity_on_hand if stock else 0
        if need > have:
            item = StationaryItem.query.get(item_id)
            shortfalls.append((item.name if item else f'item {item_id}', have, need))
    return shortfalls


def add_stock(batch_id):
    from ..models import StockIn, Stock
    lines = StockIn.query.filter_by(batch_id=batch_id).all()
    for line in lines:
        stock = Stock.query.filter_by(item_id=line.item_id).first()
        if stock:
            stock.quantity_on_hand += line.quantity_received
            stock.last_updated = datetime.now(timezone.utc)
        else:
            stock = Stock(item_id=line.item_id, quantity_on_hand=line.quantity_received)
            db.session.add(stock)
    db.session.commit()


def _check_low_stock_all(lines):
    from ..models import Stock, StationaryItem
    for line in lines:
        item = StationaryItem.query.get(line.item_id)
        if not item or not item.stock:
            continue
        if item.stock.quantity_on_hand <= item.low_stock_threshold:
            # In-app notification placeholder — real delivery TBD
            pass
