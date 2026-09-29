from app import db


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    kind = db.Column(db.String(20), nullable=False)  # low_stock | override | info
    item_id = db.Column(db.Integer, db.ForeignKey("items.id"), nullable=True)
    qty = db.Column(db.Integer, nullable=True)
    message = db.Column(db.String(300), default="")
    read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=db.func.now(), index=True)

    def to_dict(self):
        item_name = None
        if self.item_id:
            from app.models import Item
            it = Item.query.get(self.item_id)
            item_name = it.name if it else None
        return {
            "id": self.id,
            "kind": self.kind,
            "item": item_name,
            "qty": self.qty,
            "message": self.message or (f"{item_name} is at {self.qty} (threshold crossed)" if self.kind == "low_stock" else ""),
            "read": self.read,
            "created_at": self.created_at.isoformat(sep=" ") if self.created_at else None,
        }