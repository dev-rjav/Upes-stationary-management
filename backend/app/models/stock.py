from datetime import datetime, timezone
from .. import db


class Stock(db.Model):
    __tablename__ = 'stock'

    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('stationary_items.id'), unique=True, nullable=False)
    quantity_on_hand = db.Column(db.Integer, nullable=False, default=0)
    last_updated = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    item = db.relationship('StationaryItem', back_populates='stock')

    def to_dict(self):
        return {
            'item_id': self.item_id,
            'quantity_on_hand': self.quantity_on_hand,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None,
        }


class StockInBatch(db.Model):
    __tablename__ = 'stock_in_batches'

    id = db.Column(db.Integer, primary_key=True)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('receptionists.id'), nullable=True)
    uploaded_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    vendor_name = db.Column(db.String(200), nullable=True)
    invoice_ref = db.Column(db.String(100), nullable=True)
    source = db.Column(db.String(20), nullable=False, default='manual')  # 'manual' or 'excel_upload'
    original_filename = db.Column(db.String(256), nullable=True)
    confirmed_at = db.Column(db.DateTime, nullable=True)

    lines = db.relationship('StockIn', back_populates='batch', lazy='dynamic', cascade='all, delete-orphan')


class StockIn(db.Model):
    __tablename__ = 'stock_ins'

    id = db.Column(db.Integer, primary_key=True)
    batch_id = db.Column(db.Integer, db.ForeignKey('stock_in_batches.id'), nullable=True)
    item_id = db.Column(db.Integer, db.ForeignKey('stationary_items.id'), nullable=False)
    quantity_received = db.Column(db.Integer, nullable=False)
    rate_per_unit = db.Column(db.Float, nullable=False, default=0.0)
    received_date = db.Column(db.Date, nullable=False)
    notes = db.Column(db.Text, nullable=True)

    item = db.relationship('StationaryItem', back_populates='stock_ins')
    batch = db.relationship('StockInBatch', back_populates='lines')

    def to_dict(self):
        return {
            'id': self.id,
            'item_id': self.item_id,
            'item_name': self.item.name if self.item else None,
            'quantity_received': self.quantity_received,
            'rate_per_unit': self.rate_per_unit,
            'received_date': self.received_date.isoformat() if self.received_date else None,
            'notes': self.notes,
        }
