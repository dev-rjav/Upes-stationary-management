# -*- coding: utf-8 -*-
"""One-pass extraction from the three historical Excel files -> data/extracted.json.

Usage: python data/extract.py [YYYY-MM]   (migration month, default: latest complete month)

Sources:
- "Copy of Stationery issued to Faculty 2025.xlsx" : faculty issuance, monthly sheets
- "Stationery MIS 1 2025.xlsx"                     : canonical HSN catalog + purchase prices
- "Deaprtmental Stationery Expenditure 2025.xlsx"  : cluster headers (deptal pivot, Jan25..Sep26)

Output: extracted.json with clusters, catalog, aliases, teachers, migration.
"""
import sys, os, re, json, datetime as dt
from collections import Counter, defaultdict
import openpyxl
from thefuzz import fuzz

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)
FAC = os.path.join(BASE, "Copy of Stationery issued to Faculty 2025.xlsx")
MIS = os.path.join(BASE, "Stationery MIS 1 2025.xlsx")
DEP = os.path.join(BASE, "Deaprtmental Stationery Expenditure 2025.xlsx")
OUT = os.path.join(BASE, "extracted.json")

MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]

def norm_name(s):
    s = (s or "").strip()
    s = s.replace("“", '"').replace("”", '"')
    s = s.replace("’", "'").replace("‘", "'")
    s = re.sub(r"[​ ]+", " ", s)
    s = s.replace('""', '"')  # Excel escaped quotes
    if len(s) >= 2 and s.startswith('"') and s.endswith('"'):
        s = s[1:-1]
    elif s.startswith('"') and s.count('"') % 2 == 1:
        s = s[1:]  # unbalanced leading-quote artifact
    s = re.sub(r"\s+", " ", s)
    return s.strip()

def norm_dept(s):
    s = norm_name(s).upper()
    for pre in ("THE ", "SCHOOL OF ", "SCHOOL OF  ", "SO ", "DEPT ", "DEPARTMENT OF "):
        if s.startswith(pre):
            s = s[len(pre):]
    s = s.replace("(G)", " GEN ").replace("(G)", " GEN ")
    s = re.sub(r"\b(GEN|GENERAL)\b\s*\(?\bADMIN\b\)?", "", s)
    s = re.sub(r" +", " ", s).strip(" ()-")
    return s

def norm_person(s):
    s = norm_name(s).lower()
    s = re.sub(r"^(dr|prof|mr|mrs|ms|miss)\.?\s+", "", s)
    s = re.sub(r"\b(kaushik)\b", "kaushik", s)
    s = s.replace("km", "k").replace("kumari", "k")  # initial-style variants handled at match level
    return re.sub(r"\s+", " ", s).strip()

def parse_date(v):
    if v is None or v == "":
        return None
    if isinstance(v, dt.datetime):
        return v.date()
    if isinstance(v, dt.date):
        return v
    s = str(v).strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d/%m/%y", "%d-%m-%Y", "%d-%m-%y"):
        try:
            return dt.datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None

def parse_sheet(wb, sheet, month, year):
    """Parse one monthly issuance sheet. Returns (rows, unparseable_dates, loose_rows, rim_rows)."""
    ws = wb[sheet]
    grid = [list(r) for r in ws.iter_rows(min_row=1, max_row=min(ws.max_row, 1200), values_only=True)]
    header_i = None
    for i in range(4):
        if i < len(grid) and any("Item Issued" in str(c) for c in grid[i] if c):
            header_i = i
            break
    if header_i is None:
        return [], 0, [], []
    header = [str(c).strip().lower() if c else "" for c in grid[header_i]]
    def col(*keys):
        for k in keys:
            if k in header:
                return header.index(k)
        return None
    d_c, u_c, dep_c, it_c, q_c = col("date"), col("user"), col("user department"), col("item issued"), col("qty")
    if None in (d_c, u_c, it_c, q_c):
        d_c, u_c, dep_c, it_c, q_c = 0, 1, 2, 3, 4
    rows, bad = [], 0
    for r in grid[header_i + 1:]:
        if len(r) <= max(d_c, u_c, it_c, q_c):
            continue
        item = norm_name(r[it_c])
        qty = r[q_c]
        if not item or qty in (None, "", 0):
            continue
        try:
            qty = int(float(str(qty).strip()))
        except ValueError:
            continue
        d = parse_date(r[d_c])
        if d is None:
            bad += 1
            d = dt.date(year, month, 1)  # fallback: first of the sheet's month
        user = norm_name(r[u_c]) if u_c < len(r) else ""
        dept = norm_name(r[dep_c]) if dep_c is not None and dep_c < len(r) else ""
        if user or item:
            rows.append({"date": d.isoformat(), "user": user, "dept": dept, "item": item, "qty": qty})
    # Loose-sheet side block: find the 'loose sheet' header cell
    loose, rim = [], []
    ls_c = rm_c = None
    for i, h in enumerate(header):
        if "loose sheet" in h:
            ls_c = i
        if "rim" in h:
            rm_c = i
    if ls_c is not None:
        for r in grid[header_i + 1:]:
            if ls_c >= len(r):
                continue
            qty = r[ls_c]
            if qty in (None, "", 0):
                continue
            try:
                qty = int(float(str(qty).strip()))
            except ValueError:
                continue
            d = parse_date(r[ls_c - 3]) if ls_c >= 3 else None
            if d is None:
                d = dt.date(year, month, 1)
            user = norm_name(r[ls_c - 2]) if ls_c >= 2 and len(r) > ls_c - 2 else ""
            dept = norm_name(r[ls_c - 1]) if ls_c >= 1 and len(r) > ls_c - 1 else ""
            loose.append({"date": d.isoformat(), "user": user, "dept": dept, "qty": qty})
    if rm_c is not None:
        for r in grid[header_i + 1:]:
            if rm_c >= len(r):
                continue
            qty = r[rm_c]
            if qty in (None, "", 0):
                continue
            try:
                qty = int(float(str(qty).strip()))
            except ValueError:
                continue
            d = parse_date(r[rm_c - 3]) if rm_c >= 3 else None
            if d is None:
                d = dt.date(year, month, 1)
            user = norm_name(r[rm_c - 2]) if rm_c >= 2 and len(r) > rm_c - 2 else ""
            dept = norm_name(r[rm_c - 1]) if rm_c >= 1 and len(r) > rm_c - 1 else ""
            rim.append({"date": d.isoformat(), "user": user, "dept": dept, "qty": qty})
    return rows, bad, loose, rim

def main():
    mig_arg = sys.argv[1] if len(sys.argv) > 1 else None
    mig_month = dt.date.fromisoformat(mig_arg) if mig_arg else None

    # ---------- 1. Faculty issuance: months, variants, teachers ----------
    wb = openpyxl.load_workbook(FAC, read_only=True, data_only=True)
    month_rows = defaultdict(list)     # (month, year) -> rows
    item_variants = Counter()
    dept_variants = Counter()
    person_by_norm = defaultdict(list) # norm_person -> [(display, dept)]
    teachers_month = defaultdict(list) # (month, year) -> [person keys]
    migration = None
    for name in wb.sheetnames:
        low = name.lower()
        if any(m in low for m in ("dept", "detail", "expenditure", "letter", "sheet1")):
            continue
        hit = next(((i + 1, m) for i, m in enumerate(MONTHS) if low.startswith(m) or (len(low) > 3 and low.split()[0] == m)), None)
        if not hit:
            continue
        month, yname = hit
        ymatch = re.search(r"(20)?(\d{2})", name)
        if ymatch and ymatch.group(0).startswith("20"):
            year = int(ymatch.group(0))
        elif ymatch:
            year = 2000 + int(ymatch.group(2))
        else:
            year = 2025 if month in hit and not re.search(r"26", name) else 2026
        rows, bad, loose, rim = parse_sheet(wb, name, month, year)
        rows += [{"date": r["date"], "user": r["user"], "dept": r["dept"], "item": "Loose Sheet", "qty": r["qty"]} for r in loose]
        rows += [{"date": r["date"], "user": r["user"], "dept": r["dept"], "item": "Rim (50mt)", "qty": r["qty"]} for r in rim]
        month_rows[(month, year)] = rows
        for r in rows:
            item_variants[r["item"]] += r["qty"]
            if r["dept"]:
                dept_variants[r["dept"]] += 1
            if r["user"]:
                person_by_norm[norm_person(r["user"])].append((r["user"], r["dept"]))
                teachers_month[(month, year)].append((r["user"], r["dept"]))
    wb.close()
    print(f"months parsed: {sorted(month_rows.keys())}")
    for k, v in sorted(month_rows.items()):
        print(f"  {k}: {len(v)} rows")

    # migration month = arg, else latest (month,year) whose month is fully past or == current month
    today = dt.date.today()
    if mig_month:
        target = (mig_month.month, mig_month.year)
    else:
        past = [k for k in month_rows if k[1] < today.year or (k[1] == today.year and k[0] <= today.month)]
        target = max(past, key=lambda k: (k[1], k[0]))
    print(f"migration month: {target}")

    # ---------- 2. Catalog from MIS ----------
    cat = {}
    wb = openpyxl.load_workbook(MIS, read_only=True, data_only=True)
    for sheet in ("MIS 2026", "MIS 2025"):
        if sheet not in wb.sheetnames:
            continue
        ws = wb[sheet]
        for r in ws.iter_rows(min_row=3, values_only=True):
            if r[1] is None:
                continue
            hsn = norm_name(str(r[0])) if r[0] is not None else ""
            item = norm_name(r[1])
            unit = norm_name(r[2]) if r[2] else "EA"
            price = r[3]
            try:
                price = round(float(price), 2) if price not in (None, "") else 0.0
                if price != price:  # NaN guard
                    price = 0.0
            except (ValueError, TypeError):
                price = 0.0
            key = item
            if key in cat:
                if price and not cat[key]["price"]:
                    cat[key]["price"] = price
            else:
                cat[key] = {"hsn": hsn, "unit": unit, "price": price}
    wb.close()
    print(f"catalog items: {len(cat)}")

    # ---------- 3. Clusters ----------
    clusters = Counter(dept_variants)
    # union with deptal pivot headers
    wb = openpyxl.load_workbook(DEP, read_only=True, data_only=True)
    pivot_hdr = Counter()
    for name in wb.sheetnames:
        if "dept" in name.lower() or "expenditure" in name.lower() or "letter" in name.lower() or "sheet" in name.lower():
            continue
        ws = wb[name]
        for r in ws.iter_rows(min_row=1, max_row=1, values_only=True):
            for c in r[5:]:
                if c:
                    pivot_hdr[norm_name(c)] += 1
    wb.close()
    clusters.update({k: v for k, v in pivot_hdr.items() if v <= 1})  # headers seen once (no issuance volume)
    print(f"cluster variants: {len(clusters)}")

    def canon_merge(a, b):
        la, lb = a.lower(), b.lower()
        if la == lb:
            return True
        if fuzz.ratio(la, lb) >= 78:
            return True
        if len(la) >= 4 and lb.startswith(la):
            return True
        if len(lb) >= 4 and la.startswith(lb):
            return True
        if fuzz.token_sort_ratio(la, lb) >= 88:
            return True
        return False

    ordered = sorted(clusters, key=lambda k: (-clusters[k], k.lower()))
    canonical_groups = []  # [canonical, [variants...]]
    for n in ordered:
        for g in canonical_groups:
            if canon_merge(n, g[0]):
                g[1].append(n)
                break
        else:
            canonical_groups.append([n, [n]])
    print(f"canonical clusters: {len(canonical_groups)}")

    # ---------- 4. Alias derivation ----------
    aliases = {}
    unmatched = []
    items = list(item_variants.items())
    # pre-pass: exact and near-exact
    cat_keys = sorted(cat.keys(), key=len, reverse=True)
    cat_lower = {k.lower(): k for k in cat_keys}
    for name, _ in items:
        ln = name.lower().strip()
        if ln in cat_lower:
            aliases[name] = {"match": cat_lower[ln], "method": "exact"}
            continue
    # second pass: containment + fuzzy
    for name, _ in items:
        if name in aliases:
            continue
        ln = name.lower().strip()
        hit = None
        for ck in cat_keys:
            if len(ck) > 4 and ck.lower() in ln:
                hit = ck
                break
        if hit:
            aliases[name] = {"match": hit, "method": "substring"}
            continue
        best, best_score = None, 0
        for ck in cat_keys:
            sc = max(fuzz.ratio(ln, ck.lower()), fuzz.partial_ratio(ln, ck.lower()) * 0.92)
            if sc > best_score:
                best, best_score = ck, sc
        if best_score >= 78:
            aliases[name] = {"match": best, "method": "fuzzy", "score": round(best_score)}
        else:
            unmatched.append({"name": name, "score": round(best_score), "suggestion": best})
    print(f"aliases: {len(aliases)}  unmatched: {len(unmatched)}")

    # ---------- 5. Migration rows (mapped) ----------
    mig_rows = []
    for r in month_rows[target]:
        al = aliases.get(r["item"])
        if al:
            mig_rows.append({**r, "item": al["match"]})
        else:
            # keep as its own canonical item so no volume is lost
            mig_rows.append({**r, "item": r["item"]})
    # teachers active in migration month
    mig_teachers = []
    seen = set()
    for user, dept in teachers_month[target]:
        key = norm_person(user)
        if key in seen or not key:
            continue
        seen.add(key)
        variants = person_by_norm[key]
        display = max(variants, key=lambda x: x[0].__len__())[0]
        depts = Counter(d for _, d in variants if d)
        mig_teachers.append({"name": display, "dept": depts.most_common(1)[0][0] if depts else "", "n_variants": len(set(v[0].lower() for v in variants))})
    mig_teachers.sort(key=lambda t: t["name"].lower())
    print(f"migration rows: {len(mig_rows)}  teachers: {len(mig_teachers)}")

    out = {
        "migration_month": f"{target[1]}-{target[0]:02d}",
        "clusters": [
            {
                "canonical": g[0],
                "total": sum(clusters[v] for v in g[1]),
                "variants": [{"name": v, "issuances": clusters[v]} for v in g[1]],
            }
            for g in canonical_groups
        ],
        "catalog": [{"name": k, **v} for k, v in sorted(cat.items(), key=lambda kv: kv[0].lower())],
        "item_variants": [{"name": k, "total_qty": v} for k, v in item_variants.most_common()],
        "aliases": aliases,
        "unmatched": unmatched,
        "teachers": mig_teachers,
        "migration": mig_rows,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"wrote {OUT}")

if __name__ == "__main__":
    main()