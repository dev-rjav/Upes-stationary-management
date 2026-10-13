import io
from thefuzz import fuzz


def parse_excel(file_stream, filename='upload.xlsx'):
    try:
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(file_stream.read()), data_only=True)
        ws = wb.active
        rows_raw = list(ws.iter_rows(values_only=True))
    except Exception as e:
        raise ValueError(f'Could not read Excel file: {e}')

    # Auto-detect header row (scan first 5 rows)
    header_idx = None
    header_map = {}
    KNOWN_HEADERS = {
        'item': ['item', 'description', 'name', 'item name', 'item description', 'product', 'particulars'],
        'qty': ['qty', 'quantity', 'units', 'nos', 'no.', 'pcs', 'pieces'],
        'rate': ['rate', 'price', 'unit price', 'rate/unit', 'unit rate', 'mrp'],
        'hsn': ['hsn', 'hsn code', 'hsn/sac'],
        'date': ['date', 'receipt date', 'delivery date'],
        'unit': ['unit', 'uom', 'unit of measure'],
    }
    for i, row in enumerate(rows_raw[:5]):
        row_lower = [str(c).lower().strip() if c else '' for c in row]
        matched = {}
        for field, synonyms in KNOWN_HEADERS.items():
            for j, cell in enumerate(row_lower):
                if any(cell == s for s in synonyms):
                    matched[field] = j
                    break
        if 'item' in matched and ('qty' in matched or 'rate' in matched):
            header_idx = i
            header_map = matched
            break

    if header_idx is None:
        raise ValueError('Could not find a valid header row. Expected columns: Item, Qty, Rate')

    data_rows = rows_raw[header_idx + 1:]
    return _match_items(data_rows, header_map)


def _match_items(rows, header_map):
    from ..models import StationaryItem, ItemAlias
    items = StationaryItem.query.all()
    aliases = ItemAlias.query.all()
    alias_map = {a.alias.lower(): a.item_id for a in aliases}

    results = []
    for row in rows:
        if not any(row):
            continue

        vendor_name = str(row[header_map['item']]).strip() if 'item' in header_map and row[header_map['item']] else ''
        if not vendor_name or vendor_name.lower() in ('none', 'nan', ''):
            continue

        qty = _safe_int(row[header_map['qty']] if 'qty' in header_map else None) or 0
        rate = _safe_float(row[header_map['rate']] if 'rate' in header_map else None) or 0.0
        hsn = str(row[header_map['hsn']]).strip() if 'hsn' in header_map and row[header_map['hsn']] else ''

        # Check exact alias match first
        vendor_lower = vendor_name.lower()
        if vendor_lower in alias_map:
            item_id = alias_map[vendor_lower]
            item = next((i for i in items if i.id == item_id), None)
            results.append({
                'vendor_name': vendor_name,
                'matched_item_id': item_id,
                'matched_item_name': item.name if item else '',
                'confidence': 100,
                'status': 'matched',
                'qty': qty,
                'rate': rate,
                'hsn': hsn,
            })
            continue

        # Fuzzy match
        best_score = 0
        best_item = None
        for item in items:
            score = fuzz.token_sort_ratio(vendor_lower, item.name.lower())
            if score > best_score:
                best_score = score
                best_item = item
            # Also check aliases of this item
            for a in aliases:
                if a.item_id == item.id:
                    s2 = fuzz.token_sort_ratio(vendor_lower, a.alias.lower())
                    if s2 > best_score:
                        best_score = s2
                        best_item = item

        if best_score >= 75:
            status = 'matched'
        elif best_score >= 60:
            status = 'review'
        else:
            status = 'unrecognised'

        results.append({
            'vendor_name': vendor_name,
            'matched_item_id': best_item.id if best_item else None,
            'matched_item_name': best_item.name if best_item else '',
            'confidence': best_score,
            'status': status,
            'qty': qty,
            'rate': rate,
            'hsn': hsn,
        })

    return results


def _safe_int(val):
    try:
        return int(float(str(val).replace(',', '')))
    except (ValueError, TypeError):
        return None


def _safe_float(val):
    try:
        return float(str(val).replace(',', ''))
    except (ValueError, TypeError):
        return None
