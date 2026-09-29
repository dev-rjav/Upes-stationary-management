from app import db


class ItemAlias(db.Model):
    __tablename__ = "item_aliases"

    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey("items.id"), nullable=False, index=True)
    alias = db.Column(db.String(160), unique=True, nullable=False)
    source = db.Column(db.String(20), default="seed")  # seed | learned

    item = db.relationship("Item", back_populates="aliases")


class Item(db.Model):
    __tablename__ = "items"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), unique=True, nullable=False, index=True)
    hsn_code = db.Column(db.String(20), default="")
    unit = db.Column(db.String(10), default="EA")
    rate = db.Column(db.Float, default=0.0)  # D11: current rate; historical cost lives on StockIn
    low_stock_threshold = db.Column(db.Integer, default=10)
    monthly_cap = db.Column(db.Integer, default=5)  # D18: per-item caps
    weekly_cap = db.Column(db.Integer, default=2)
    active = db.Column(db.Boolean, default=True)
    is_bulk = db.Column(db.Boolean, default=False)  # Loose Sheet / Rim — no per-teacher cap

    aliases = db.relationship("ItemAlias", back_populates="item", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "hsn_code": self.hsn_code,
            "unit": self.unit,
            "rate": self.rate,
            "low_stock_threshold": self.low_stock_threshold,
            "monthly_cap": self.monthly_cap,
            "weekly_cap": self.weekly_cap,
            "active": self.active,
            "is_bulk": self.is_bulk,
            "stock": self._stock_qty() if callable(getattr(self, "_stock_qty", None)) else None,
        }

    @staticmethod
    def find_by_alias(alias):
        a = ItemAlias.query.filter(db.func.lower(ItemAlias.alias) == alias.strip().lower()).first()
        return a.item if a else None

    def all_names(self):
        return [self.name] + [x.alias for x in self.aliases]