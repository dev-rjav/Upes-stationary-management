from datetime import datetime, timezone
from .. import db


class Teacher(db.Model):
    __tablename__ = 'teachers'

    id = db.Column(db.Integer, primary_key=True)
    sap_id = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    cluster_id = db.Column(db.Integer, db.ForeignKey('clusters.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    cluster = db.relationship('Cluster', back_populates='teachers')
    requests = db.relationship('Request', back_populates='teacher', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'sap_id': self.sap_id,
            'name': self.name,
            'cluster_id': self.cluster_id,
            'cluster': self.cluster.name if self.cluster else None,
        }
