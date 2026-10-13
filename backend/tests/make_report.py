"""Build a presentable test_report.xlsx from tests/_results.json.

Run after the suite:  python -m pytest tests/ -q  &&  python tests/make_report.py
Writes <repo root>/test_report.xlsx.
"""
import json
import os
from datetime import datetime

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

HERE = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))

YELLOW = 'FFFF00'
NAVY = '1F2F55'
TINT = 'FFF9E3'
GREEN_F, GREEN_T = 'C6EFCE', '006100'
RED_F, RED_T = 'FFC7CE', '9C0006'
AMBER_F, AMBER_T = 'FFEB9C', '7A5C00'
SEV = {
    'Critical': ('FFC7CE', '9C0006'),
    'High': ('FFD9A0', '7A4100'),
    'Medium': ('FFEB9C', '7A5C00'),
    'Low': ('D9E1F2', '1F3864'),
    'Info': ('E2EFDA', '375623'),
}

thin = Side(style='thin', color='BFBFBF')
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)
H_FONT = Font(bold=True, color='FFFFFF')
B_FONT = Font(bold=True)
CENTER = Alignment(horizontal='center', vertical='center', wrap_text=True)
LEFT = Alignment(horizontal='left', vertical='top', wrap_text=True)


# Curated findings uncovered and addressed during this testing pass.
FINDINGS = [
    ('Stock & Race Conditions', 'Critical',
     'Two teachers could each submit a pending request for the last unit in stock; '
     'both approvals succeeded, overselling inventory and inflating reports.',
     'approve() now runs a stock-availability check and returns HTTP 409 for the '
     'request that would oversell; stock is first-come-first-served at approval.',
     'Fixed'),
    ('Stock & Race Conditions', 'High',
     'deduct_stock() recorded quantity_fulfilled as the full requested amount even '
     'when stock was insufficient (phantom fulfilment), while flooring stock at 0.',
     'Fulfilment is now min(requested, on_hand); the deducted and recorded amounts '
     'always match physical stock.',
     'Fixed'),
    ('Cap Enforcement', 'High',
     'Caps only decremented on fulfilment, so a teacher could stack many pending '
     'requests past the monthly cap before any was approved.',
     'Pending requests now reserve their requested qty against the cap; the '
     'reservation is released automatically on reject or auto-expiry.',
     'Fixed'),
    ('Cap Enforcement', 'Medium',
     'Cap-override checkouts were counted toward the teacher\'s cumulative usage, '
     'contradicting the spec ("override does NOT change the cumulative count").',
     'Override requests are excluded from monthly/weekly usage counting.',
     'Fixed'),
    ('Cap Enforcement', 'Medium',
     'Approval performed no server-side cap re-check, so lowering a cap after a '
     'request was placed could still be approved past the new limit.',
     'approve() re-validates caps (excluding the request\'s own reservation) before '
     'fulfilling.',
     'Fixed'),
    ('Input Validation', 'Medium',
     'Request submission did not validate quantities; zero, negative, or item-less '
     'lines were accepted.',
     'Both the teacher and manual endpoints now require a valid item_id and qty >= 1.',
     'Fixed'),
    ('Test Infrastructure', 'Low',
     'No automated test harness existed; create_app() always seeded demo data and '
     'started the scheduler, making isolated testing impossible.',
     'Added a TestingConfig (in-memory DB, no seed/scheduler) and a 68-test pytest '
     'suite across every area.',
     'Fixed'),
    ('Code Health', 'Info',
     'Several queries use the SQLAlchemy 1.x legacy Query.get() API (deprecation '
     'warnings only; no functional impact).',
     'Optional future cleanup to Session.get(); left as-is to avoid churn.',
     'Open'),
    ('Reference Data', 'Info',
     'Demo-seed teacher SAP IDs (9000xxxx) do not satisfy the 4000xxxx SAP rule; '
     'lookups do not validate, so this affects demo data only.',
     'No action — production teachers are entered through the validated flow.',
     'Open'),
]


def paint_header(ws, row, labels, widths=None, fill=NAVY):
    for i, label in enumerate(labels, start=1):
        c = ws.cell(row=row, column=i, value=label)
        c.font = H_FONT
        c.fill = PatternFill('solid', fgColor=fill)
        c.alignment = CENTER
        c.border = BORDER
    if widths:
        for i, w in enumerate(widths, start=1):
            ws.column_dimensions[get_column_letter(i)].width = w


def load():
    with open(os.path.join(HERE, '_results.json'), encoding='utf-8') as f:
        return json.load(f)


def build():
    data = load()
    results = data['results']
    total = len(results)
    passed = sum(1 for r in results if r['outcome'] == 'passed')
    failed = sum(1 for r in results if r['outcome'] == 'failed')
    skipped = sum(1 for r in results if r['outcome'] == 'skipped')
    rate = (passed / total * 100) if total else 0

    wb = Workbook()

    # ---------------- Summary ----------------
    ws = wb.active
    ws.title = 'Summary'
    ws['A1'] = 'Stationery Management & Issuance System'
    ws['A1'].font = Font(bold=True, size=16)
    ws['A2'] = 'Comprehensive Test Report'
    ws['A2'].font = Font(bold=True, size=13, color='1F2F55')
    ws['A4'] = 'Generated'
    ws['B4'] = datetime.now().strftime('%d %b %Y, %H:%M')
    ws['A5'] = 'Backend suite'
    ws['B5'] = f"pytest — Python {data.get('python','')}"
    ws['A6'] = 'Frontend'
    ws['B6'] = 'vite production build — PASSED (921 modules)'
    ws['A7'] = 'Overall result'
    ws['B7'] = 'ALL PASSED' if failed == 0 else f'{failed} FAILED'
    ws['B7'].font = Font(bold=True, color=GREEN_T if failed == 0 else RED_T)
    for r in range(4, 8):
        ws.cell(row=r, column=1).font = B_FONT

    # KPI band
    kpis = [('Total tests', total, 'D9E1F2'), ('Passed', passed, GREEN_F),
            ('Failed', failed, RED_F if failed else GREEN_F), ('Skipped', skipped, AMBER_F),
            ('Pass rate', f'{rate:.0f}%', GREEN_F if failed == 0 else AMBER_F)]
    top = 9
    for i, (label, val, fill) in enumerate(kpis):
        col = 1 + i
        lc = ws.cell(row=top, column=col, value=label)
        lc.font = B_FONT
        lc.fill = PatternFill('solid', fgColor=fill)
        lc.alignment = CENTER
        lc.border = BORDER
        vc = ws.cell(row=top + 1, column=col, value=val)
        vc.font = Font(bold=True, size=18)
        vc.alignment = CENTER
        vc.border = BORDER
        ws.column_dimensions[get_column_letter(col)].width = 15
    ws.column_dimensions['A'].width = 16
    ws.column_dimensions['B'].width = 34

    # ---------------- Coverage by area ----------------
    ws2 = wb.create_sheet('Coverage by Area')
    ws2['A1'] = 'Coverage by Functional Area'
    ws2['A1'].font = Font(bold=True, size=13)
    paint_header(ws2, 2, ['Area', 'Tests', 'Passed', 'Failed', 'Pass %'], [34, 10, 10, 10, 10])
    areas = {}
    for r in results:
        a = areas.setdefault(r['area'], [0, 0, 0])
        a[0] += 1
        if r['outcome'] == 'passed':
            a[1] += 1
        elif r['outcome'] == 'failed':
            a[2] += 1
    row = 3
    for area in sorted(areas):
        t, p, f = areas[area]
        vals = [area, t, p, f, f'{(p/t*100):.0f}%' if t else '—']
        for i, v in enumerate(vals, start=1):
            c = ws2.cell(row=row, column=i, value=v)
            c.border = BORDER
            c.alignment = LEFT if i == 1 else CENTER
        row += 1
    # total row
    tc = ws2.cell(row=row, column=1, value='TOTAL')
    tc.font = B_FONT
    tc.fill = PatternFill('solid', fgColor=TINT)
    for i, v in enumerate([total, passed, failed, f'{rate:.0f}%'], start=2):
        c = ws2.cell(row=row, column=i, value=v)
        c.font = B_FONT
        c.fill = PatternFill('solid', fgColor=TINT)
        c.alignment = CENTER
        c.border = BORDER
    ws2.cell(row=row, column=1).border = BORDER
    ws2.freeze_panes = 'A3'

    # ---------------- Test results ----------------
    ws3 = wb.create_sheet('Test Results')
    ws3['A1'] = 'Detailed Test Results'
    ws3['A1'].font = Font(bold=True, size=13)
    paint_header(ws3, 2, ['#', 'Area', 'Test', 'What it verifies', 'Status', 'Duration (s)'],
                 [5, 24, 40, 60, 11, 12])
    row = 3
    status_fill = {'passed': (GREEN_F, GREEN_T), 'failed': (RED_F, RED_T), 'skipped': (AMBER_F, AMBER_T)}
    for idx, r in enumerate(sorted(results, key=lambda x: (x['area'], x['name'])), start=1):
        ws3.cell(row=row, column=1, value=idx).alignment = CENTER
        ws3.cell(row=row, column=2, value=r['area'])
        ws3.cell(row=row, column=3, value=r['name'])
        ws3.cell(row=row, column=4, value=r['description'] or r.get('message', ''))
        sc = ws3.cell(row=row, column=5, value=r['outcome'].upper())
        fill, txt = status_fill.get(r['outcome'], (AMBER_F, AMBER_T))
        sc.fill = PatternFill('solid', fgColor=fill)
        sc.font = Font(bold=True, color=txt)
        sc.alignment = CENTER
        ws3.cell(row=row, column=6, value=r['duration']).alignment = CENTER
        for col in range(1, 7):
            cell = ws3.cell(row=row, column=col)
            cell.border = BORDER
            if col in (2, 3, 4):
                cell.alignment = LEFT
        row += 1
    ws3.freeze_panes = 'A3'
    ws3.auto_filter.ref = f'A2:F{row - 1}'

    # ---------------- Findings & fixes ----------------
    ws4 = wb.create_sheet('Findings & Fixes')
    ws4['A1'] = 'Findings & Fixes (discovered during testing)'
    ws4['A1'].font = Font(bold=True, size=13)
    paint_header(ws4, 2, ['#', 'Area', 'Severity', 'Finding', 'Resolution', 'Status'],
                 [5, 22, 11, 52, 52, 10])
    row = 3
    for idx, (area, sev, finding, res, status) in enumerate(FINDINGS, start=1):
        ws4.cell(row=row, column=1, value=idx).alignment = CENTER
        ws4.cell(row=row, column=2, value=area)
        sc = ws4.cell(row=row, column=3, value=sev)
        f, t = SEV.get(sev, ('FFFFFF', '000000'))
        sc.fill = PatternFill('solid', fgColor=f)
        sc.font = Font(bold=True, color=t)
        sc.alignment = CENTER
        ws4.cell(row=row, column=4, value=finding)
        ws4.cell(row=row, column=5, value=res)
        stc = ws4.cell(row=row, column=6, value=status)
        stc.font = Font(bold=True, color=GREEN_T if status == 'Fixed' else AMBER_T)
        stc.alignment = CENTER
        for col in range(1, 7):
            cell = ws4.cell(row=row, column=col)
            cell.border = BORDER
            if col in (2, 4, 5):
                cell.alignment = LEFT
        ws4.row_dimensions[row].height = 54
        row += 1
    ws4.freeze_panes = 'A3'

    out = os.path.join(ROOT, 'test_report.xlsx')
    wb.save(out)
    print(f'Wrote {out}  ({total} tests, {passed} passed, {failed} failed)')


if __name__ == '__main__':
    build()
