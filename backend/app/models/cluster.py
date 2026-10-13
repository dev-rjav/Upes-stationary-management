from .. import db


class Cluster(db.Model):
    __tablename__ = 'clusters'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), unique=True, nullable=False)
    description = db.Column(db.String(256), nullable=True)
    # When true, ALL caps (per-checkout / monthly / weekly) are disabled for this
    # department — items stay subject only to visibility (is_enabled) and stock.
    caps_disabled = db.Column(db.Boolean, nullable=False, default=False)

    teachers = db.relationship('Teacher', back_populates='cluster', lazy='dynamic')
    cluster_items = db.relationship('ClusterItem', back_populates='cluster', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'caps_disabled': bool(self.caps_disabled),
        }
