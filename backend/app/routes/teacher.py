import re

from flask import Blueprint, jsonify, request

from app import db
from app.models import Cluster, Teacher

bp = Blueprint("teacher", __name__, url_prefix="/api/teacher")


def _slug(name):
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or "t"


@bp.post("/lookup")
def lookup():
    """D4: SAP ID is the identity token. Auto-registers unknown teachers."""
    d = request.get_json(silent=True) or {}
    sap = re.sub(r"\s+", "", str(d.get("sap_id") or "")).upper()
    if not sap:
        return jsonify({"error": "SAP ID required"}), 400
    t = Teacher.query.filter_by(sap_id=sap).first()
    created = False
    if not t:
        name = (d.get("name") or "").strip()
        cluster_name = (d.get("cluster") or "").strip()
        if not name or not cluster_name:
            # 409 + code: the kiosk uses this to reveal the identity fields
            # only for first-time teachers (known staff skip straight to items)
            return jsonify({"error": "first time here? add your name and cluster", "code": "new_teacher"}), 409
        cluster = Cluster.query.filter(db.func.lower(Cluster.name) == cluster_name.lower()).first()
        if not cluster:
            return jsonify({"error": f"unknown cluster: {cluster_name}"}), 400
        t = Teacher(sap_id=sap, name=name, cluster_id=cluster.id, designation=d.get("designation", ""), employee_type=d.get("employee_type", ""))
        db.session.add(t)
        created = True
    db.session.commit()
    return jsonify({"teacher": t.to_dict(), "created": created})


@bp.get("/lookup/caps")
def caps():
    """Per-item remaining caps for the checkout page (D8 frontend mirror)."""
    sap = re.sub(r"\s+", "", str(request.args.get("sap_id") or "")).upper()
    t = Teacher.query.filter_by(sap_id=sap).first()
    if not t:
        return jsonify({"error": "unknown SAP ID — complete the form first"}), 404
    from app.services import cap_service
    return jsonify({"teacher": t.to_dict(), "week": cap_service.week_info(), "caps": cap_service.caps_summary(t.id)})


@bp.get("/suggestions")
def name_suggestions():
    """Fuzzy teacher-name search (SAP IDs are unknown in historical data)."""
    q = (request.args.get("q") or "").strip().lower()
    if len(q) < 2:
        return jsonify([])
    from thefuzz import fuzz
    out = []
    for t in Teacher.query.all():
        score = fuzz.ratio(q, t.name.lower())
        if score >= 70:
            out.append({"id": t.id, "name": t.name, "cluster": t.cluster.name if t.cluster else None, "score": score})
    out.sort(key=lambda x: -x["score"])
    return jsonify(out[:8])