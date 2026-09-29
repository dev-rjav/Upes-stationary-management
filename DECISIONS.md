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
| D7 | Teacher profile = SAP ID + Name + Cluster + Designation + Employee type | No school field; no login; expanded 2026-09-29 when D-T1 resolved | 2026-09-29 |
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
| D18 | Caps are per-item, monthly AND weekly (D-W1) | Matches scaffold (Item model, ItemSelector); both enforced server-side per D8 | 2026-09-29 |
| D19 | One university-wide request URL (D-Q1) | Single /request page, one queue; no kiosk params in v1 | 2026-09-29 |
| D20 | Opening stock via bulk Excel import (D-S1) | Reuses the vendor stock-in flow (fuzzy match + alias learning) for the initial count | 2026-09-29 |
| D21 | In-app notifications only (D-N1) | Dashboard alerts for low stock / overrides; no email or WhatsApp infra | 2026-09-29 |
| D22 | Report downloads: CSV only (D-R1) | Admin reformatting happens in Excel; drops reportlab from the stack | 2026-09-29 |
| D23 | Migrate LAST MONTH of historical issuance only | Full-history migration still TBD; migration script takes a date range so it can be re-run wider later | 2026-09-29 |

---

## Pending Decisions

> These must be resolved before the relevant module can be built.
> Full detail and confirmation table → `PENDING_CONFIRMATIONS.md`

| # | Decision Needed | Blocks |
|---|---|---|
| D-C1 | Confirm / map / drop the 12 unconfirmed clusters (U1–U15 in PENDING_CONFIRMATIONS.md). Waiting on historical data files to be dropped into the project folder, then the table will be re-derived and confirmed. | Cluster seed, teacher QR form dropdown, all cluster-based reports, D23 migration |

---

## Open Questions (not yet decisions)

- Should the system support bulk SAP ID import for pre-populating the teacher table before go-live?
- Is there a need for cluster-head visibility (read-only view of their cluster's usage) in a future phase?
- (Historical data migration resolved as D23: last month only for now; full history remains a future decision.)
