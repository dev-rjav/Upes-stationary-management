# UPES Stationery Management

Digitizes the university stationery issue process: teachers order from a phone kiosk (no login — SAP ID only), the reception desk fulfills requests against tracked stock, and caps/aliases/reports keep it honest.

**Status:** working vertical slice + P0/P1/P2 audit fixes. See `DECISIONS.md` (locked product decisions D1–D23), `AUDIT-2026-09-29.md` (implementation audit), and `PENDING_CONFIRMATIONS.md` (items needing sign-off: cluster list, risky aliases, unmatched items).

## Stack

- **Backend:** Python 3.14, Flask 3, Flask-SQLAlchemy, SQLite (zero-infra), Flask-Login sessions, thefuzz (vendor-name matching), openpyxl (Excel)
- **Frontend:** React 18 (plain JS), Vite, react-router, axios, recharts
- **No build step for the backend.** Frontend uses Vite's dev server with an `/api` proxy.

## Run it (development)

```bash
# 1. Backend (port 5000)
cd backend
pip install -r requirements.txt
python run.py            # http://127.0.0.1:5000  (auto-reloads on change)

# 2. Frontend (port 5173, proxies /api -> 5000)
cd frontend
npm install
npm run dev              # http://localhost:5173
```

First boot auto-creates `backend/stationary.db` and seeds it **from `data/extracted.json`**:
the HSN item catalog, canonical clusters, and the migrated last-month issuance (as fulfilled
requests). That JSON is produced by the extractor:

```bash
python data/extract.py            # default: latest complete month in the Excel files
python data/extract.py 2025-06    # or pin a specific month
```

The three source workbooks live in `data/` (gitignored): faculty issuance, MIS HSN catalog,
departmental expenditure. **To re-seed from scratch:** stop the backend, delete `backend/stationary.db`, restart.

## URLs & accounts

| Where | Who | Notes |
|---|---|---|
| `http://localhost:5173/request` | Teachers (kiosk / QR target) | No login. First use: SAP ID + name + cluster. |
| `http://localhost:5173/login` | Reception desk | `demo` / `demo123` (seeded) |
| `http://127.0.0.1:5000/` | API root | `/api/…`, `GET /healthz` |

## Configuration

`backend/config.py` — `DevelopmentConfig` (default) and a stub `ProductionConfig`.
`SECRET_KEY` and `DATABASE_URL` come from the environment (see `.env.example`); the dev
fallbacks are safe for local work only.

## Operating notes (the decisions that matter day-to-day)

- **Caps** are per-item, monthly + weekly, enforced server-side, counted from *fulfilled* requests only. Pending requests consume nothing.
- **Stock moves on fulfill, not on submit.** Over-issuing is refused (409, all-or-nothing).
- **Rates freeze at stock-in** (FIFO batch), so reports show real purchase cost.
- **Returns** raise stock again; `consumed = issued − returned`.
- **Cap overrides** are receptionist-created with a mandatory reason and never consume the teacher's budget.
- **Vendor Excel** (Item / Qty / Rate columns) is fuzzy-matched; matches are learned as aliases so the same file imports cleanly next month.
- Reports download as **CSV only** (D22).

## Known gaps (tracked in AUDIT-2026-09-29.md §7)

Cluster-head/Dean approval roles, department-expense notification trigger, SAP/Phone→ID
integration, guest role — all blocked on the clarification questions in
`PENDING_CONFIRMATIONS.md` / audit §9. Pagination, contrast, 401s, reject-reopen, and the
notification bell are done (P2).