# D21: in-app only. Notifications are rows the dashboard surfaces.
from app import db
from app.models import Notification


def notify_low_stock(item_id, current_qty, threshold):
    n = Notification.query.filter_by(kind="low_stock", item_id=item_id).first()
    if n:
        n.qty = current_qty
        n.read = False
    else:
        from app.models import Item
        name = Item.query.get(item_id).name
        n = Notification(kind="low_stock", item_id=item_id, qty=current_qty, message=f"{name} down to {current_qty} (threshold {threshold})")
        db.session.add(n)


def notify_event(kind, message, item_id=None, qty=None):
    n = Notification(kind=kind, message=message, item_id=item_id, qty=qty)
    db.session.add(n)
    db.session.flush()
    return n