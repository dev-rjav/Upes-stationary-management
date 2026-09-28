# Decisions Log

Tracks every architectural and product decision made for this project.
Format: decision → rationale → date locked.

---

## Locked Decisions

| # | Decision | Rationale | Locked |
|---|---|---|---|
| D1 | React (JavaScript) for frontend | No TypeScript overhead; faster iteration for small team | 2026-09-29 |
| D2 | Flask (Python) for backend | Lightweight, easy SQLAlchemy integration, team familiarity | 2026-09-29 |
| D3 | SQLite via SQLAlchemy | University-scale load; single-server deployment; no infra complexity | 2026-09-29 |
| D4 | Teachers are unauthenticated | Minimal friction policy — SAP ID is the only identity token at checkout | 2026-09-29 |
| D5 | Receptionist-only login (session-based) | Only one privileged role; simple cookie sessions sufficient, no JWT needed | 2026-09-29 |
| D6 | Multiple receptionist accounts supported | More than one receptionist may operate the system | 2026-09-29 |
| D7 | Teacher profile = SAP ID + Name + Cluster only | No school field; no login; no designation (pending D-T1) | 2026-09-29 |
| D8 | Cap enforcement is server-side (source of truth) | Frontend shows remaining allowance for UX; backend validates before saving | 2026-09-29 |
| D9 | Cap counted from fulfilled requests only | Pending requests do not consume cap allowance | 2026-09-29 |
| D10 | Stock deducted only on approval, not on submission | Prevents phantom deductions for requests that are never collected | 2026-09-29 |
| D11 | Rate stored at time of stock-in, not current rate | Historical cost reports must reflect actual purchase price, not today's rate | 2026-09-29 |
| D12 | Cap override requires receptionist-created request | Teacher cannot self-override; receptionist creates + logs reason; cluster head approval is offline/verbal | 2026-09-29 |
| D13 | Cap override does NOT consume cap budget | Override is an exception; teacher's monthly/weekly counter is unaffected | 2026-09-29 |
| D14 | Vendor Excel stock-in uses fuzzy matching + alias learning | Vendors use inconsistent names; matched aliases persist so future imports auto-resolve | 2026-09-29 |
| D15 | 35 canonical clusters seeded from Departmental Expenditure file | Most authoritative source found in existing records | 2026-09-29 |
| D16 | ~60 canonical items with alias table | 258 spelling variants in historical records collapsed; aliases stored in DB | 2026-09-29 |
| D17 | Free-text department entry NOT allowed | Dropdown enforced to prevent the 118-variant problem seen in historical data | 2026-09-29 |

---

## Pending Decisions

> These must be resolved before the relevant module can be built.
> Full detail and confirmation table → `PENDING_CONFIRMATIONS.md`

| # | Decision Needed | Blocks |
|---|---|---|
| D-C1 | Confirm / map / drop the 12 unconfirmed clusters (U1–U15 in PENDING_CONFIRMATIONS.md) | Cluster seed, teacher QR form dropdown, all cluster-based reports |
| D-T1 | Teacher fields beyond SAP ID + Name + Cluster (designation, employee type?) | Teacher model, request display |
| D-N1 | Notification delivery method (in-app / email / WhatsApp) | notifications.py, low-stock alert |
| D-R1 | Report download format (CSV / PDF / both) | report_service.py, Reports page |
| D-Q1 | QR code strategy (one university-wide URL vs per-kiosk) | RequestForm page URL structure |
| D-W1 | Weekly cap required? Per-item or total budget? | cap_service.py, ItemSelector, Items management page |
| D-S1 | Opening stock entry method (manual receptionist entry vs bulk import) | Stock page, StockIn flow at go-live |

---

## Open Questions (not yet decisions)

- Should the system support bulk SAP ID import for pre-populating the teacher table before go-live?
- Should historical issuance data from the Excel files be migrated into the new system, or start fresh?
- Is there a need for cluster-head visibility (read-only view of their cluster's usage) in a future phase?
