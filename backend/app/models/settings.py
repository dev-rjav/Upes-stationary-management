from datetime import datetime, timezone
from .. import db


class SystemSettings(db.Model):
    __tablename__ = 'system_settings'

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.String(500), nullable=False)
    updated_by = db.Column(db.Integer, db.ForeignKey('receptionists.id'), nullable=True)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    updater = db.relationship('Receptionist')

    @staticmethod
    def get(key, default=None):
        row = SystemSettings.query.filter_by(key=key).first()
        return row.value if row else default

    @staticmethod
    def set(key, value, updated_by=None):
        row = SystemSettings.query.filter_by(key=key).first()
        if row:
            row.value = str(value)
            row.updated_by = updated_by
            row.updated_at = datetime.now(timezone.utc)
        else:
            row = SystemSettings(key=key, value=str(value), updated_by=updated_by)
            db.session.add(row)
        db.session.commit()

    def to_dict(self):
        return {
            'key': self.key,
            'value': self.value,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
