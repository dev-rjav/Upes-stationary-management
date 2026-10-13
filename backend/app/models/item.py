from datetime import datetime, timezone
from .. import db


class StationaryItem(db.Model):
    __tablename__ = 'stationary_items'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), unique=True, nullable=False)
    unit = db.Column(db.String(16), nullable=False, default='EA')
    hsn_code = db.Column(db.String(20), nullable=True)
    default_rate = db.Column(db.Float, nullable=True)
    low_stock_threshold = db.Column(db.Integer, nullable=False, default=10)
    per_checkout_cap = db.Column(db.Integer, nullable=True)
    monthly_cap = db.Column(db.Integer, nullable=True)
    weekly_cap = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    stock = db.relationship('Stock', back_populates='item', uselist=False, cascade='all, delete-orphan')
    aliases = db.relationship('ItemAlias', back_populates='item', lazy='dynamic', cascade='all, delete-orphan')
    cluster_items = db.relationship('ClusterItem', back_populates='item', lazy='dynamic', cascade='all, delete-orphan')
    request_lines = db.relationship('RequestLine', back_populates='item', lazy='dynamic')
    stock_ins = db.relationship('StockIn', back_populates='item', lazy='dynamic')

    def to_dict(self, include_stock=True):
        d = {
            'id': self.id,
            'name': self.name,
            'unit': self.unit,
            'hsn_code': self.hsn_code,
            'default_rate': self.default_rate,
            'low_stock_threshold': self.low_stock_threshold,
            'per_checkout_cap': self.per_checkout_cap,
            'monthly_cap': self.monthly_cap,
            'weekly_cap': self.weekly_cap,
        }
        if include_stock and self.stock:
            d['on_hand'] = self.stock.quantity_on_hand
            d['last_updated'] = self.stock.last_updated.isoformat() if self.stock.last_updated else None
        else:
            d['on_hand'] = 0
            d['last_updated'] = None
        return d


class ItemAlias(db.Model):
    __tablename__ = 'item_aliases'

    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('stationary_items.id'), nullable=False)
    alias = db.Column(db.String(200), nullable=False)

    item = db.relationship('StationaryItem', back_populates='aliases')

    def to_dict(self):
        return {'id': self.id, 'item_id': self.item_id, 'alias': self.alias}


class ClusterItem(db.Model):
    __tablename__ = 'cluster_items'

    id = db.Column(db.Integer, primary_key=True)
    cluster_id = db.Column(db.Integer, db.ForeignKey('clusters.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('stationary_items.id'), nullable=False)
    is_enabled = db.Column(db.Boolean, nullable=False, default=False)
    per_checkout_cap = db.Column(db.Integer, nullable=True)
    monthly_cap = db.Column(db.Integer, nullable=True)
    weekly_cap = db.Column(db.Integer, nullable=True)

    cluster = db.relationship('Cluster', back_populates='cluster_items')
    item = db.relationship('StationaryItem', back_populates='cluster_items')

    __table_args__ = (db.UniqueConstraint('cluster_id', 'item_id'),)

    def effective_per_checkout_cap(self):
        return self.per_checkout_cap if self.per_checkout_cap is not None else self.item.per_checkout_cap

    def effective_monthly_cap(self):
        return self.monthly_cap if self.monthly_cap is not None else self.item.monthly_cap

    def effective_weekly_cap(self):
        return self.weekly_cap if self.weekly_cap is not None else self.item.weekly_cap

    def to_dict(self):
        return {
            'id': self.id,
            'cluster_id': self.cluster_id,
            'item_id': self.item_id,
            'item_name': self.item.name if self.item else None,
            'is_enabled': self.is_enabled,
            'per_checkout_cap': self.per_checkout_cap,
            'monthly_cap': self.monthly_cap,
            'weekly_cap': self.weekly_cap,
            'effective_per_checkout_cap': self.effective_per_checkout_cap(),
            'effective_monthly_cap': self.effective_monthly_cap(),
        }
