from app import db


class Stock(db.Model):
    __tablename__ = "stock"

    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey("items.id"), unique=True, nullable=False, index=True)
    quantity_on_hand = db.Column(db.Integer, default=0, nullable=False)
    last_updated = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())

    item = db.relationship("Item")

    def to_dict(self):
        i = self.item
        return {
            "item_id": self.item_id,
            "item": i.name if i else None,
            "unit": i.unit if i else None,
            "rate": i.rate if i else None,
            "quantity_on_hand": self.quantity_on_hand,
            "low_stock_threshold": i.low_stock_threshold if i else 0,
            "is_low": bool(i and i.low_stock_threshold is not None and self.quantity_on_hand <= i.low_stock_threshold),
            "last_updated": self.last_updated.isoformat(sep=" ") if self.last_updated else None,
        }


class StockIn(db.Model):
    """Each stock-in batch. D11: rate is frozen here at purchase time."""

    __tablename__ = "stock_in"

    def batch_rate(self):
        return self.unit_rate

    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey("items.id"), nullable=False, index=True)
    qty = db.Column(db.Integer, nullable=False)
    unit_rate = db.Column(db.Float, default=0.0, nullable=False)
    source = db.Column(db.String(30), default="manual")  # manual | excel | opening
    note = db.Column(db.String(300), default="")
    created_by = db.Column(db.String(120), default="")
    created_at = db.Column(db.DateTime, default=db.func.now(), nullable=False, index=True)

    item = db.relationship("Item")

    def to_dict(self):
        return {
            "id": self.id,
            "item": self.item.name if self.item else None,
            "qty": self.qty,
            "unit_rate": self.unit_rate,
            "amount": round(self.unit_rate * self.qty, 2),
            "source": self.source,
            "note": self.note,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat(sep=" ") if self.created_at else None,
        }