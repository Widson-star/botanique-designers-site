# Operating Model Authority — Decision Record

Founder-approved architecture. Supersedes the flat Fund-Requests-only Finance navigation and the
People-under-More/Approvals-under-Operations grouping delivered by Stage 6 (PR #92, merge commit
`e257917`). **NOT IMPLEMENTATION AUTHORITY** — see `README.md`.

## Identity

- Company identity: the official, unaltered `public/botanique.png` asset — the same file already
  used on the public site (`Header.jsx`, `Footer.jsx`), predating PR #92 (committed `cca948a`,
  13 Jun 2026).
- Product identity: "Operations Hub", subordinate to the company mark, never a substitute for it.
- No reconstructed/retyped "BOTANIQUE DESIGNERS" text beside the badge — the badge already
  contains the full wordmark.
- No invented compact logo, monogram, or approximation of the official mark, at any size.
- No alternate name for the company or product ("Botanique Hub", "Botanique Operations").

## Desktop shell

- Collapsed rail: **104px** (supersedes the 64px rail shipped in Stage 6), badge rendered at
  60×74px (height×width, derived from the asset's 1440:1163 ratio, never stretched or cropped),
  96px brand-zone height.
- Expanded sidebar: the existing 235px-class width, unchanged.
- Reference: `01-identity-expanded.png`, `02-identity-collapsed-104px.png`.

## Navigation domains

| Domain | Children | Notes |
| --- | --- | --- |
| Dashboard | — | Direct destination, unchanged |
| Projects | Project Register, Project Proposals | Renames "Projects → Projects, Project Intakes" |
| Operations | Daily Site Record, People, *(future)* Maintenance, *(future)* Tools and Equipment | People moves out of "More"; Site Costs and Approvals move out of Operations |
| Finance | one shell destination — see below | Supersedes the single-child "Finance → Fund Requests" |
| Approvals | — | Standalone top-level aggregation/prioritisation/routing centre; supersedes "Operations → Approvals" |
| Reports | Project Summary now, Reports Centre later | Unchanged from Stage 6 |
| ~~More~~ | — | Removed — no remaining purpose once People moves under Operations |

## Finance

One stable shell destination with an in-page, one-selected-area-at-a-time landing (Option B —
supersedes the five-persistent-sidebar-child Option A):

- Overview
- Project Costs
- Company Expenses (Administration and Management, Subscriptions, Software/Digital Services,
  Advertising and Marketing, other controlled company overhead — real example: ~GBP 34/month for
  two Botanique company email accounts; no invented KES conversion)
- Staff Compensation (general architecture; must give Martine Lotom a clear personal payment
  position, and remain durable for Lincoln Waweru, Kefa Nyamari Ochenge, and future staff;
  distinguishes personal compensation, casual-worker money administered by a staff member,
  purchases made by a staff member, reimbursements, advances, and other compensation — `LEM`
  is not assumed to mean Martine without separate confirmation)
- Funding, Payments and Reconciliation (canonical name; "Funding & Recon." is a display-only
  compact abbreviation for the mobile chip, never a competing name; "Fund Requests" does not
  return as the principal visible architecture)

Hierarchy: Finance → Finance area → cost class (project/company where relevant) → controlled
votehead → optional subcategory only where useful → transaction/obligation → approval →
payment/release → reconciliation → reporting. Finance owns the financial record; Operations may
originate evidence and operational needs; Approvals aggregates decisions; Reports consumes
authorised summaries. No duplicate ledgers.

Mobile area selection: wrapped chips (all five areas visible, no horizontal scroll, no clipped
labels, one selected at a time — wraps to three short rows at 375–400px given these label
lengths). A compact dropdown/sheet alternative — a single-row trigger that opens a full-width
list of the five areas on tap — was considered and rejected in favour of the chips, because the
chips show the full hierarchy with zero interaction while the sheet still costs one tap to see
every area. The horizontally-scrolling selector tried earlier is withdrawn outright: it clipped
labels and required discovering the scroll.

Finance-to-inventory handoff: Finance records the commercial purchase once (supplier, quantity,
cost, currency, evidence, approval, payment); Operations/Tools and Equipment receives the
resulting inventory records without re-entering the same commercial information. One Finance
acquisition may create multiple inventory units. Operations owns asset/stock identity, location,
custodian, condition, assignment, transfer, return, loss/damage, stock-taking.

Reference: `03-finance-desktop-landing.png`, `04`–`05-finance-mobile-selector-{375,400}.png`,
`06`–`07-finance-mobile-page-{375,400}.png` (the mobile page also demonstrates the Compact
Presentation Standard applied to a Finance area).

## Approvals

Standalone top-level surface. It aggregates, prioritises and routes decisions; it is not a
ledger and does not replace the authoritative records or immutable audit trail of the source
modules (Finance, Daily Site Record, Project Proposals, etc.).

## Reports

Project Summary remains the only delivered report, corrected to the compact direction already
established (sections with no record for the project are omitted entirely rather than shown
empty; repeated explanatory paragraphs reduced to one line per card). The final, category-based
Reports Centre remains deferred to a later stage.

## Compact Presentation Standard

Recorded in full at `COMPACT-PRESENTATION-STANDARD.md` in this directory. Governs every domain
listed above: position → attention → selected context → relevant high-value information →
drill-through, on the first useful viewport, with no unbounded primary tables, no endless pages,
no permanent full-weight empty sections, and no card-per-metric sprawl. Applies identically at
375–400px mobile widths.

## Deferred data-hygiene questions (not decided here, no data touched)

These were surfaced during read-only production audits and are recorded so they are not
forgotten. None has been acted on:

- 2 production `projects` rows identified as fixtures.
- 3 `project_intake_requests` rows identified as fixtures.
- All 5 current `approval_requests` rows identified as fixtures.
- An inactive `ZZ Verification Record — Stage 5` record.
- A `people`/`profiles` name-order inconsistency for Martine ("Lotom Martine" vs. "Martine
  Lotom") — requires a controlled correction path, not a direct production edit.
- The identity behind `LEM` in existing records is unresolved and is not assumed to be Martine
  without separate Founder confirmation.

## What remains open

Nothing in this architecture. Every item above is Founder-settled. The only remaining gates
before implementation are (1) this authority PR being reviewed and merged, and (2) a separate,
explicit implementation authorisation, as was required for Stage 6.
