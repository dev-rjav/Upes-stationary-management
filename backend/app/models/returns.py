from app import db


class ReturnLog(db.Model):
    """P1: reverse leg of Issue -> Consumption -> Return.

    A return references the request line it undoes. Consumed quantity is
    DERIVED (issued - returned), so the invariant consumed + returned <= issued
    holds by construction. Returns raise stock back on hand.
    """

    __tablename__ = "return_log"

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey("requests.id"), nullable=False, index=True)
    item_id = db.Column(db.Integer, db.ForeignKey("items.id"), nullable=False, index=True)
    qty = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.String(300), default="")
    by = db.Column(db.String(120), default="")
    created_at = db.Column(db.DateTime, default=db.func.now(), nullable=False, index=True)

    request = db.relationship("Request")
    item = db.relationship("Item")

    def to_dict(self):
        return {
            "id": self.id,
            "request": self.request_id,
            "item": self.item.name if self.item else None,
            "qty": self.qty,
            "reason": self.reason,
            "by": self.by,
            "created_at": self.created_at.isoformat(sep=" ") if self.created_at else None,
        }


def returned_for(request, item_id):
    """Total already returned against one request line."""
    from sqlalchemy import func
    rows = (
        db.session.query(func.coalesce(func.sum(ReturnLog.qty), 0))
        .filter(ReturnLog.request_id == request.id, ReturnLog.item_id == item_id)
        .scalar()
    )
    return int(rows or 0)