from app import db


class Teacher(db.Model):
    __tablename__ = "teachers"

    id = db.Column(db.Integer, primary_key=True)
    sap_id = db.Column(db.String(20), unique=True, nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    cluster_id = db.Column(db.Integer, db.ForeignKey("clusters.id"), nullable=False)
    designation = db.Column(db.String(40), default="")  # D7 (expanded via D-T1)
    employee_type = db.Column(db.String(40), default="")
    is_legacy = db.Column(db.Boolean, default=False)  # migrated from historical records (D23)

    cluster = db.relationship("Cluster")

    def to_dict(self, include_name=True):
        d = {"id": self.id, "sap_id": self.sap_id, "cluster_id": self.cluster_id, "cluster": self.cluster.name if self.cluster else None, "designation": self.designation, "employee_type": self.employee_type, "is_legacy": self.is_legacy}
        if include_name:
            d["name"] = self.name
        return d