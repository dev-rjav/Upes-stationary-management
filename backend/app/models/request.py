from datetime import datetime, timezone
from .. import db


class Request(db.Model):
    __tablename__ = 'requests'

    id = db.Column(db.Integer, primary_key=True)
    ref_number = db.Column(db.String(20), unique=True, nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teachers.id'), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='pending')  # pending|fulfilled|rejected
    is_manual = db.Column(db.Boolean, nullable=False, default=False)
    is_cap_override = db.Column(db.Boolean, nullable=False, default=False)
    override_reason = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('receptionists.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    fulfilled_at = db.Column(db.DateTime, nullable=True)
    rejected_at = db.Column(db.DateTime, nullable=True)
    rejection_reason = db.Column(db.Text, nullable=True)
    fulfilled_by = db.Column(db.Integer, db.ForeignKey('receptionists.id'), nullable=True)

    teacher = db.relationship('Teacher', back_populates='requests')
    lines = db.relationship('RequestLine', back_populates='request', lazy='subquery', cascade='all, delete-orphan')
    creator = db.relationship('Receptionist', foreign_keys=[created_by])
    fulfiller = db.relationship('Receptionist', foreign_keys=[fulfilled_by])

    def to_dict(self):
        from . import StationaryItem
        lines = []
        for line in self.lines:
            item = StationaryItem.query.get(line.item_id)
            stock_qty = item.stock.quantity_on_hand if item and item.stock else 0
            last_rate = 0.0
            if item:
                last_si = item.stock_ins.order_by(db.text('id desc')).first()
                if last_si:
                    last_rate = last_si.rate_per_unit
            lines.append({
                'id': line.id,
                'item_id': line.item_id,
                'item_name': item.name if item else 'Unknown',
                'qty_requested': line.quantity_requested,
                'qty_fulfilled': line.quantity_fulfilled,
                'on_hand': stock_qty,
                'rate': last_rate,
            })

        actioned_by = ''
        if self.fulfiller:
            actioned_by = self.fulfiller.display_name

        total_value = sum(
            l['qty_fulfilled'] * l['rate']
            for l in lines
            if l['qty_fulfilled']
        )

        return {
            'id': self.id,
            'ref_number': self.ref_number,
            'teacher_id': self.teacher_id,
            'teacher_name': self.teacher.name if self.teacher else '',
            'sap_id': self.teacher.sap_id if self.teacher else '',
            'cluster': self.teacher.cluster.name if self.teacher and self.teacher.cluster else '',
            'status': self.status,
            'is_manual': self.is_manual,
            'is_cap_override': self.is_cap_override,
            'override_reason': self.override_reason,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'fulfilled_at': self.fulfilled_at.isoformat() if self.fulfilled_at else None,
            'rejected_at': self.rejected_at.isoformat() if self.rejected_at else None,
            'rejection_reason': self.rejection_reason,
            'fulfilled_by_name': actioned_by,
            'actioned_by': actioned_by,
            'lines': lines,
            'total_value': round(total_value, 2),
        }


class RequestLine(db.Model):
    __tablename__ = 'request_lines'

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('requests.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('stationary_items.id'), nullable=False)
    quantity_requested = db.Column(db.Integer, nullable=False)
    quantity_fulfilled = db.Column(db.Integer, nullable=True)

    request = db.relationship('Request', back_populates='lines')
    item = db.relationship('StationaryItem', back_populates='request_lines')
