"""
One-shot script: reads MIS Excel and writes backend/seeds/items.py
Run: python gen_items_seed.py
"""
import pandas as pd, re, os

EXCEL = os.path.join(os.path.dirname(__file__), '../sheets/Stationery MIS 1 2025.xlsx')

# The 87 priority items (exact names from user's list) — enabled for all clusters on seed
PRIORITY_NAMES = {
    'BOND PAPER (BILT 100 GSM)',
    'BINDER CLIP 15MM (ODDY)',
    'BINDER CLIP 32MM (ODDY)',
    'FEVICOL TUBE 100 GRAMS',
    'PAPER CUTTER (ODDY)18 MM',
    'BROWN TAPE 2"(COMMANDER)40 MTRS',
    'CELLO TAPE 2" (CAPTAIN)50 MTRS',
    'BROWN TAPE 2" (CAPTAIN)50 MTRS',
    'DOUBLE SIDED TAPE 12MM5 MTRS',
    'GLUE STICK 8 GRAMS (FABER CASTEL)8 GRAMS',
    'U CLIPS (PLASTIC COATED)100 PIN',
    'BUTTON BAG (INFINITY 932)',
    'INDEX FILE (AJAY)',
    'PENCIL NATRAJ10 NO.',
    'ERASER (NATRAJ PLASTO)20 NO.',
    'TISSUE PAPER BOX',
    'SEPERATOR SA-4',
    'COVER ROLL',
    'PHOTOGLOSSY PAPER (ODDY 150 GSM)50 SHEET',
    'COLORED A-4 PAPER100 SHEETS',
    'BINDER CLIP 19MM (ODDY)',
    'BINDER CLIP 25MM (ODDY)',
    'BINDER CLIP 41MM (ODDY)',
    'BINDER CLIP 51MM (ODDY)',
    'PUSH PINS DUMROO SHAPE (ODDY)50 PCS',
    'FEVICOL TUBE 25 GRAMS',
    'FEVIQUICK 500 MG',
    'WRITING PAD A-5 (DESMAT)80 SHEETS UPES LOGO',
    'WRITING PAD A-4 (DESMAT)80 SHEETS',
    'WRITING PAD A-5 (ODDY)80 SHEETS',
    'CONFERENCE PAD (ODDY)20 SHEETS',
    'STICKY PAD (3X4) ODDY100 SHEETS',
    'STICKY PAD (3X3) DESMAT80 SHEETS',
    'SCISSORS (ODDY)9 INCHES',
    'CELLO TAPE SMALL20 YARDS',
    'CELLO TAPE 1" (CAPTAIN)50 MTRS',
    'DOUBLE SIDED TAPE 24MM5 MTRS',
    'WHITE BOARD MARKER (REYNOLDS)',
    'WHITE BOARD MARKER (ARTLINE)',
    'PERMANENT MARKER (REYNOLDS)',
    'PERMANENT MARKER (CAMLIN)',
    'WHITEBOARD MARKER INK (CAMEL)',
    'STIC FILE (MEGHA 284 NO.)',
    'LABELS A4 ST-121200 NO',
    'STOCK REGISTER280 PGS',
    'SHARPNERS (NATRAJ)20 NO.',
    'SCALE (NATRAJ)6 "',
    'SCALE (NATRAJ)12 "',
    'PACKING TAPE DISPENSAR2 "',
    'REYNOLDS BRITE PEN',
    'RUBBER BAND',
    'STAMP PAD FABER CASTEL',
    'SHEET PROTECTOR A-450 SHEETS',
    'CALCULAOR CITIZEN 512 370',   # MIS has newline between 512 and 370
    'PENCIL COLORS FABER CASTEL 12 SHADES',
    'PIERE CARDIN PEN 150.00',
    'SCISSORS (ODDY)5 INCHES',
    'CORRECTION PEN (METAL TIP) FABER CASTEL7',
    'HIGHLIGHTERS (FABER CASTEL)',
    'A3-REAM(CENTURY STAR 75GSM)',
    'CARBON PAPER KORES100 SHEETS',
    'GUMBOTTLE (VALLEY)700 ML',
    'PAGE MARKERS (4 COLORS) ODDY80 SHEETS',
    'STAPLER NO.10 (KANGROO)',
    'STAPLER HD 45(KANGROO)',
    'STAPLER HP 45 (PLYER STYLE)',
    'STAPLER PIN NO. 10 (KANGROO)',
    'STAPLER PIN 24/6(KANGROO)',
    'FLIP CHART 20X3025 Sheets',
    'L-FOLDER (SUN)',
    'COBRA FILE 650 NO.',
    'INDEX FILE (INFINITY PLASTIC COATED)',
    'REGISTER HARD BOUND144 PGS',
    'REGISTER HARD BOUND192 PGS',
    'ATTENDENCE REGISTER50 PGS',
    'REYNOLDS TRIMAX',
    'DUMPERS',
    'RIBBON SATIN ROLL',
    'WHITE BOARD DUSTER',
    'DUSTLESS CHALK (KORES)60 NO.',
    'PUNCHING MACHINE (DP52)(KANGROO)',
    'PUNCHING MACHINE (DP600)(KANGROO)',
    'SKETCH PEN STIC 12 SHADES',
    'Painting Brush 7-12 no.',
    'CHART PAPER',
    'BLACK CHART PAPER',
    'OHP MARKER',
}

# Priority caps (used when seeding priority items)
PRIORITY_CAPS = {
    # format: name -> (per_checkout_cap, monthly_cap, threshold, initial_stock)
    'default': (2, 5, 5, 20),
}

def clean_name(n):
    n = str(n).strip()
    n = n.replace('\n', ' ')          # newlines → space before any other processing
    if n.startswith('"') and n.endswith('"'):
        n = n[1:-1]
    n = n.replace('""', '"')
    n = re.sub(r'\s+', ' ', n).strip()
    return n

def clean_unit(u):
    if not u or str(u).strip().lower() in ('nan', ''):
        return 'EA'
    u = str(u).strip()
    mapping = {
        'pc': 'EA', 'PC': 'EA',
        'per pc.': 'EA', 'PER PC.': 'EA',
        'pac': 'PAC', 'Pac': 'PAC',
        'd': 'DAY', 'D': 'DAY',
    }
    return mapping.get(u, u.upper() if len(u) <= 5 else u)

df = pd.read_excel(EXCEL, sheet_name='MIS 2025', header=None)

items = []
seen = set()

for _, row in df.iloc[2:].iterrows():
    raw_name = row[1]
    if pd.isna(raw_name) or str(raw_name).strip() in ('', 'Total'):
        continue
    hsn  = row[0]
    unit = row[2]
    rate = row[3]

    name = clean_name(raw_name)
    unit = clean_unit(unit)
    rate_val = round(float(rate), 4) if not pd.isna(rate) else None
    hsn_s = str(int(float(str(hsn).replace(',','')))) if str(hsn).strip() not in ('nan','') else ''

    if name in seen:
        continue
    seen.add(name)

    priority = name in PRIORITY_NAMES
    cap, monthly, thresh, stock = (2, 5, 5, 10) if not priority else (2, 5, 5, 20)

    items.append({
        'name': name,
        'unit': unit,
        'hsn': hsn_s,
        'rate': rate_val,
        'per_checkout_cap': cap,
        'monthly_cap': monthly,
        'threshold': thresh,
        'initial_stock': stock,
        'priority': priority,
    })

priority_count = sum(1 for i in items if i['priority'])
print(f'Total items: {len(items)},  Priority: {priority_count}')

# Write items.py
out_lines = ['# Auto-generated from Stationery MIS 1 2025.xlsx\n']
out_lines.append('# priority=True  →  enabled for all 35 clusters on fresh seed\n')
out_lines.append('# priority=False →  in catalog but not auto-enabled for any cluster\n\n')
out_lines.append('ITEMS_DATA = [\n')

for it in items:
    out_lines.append(
        f"    {{'name': {repr(it['name'])}, 'unit': {repr(it['unit'])}, "
        f"'hsn': {repr(it['hsn'])}, 'rate': {it['rate']}, "
        f"'per_checkout_cap': {it['per_checkout_cap']}, "
        f"'monthly_cap': {it['monthly_cap']}, "
        f"'threshold': {it['threshold']}, "
        f"'initial_stock': {it['initial_stock']}, "
        f"'priority': {it['priority']}}},\n"
    )

out_lines.append(']\n\n')
out_lines.append('PRIORITY_ITEM_NAMES = {d[\'name\'] for d in ITEMS_DATA if d[\'priority\']}\n')

seed_path = os.path.join(os.path.dirname(__file__), 'seeds/items.py')
with open(seed_path, 'w', encoding='utf-8') as f:
    f.writelines(out_lines)

print(f'Written to {seed_path}')
