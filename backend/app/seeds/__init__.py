"""Seed the DB from data/extracted.py's output (extracted.json).

Run once at first boot: creates the demo receptionist, clusters, items (+aliases),
teachers active in the migration month, the D23 last-month migration as fulfilled
requests, and a stock-in baseline.
"""
import datetime as dt
import json
import os
import re
from collections import Counter

from app import db
from app.models import Cluster, Item, ItemAlias, Notification, Receptionist, Request, RequestItem, Stock, StockIn, Teacher

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
EXTRACTED = os.path.join(ROOT, "..", "data", "extracted.json")

CAPS = {
    "PEN": (10, 3), "PENCIL": (5, 2), "HIGHLIGHTER": (10, 3), "MARKER": (5, 2), "GEL PEN": (5, 2),
    "STAPLER": (2, 1), "STAPLE": (3, 1), "GLUE": (5, 2), "CELLO": (10, 4), "TAPE": (5, 2),
    "FILE": (20, 10), "FOLDER": (25, 10), "NOTE PAD": (10, 4), "REGISTER": (5, 2), "ATTENDANCE": (3, 1),
    "STICKY": (5, 2), "ERASER": (5, 2), "SCISSOR": (2, 1), "SCALE": (3, 1), "RULER": (3, 1),
    "PAPER CUTTER": (2, 1), "BINDER": (5, 2), "BROCHURE": (10, 4), "LETTER HEAD": (10, 4), "A4": (3, 1),
}
DEFAULT_CAP = (5, 2)


def _find_cap(name):
    for key, cap in CAPS.items():
        if key.lower() in name.lower():
            return cap
    return DEFAULT_CAP


def _norm_cluster(name):
    s = (name or "").strip().upper()
    s = s.replace("–", "-").replace("—", "-")
    s = re.sub(r"\s+", " ", s).strip()
    for pre in ("THE ", "SCHOOL OF ", "SO ", "DEPT ", "DEPARTMENT OF "):
        if s.startswith(pre):
            s = s[len(pre):]
    s = s.strip(" ()-")
    return s


def seed_if_empty():
    if Receptionist.query.first() is not None:
        return
    if not os.path.exists(EXTRACTED):
        # minimal fallback so the app boots even without the data files
        _seed_minimal()
        return
    with open(EXTRACTED, encoding="utf-8") as f:
        data = json.load(f)

    # ---- receptionist (D6) ----
    rec = Receptionist(username="demo", name="Demo Receptionist")
    rec.set_password("demo123")
    db.session.add(rec)

    # ---- clusters (canonical, D15; variants mapped in) ----
    cluster_map = {}
    variant_map = {}
    for c in data["clusters"]:
        key = _norm_cluster(c["canonical"])
        if not key or key in cluster_map:
            continue
        cl = Cluster(name=key)
        db.session.add(cl)
        cluster_map[key] = cl
        for v in c.get("variants", []):
            variant_map[_norm_cluster(v["name"])] = cl
    default_cluster = next(iter(cluster_map.values()), None)

    def cluster_for(name):
        key = _norm_cluster(name)
        if key in cluster_map:
            return cluster_map[key]
        if key in variant_map:
            return variant_map[key]
        # fuzzy into existing canonical clusters
        best, bs = None, 0
        from thefuzz import fuzz
        for k in cluster_map:
            sc = fuzz.ratio(key, k)
            if sc > bs:
                bs, best = sc, k
        return cluster_map[best] if best and bs >= 60 else (default_cluster if default_cluster else None)

    # ---- items + aliases ----
    item_map = {}
    for c in data["catalog"]:
        it = Item(name=c["name"], hsn_code=c.get("hsn", ""), unit=c.get("unit", "EA"), rate=c.get("price", 0) or 0)
        m, w = _find_cap(c["name"])
        it.monthly_cap, it.weekly_cap = m, w
        it.low_stock_threshold = 10
        db.session.add(it)
        item_map[c["name"]] = it
    # loose sheet + rim as canonical bulk items
    for name, unit, price in (("Loose Sheet", "SHEET", 1.0), ("Rim (50mt)", "RIM", 35.0)):
        it = Item(name=name, unit=unit, rate=price, is_bulk=True, monthly_cap=None, weekly_cap=None, low_stock_threshold=500)
        db.session.add(it)
        item_map[name] = it
    db.session.flush()

    aliases = data.get("aliases", {})
    unattached = []
    for alias, info in aliases.items():
        target = info.get("match")
        if target in item_map:
            db.session.add(ItemAlias(alias=alias, item_id=item_map[target].id, source="seed"))
        elif alias in item_map:
            pass
        else:
            unattached.append(alias)
    # unmatched variants: if a catalog-like name, make its own item; else alias to fuzzy best
    from thefuzz import fuzz
    for alias in unattached:
        best, bs = None, 0
        for cname in item_map:
            sc = max(fuzz.ratio(alias.lower(), cname.lower()), fuzz.partial_ratio(alias.lower(), cname.lower()) * 0.85)
            if sc > bs:
                bs, best = sc, cname
        if best and bs >= 75:
            db.session.add(ItemAlias(alias=alias, item_id=item_map[best].id, source="seed"))
        elif alias.upper() not in {i.name.upper() for i in item_map.values()}:
            it = Item(name=alias, unit="EA", rate=0, is_bulk=False)
            m, w = _find_cap(alias)
            it.monthly_cap, it.weekly_cap = m, w
            it.low_stock_threshold = 5
            db.session.add(it)
            item_map[alias] = it
    db.session.flush()

    def item_for(name):
        if name in item_map:
            return item_map[name]
        a = ItemAlias.query.filter(db.func.lower(ItemAlias.alias) == name.strip().lower()).first()
        if a:
            return a.item
        return None

    # ---- teachers from migration month ----
    tmap = {}
    for i, t in enumerate(data.get("teachers", []), 1):
        cl = cluster_for(t.get("dept")) or default_cluster
        if not cl:
            continue
        sap = f"LEGACY-{i:04d}"
        tr = Teacher(sap_id=sap, name=t["name"], cluster_id=cl.id, is_legacy=True, designation="")
        db.session.add(tr)
        tmap[t["name"].lower()] = tr
    db.session.flush()

    # ---- migration rows -> fulfilled requests (D23) ----
    groups = {}
    for r in data.get("migration", []):
        user = (r.get("user") or "").strip().lower()
        item = item_for(r.get("item"))
        if not user or not item:
            continue
        tr = tmap.get(user)
        if not tr:
            cl = cluster_for(r.get("dept")) or default_cluster
            if not cl:
                continue
            tr = Teacher(sap_id=f"LEGACY-{len(tmap) + 1:04d}", name=r["user"], cluster_id=cl.id, is_legacy=True)
            db.session.add(tr)
            tmap[user] = tr
            db.session.flush()
        try:
            day = dt.date.fromisoformat(str(r["date"])[:10])
        except ValueError:
            continue
        key = (tr.id, item.id, day.isoformat())
        groups[key] = groups.get(key, 0) + int(r["qty"])
    for (teacher_id, item_id, day), qty in groups.items():
        d = dt.date.fromisoformat(day)
        req = Request(teacher_id=teacher_id, status="fulfilled", created_by="migration", fulfilled_at=dt.datetime(d.year, d.month, d.day, 12, 0, 0))
        db.session.add(req)
        db.session.flush()
        it = item_map.get(next((n for n, x in item_map.items() if x.id == item_id), "")) or Item.query.get(item_id)
        req.items.append(RequestItem(item_id=item_id, qty=qty, unit_rate=it.rate or 0))
    db.session.flush()

    # ---- stock baseline: 60 days ahead of average daily usage ----
    usage_by_item = Counter()
    for (teacher_id, item_id, day), qty in groups.items():
        usage_by_item[item_id] += qty
    for it in list(item_map.values()):
        daily = usage_by_item.get(it.id, 0) / 30.0
        if daily < 0.5:
            daily = 1 if not it.is_bulk else 200
        qty = max(5, int(round(daily * 60)))
        if it.is_bulk:
            qty = max(qty, 2000)
        db.session.add(Stock(item_id=it.id, quantity_on_hand=qty, last_updated=dt.datetime.utcnow()))
        db.session.add(StockIn(item_id=it.id, qty=qty, unit_rate=it.rate or 0, source="opening", note="seed baseline", created_by="seed"))

    # make a few items genuinely low so the demo has alerts
    low_names = ["Pen", "Sticky Notes", "Cobra File"]
    for it in item_map.values():
        if any(ln.lower() in it.name.lower() for ln in low_names) and not it.is_bulk:
            s = Stock.query.filter_by(item_id=it.id).first()
            if s:
                s.quantity_on_hand = max(1, it.low_stock_threshold - 3)
                db.session.add(
                    Notification(kind="low_stock", item_id=it.id, qty=s.quantity_on_hand, message=f"{it.name} down to {s.quantity_on_hand} (threshold {it.low_stock_threshold})", read=False)
                )
    db.session.commit()
    print(f"[seed] done: {len(cluster_map)} clusters, {len(item_map)} items, {len(tmap)} teachers, {len(groups)} migrated requests")


def _seed_minimal():
    rec = Receptionist(username="demo", name="Demo Receptionist")
    rec.set_password("demo123")
    db.session.add(rec)
    cl = Cluster(name="SOCS")
    db.session.add(cl)
    db.session.flush()
    for name, unit, price, cap in (("Pen", "EA", 12.0, (10, 3)), ("Note Pad", "EA", 25.0, (10, 4)), ("Cobra File", "EA", 20.0, (20, 10)), ("Sticky Notes", "EA", 30.0, (5, 2))):
        it = Item(name=name, unit=unit, rate=price, monthly_cap=cap[0], weekly_cap=cap[1], low_stock_threshold=10)
        db.session.add(it)
        db.session.flush()
        db.session.add(Stock(item_id=it.id, quantity_on_hand=100, last_updated=dt.datetime.utcnow()))
        db.session.add(StockIn(item_id=it.id, qty=100, unit_rate=price, source="opening", note="minimal seed", created_by="seed"))
    tr = Teacher(sap_id="100001", name="Demo Teacher", cluster_id=cl.id)
    db.session.add(tr)
    db.session.commit()
    print("[seed] minimal seed (no extracted.json found)")