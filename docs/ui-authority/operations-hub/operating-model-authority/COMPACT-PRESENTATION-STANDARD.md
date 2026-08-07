# Operations Hub — Compact Presentation Standard

**Founder-approved presentation authority. NOT IMPLEMENTATION AUTHORITY** — approval of this
standard and the operating-model architecture does not by itself authorise code, database,
branch, PR or deployment changes; a separate implementation authorisation is required, as it was
for Stage 6.

This is the governing presentation rule for every domain in the approved operating model. The
committed visual authority in `docs/ui-authority/operations-hub/01`–`04`, `README.md`, and
`stage-6-navigation-authority/` remains controlling for hierarchy, density, spacing, card rhythm,
restrained colour, drill-through and compactness. This document extends that same discipline to
every domain the operating model covers.

## Core rule

The default page provides understanding, not the full database. The first useful viewport must
answer, in order:

1. What is the current position?
2. What needs attention?
3. What are the important categories/states?
4. What is the next relevant action?
5. Where can the user drill for detail?

Never render every available record or metric by default.

## Information hierarchy (default pattern)

1. Context / identity.
2. Compact position summary.
3. Needs attention / actions.
4. Selected category, area, project, person, period or state.
5. A small amount of relevant recent/high-value content.
6. Drill-through.

Detailed historical/register data is always secondary, never the primary experience.

## One selected context at a time

Where a domain contains multiple large areas — a Finance area, a report, a project, a person, a
votehead, a period, an approval state — select one and show it, rather than stacking every area
vertically. This extends the one-selected-view-at-a-time principle already used by the Reports
Centre and Finance.

## No unbounded primary tables

Large record sets must never render as an unbounded table on the primary landing page. Use, as
appropriate: compact recent rows, pending/action rows, pagination, controlled filters, a selected
project/category, "View all," or drill-through to a dedicated register. Tables remain valid as
the clearest secondary register format — they must not become the product's default visual
language.

## No endless pages

Primary landing pages must not grow indefinitely as records accumulate. Historical records, full
ledgers and archives use pagination, date range, project filter, category filter, status filter,
person/custodian filter, or another controlled selection — never simply a taller page.

## Empty states

Do not allocate a large permanent section to unavailable or empty data. If a section has no
meaningful data: suppress it where safe, or show a compact empty state only where user action is
relevant. Empty information never carries the same visual weight as actionable information.

## Card discipline

Do not generate one card per metric simply because the data exists. Every card must have a clear
decision purpose. Avoid: many equal-weight statistic cards, repeated bordered rectangles, generic
auto-generated summaries, and duplicated metrics across sections. Use hierarchy and grouping
instead.

## Domain application

**Dashboard** — already the reference: position, due today, projects needing attention, one
button. No change required.

**Projects / Project Register** — portfolio position, projects requiring attention, compact
filters, a curated/recent list, drill-through. Never a default massive wide spreadsheet.

**Project Proposals** — awaiting Principal decision, drafts/actions relevant to the current user,
recently decided; full history is secondary.

**Daily Site Record** — today; missing/late/action-required; current project site records;
crew/plan/evidence state; open record. Historical daily records are never one endless page.

**People** — current position, attention items where relevant, compact search/filter, current
people list. Person detail uses curated sections/internal navigation, not an unlimited vertical
dossier.

**Maintenance (future)** — active engagements, visits due, overdue/issue items, current
assignments, compact project/client context. Historical visits are drill-through.

**Tools and Equipment (future)** — controlled asset/stock position, assigned items,
missing/overdue returns, damaged/repair items, stock-taking due, location/custodian summaries.
Full inventory is a secondary register with filters and drill-through.

**Finance (every area)** — 1) financial position, 2) needs attention, 3) state/progression,
4) relevant voteheads/categories, 5) a small recent/high-value record set, 6) drill-through.
Never `Finance area → raw transaction table` as the primary experience.

- **Project Costs** — position; awaiting decision/payment/reconciliation; project/category
  breakdown; controlled voteheads; recent or exceptional records. Full cost ledger is secondary.
- **Company Expenses** — company-cost position; upcoming recurring obligations; subscriptions;
  advertising/marketing position; administration/management costs needing attention;
  recent/exceptional items. Full expense ledger is secondary.
- **Staff Compensation** — compensation position; outstanding balances; payments due;
  advances/reimbursements; people needing attention; then select a person (e.g. Martine Lotom)
  for their detailed personal position and payment history. Never every person's full payment
  history on one page.
- **Funding, Payments and Reconciliation** — needs funding; approved for payment; paid awaiting
  confirmation/reconciliation; reconciliation overdue; recently closed. Historical completed
  transactions are secondary.

**Approvals** — needs your decision; urgent/overdue; relevant type/project/person/department;
concise evidence state; Review action. Recently decided may appear compactly. Complete decision
history belongs behind History / View all / filters — never an undifferentiated table of every
approval.

**Project Summary** — stays a summary: project identity/status; needs attention; selected
high-value operational summary; selected financial summary; key approval position; recent
activity/drill-through. Never the long dossier.

**Final Reports Centre** — `report category → selected report → selected project/period/context`,
one report at a time. Never every report category stacked vertically.

## Mobile (375–400px)

The same hierarchy applies. Mobile does not solve desktop density by stacking every card,
exposing every row, or creating enormous scroll pages. Use selected context, compact summaries,
progressive disclosure, drill-through, and pagination/load-more only in secondary registers. No
primary navigation may require horizontal scrolling to discover — this is the specific defect the
withdrawn Finance selector treatment introduced, and the reason the wrapped-chip mobile Finance
selector is approved instead.

## What this standard does not do

It authorises no unavailable data or functionality, and no code, database, branch, PR or
deployment change on its own.

## Illustrative example — `08-illustrative-compact-vs-machine-generated.png`

One representative comparison: a rejected long, machine-generated page (repeated equal-weight
cards stacked without end) against the approved pattern (position → attention → selected context
→ drill-through), built from the approved preferred mobile Finance view. Its layout, not its
illustrative Finance figures, is the authority — see the sample-data notice in `README.md`.
