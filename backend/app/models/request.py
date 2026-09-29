from app import db

STATUSES = ("pending", "fulfilled", "rejected")


class RequestItem(db.Model):
    __tablename__ = "request_items"

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey("requests.id"), nullable=False, index=True)
    item_id = db.Column(db.Integer, db.ForeignKey("items.id"), nullable=False)
    qty = db.Column(db.Integer, nullable=False)
    unit_rate = db.Column(db.Float, default=0.0)  # frozen at fulfillment (D11)

    item = db.relationship("Item")
    request = db.relationship("Request", back_populates="items")

    def to_dict(self):
        return {
            "id": self.id,
            "item_id": self.item_id,
            "item": self.item.name if self.item else None,
            "unit": self.item.unit if self.item else None,
            "qty": self.qty,
            "unit_rate": self.unit_rate,
            "amount": round((self.unit_rate or 0) * (self.qty or 0), 2),
        }


class Request(db.Model):
    __tablename__ = "requests"

    id = db.Column(db.Integer, primary_key=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey("teachers.id"), nullable=False, index=True)
    status = db.Column(db.String(12), default="pending", nullable=False, index=True)
    is_override = db.Column(db.Boolean, default=False)  # D12
    override_reason = db.Column(db.String(300), default="")
    created_at = db.Column(db.DateTime, default=db.func.now(), nullable=False, index=True)
    created_by = db.Column(db.String(120), default="teacher")  # 'teacher' | receptionist name
    fulfilled_at = db.Column(db.DateTime, nullable=True)

    teacher = db.relationship("Teacher")
    items = db.relationship("RequestItem", back_populates="request", cascade="all, delete-orphan", lazy="select")

    def to_dict(self, with_items=True):
        d = {
            "id": self.id,
            "teacher": self.teacher.name if self.teacher else None,
            "teacher_sap": self.teacher.sap_id if self.teacher else None,
            "cluster": self.teacher.cluster.name if self.teacher and self.teacher.cluster else None,
            "status": self.status,
            "is_override": self.is_override,
            "override_reason": self.override_reason,
            "created_at": self.created_at.isoformat(sep=" ") if self.created_at else None,
            "fulfilled_at": self.fulfilled_at.isoformat(sep=" ") if self.fulfilled_at else None,
            "created_by": self.created_by,
            "total": round(sum((i.unit_rate or 0) * (i.qty or 0) for i in self.items), 2),
        }
        if with_items:
            d["items"] = [i.to_dict() for i in self.items]
        return d