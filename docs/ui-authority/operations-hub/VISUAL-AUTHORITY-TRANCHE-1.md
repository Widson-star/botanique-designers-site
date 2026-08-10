# Visual Authority — Implementation Tranche 1

**10 August 2026.** The first deliberate move from admin-generated pages toward the settled
compact product composition.

Primary authority, all frozen and **byte-identical after this tranche**:

- `working-authority/08-daily-site-record-list-working-authority.png`
- `working-authority/09-daily-site-record-detail-working-authority.png`
- `working-authority/12-finance-overview-working-authority.png`
- `working-authority/13-finance-children-working-authority.png`

## Authority precedence

Where an image conflicts with a decision settled after it was frozen, **the settled decision
wins**. The image still governs composition and content. Three such conflicts were live here, and
all three are resolved against the image:

| Image | What it draws | What ships, and why |
| --- | --- | --- |
| 13 | Persistent Finance children in the sidebar | **Not implemented.** PR #94's navigation decision stands: Finance is a top-level domain with in-page departmental navigation. Image 13 still governs what each child contains. |
| 09 | A fourth "Day close-out" step | **Not implemented.** Operational close and financial settlement are distinct, and no day-close action, state or record exists. The rail states the three stages the product genuinely holds. |
| 12 | Money-in, bank balance, expense categories, payroll | **Not implemented.** Botanique has no money-in record, no bank-account record, no company-expense model and no payroll model. A plausible number would be a fabrication. |

## Image 08 — Daily Site Record list

**Implemented.** `src/admin/routes/AdminDailySiteOperations.jsx`.

Matched: page hierarchy and copy; five day counts each with the sites they cover; compact filter
chips; a work-date control; the seven-column record table — project/site with monogram, work date
with "Today", site plan, planned workforce, planned labour cost, status with timing, and a single
next action per row; a record count; the cost-claim hand-off stated once at the foot.

Deliberate deviations:

- **The missing-record band is kept, and outranks the record list.** The image's illustrative data
  has no missing record, which is why its five cards have room for one more. A site with *no*
  record at all is the most urgent thing on the page, so it sits above the table and names each
  site with a link straight to recording it.
- **No per-row overflow menu.** No per-row action has been settled that the row does not already
  offer, and an empty menu is worse than none.
- **No pagination controls.** Record volume does not warrant a pager; the count line is honest and
  the filters do the narrowing.
- **The next-action verb is the reader's verb.** A manager holds no accept or return authority, so
  they see "View record" where the Principal sees "Review record". The image shows one reader.
- **Financial follow-up is one compact line under the status, never a column.** Both dimensions
  are named when both say something — "Partly funded · Reconciliation outstanding" — so one label
  can never conceal the other. The image has no financial column at all.
- **The site monogram is hidden below `xl`.** On a narrower desktop the site's *name* is what the
  reader needs; the decoration yields its width.

## Image 09 — Daily Site Record detail

**Implemented.** `src/admin/routes/AdminDailySiteEntryDetail.jsx`, with the stage derivation in
`src/admin/utils/dailySiteRecordProgress.js`.

Matched: breadcrumb, project title with state and late chips, "Daily Site Record · <date>"
subtitle, the reader's actions at the top right, a progress rail, the authority-to-incur banner, a
three-column panel grid (site activity / planned workforce / site funds), a second row for
recorded-by, reviewed-by and supporting evidence, the financial follow-up area, and history at the
foot with the next step after it.

Deliberate deviations:

- **Three stages, not four.** See the precedence table. There is no day close-out.
- **No "Export record".** No export capability exists, and a button that does nothing is a lie.
- **No record ID chip.** The record's identifier is a UUID; showing raw ids is prohibited.
- **Evidence is a declared status, not thumbnails.** `evidence_status` is an enum; the Hub stores
  no files. The panel says so explicitly rather than implying an attachment.
- **No supervisor or contact fields.** The model holds a crew reference, not a supervisor or a
  phone number. Only the crew reference is shown.
- **History is capped at the four most recent events**, newest first, with a one-press toggle to
  the whole list and a line stating how many there are. Nothing is hidden or summarised away — the
  immutable record stays complete and reachable — but a long-running record must not turn today's
  position into the tail of a dossier.
- **The rail and the funding panel use different wording for the same position**, so a reader
  never has to work out whether they are seeing one fact twice or two facts that agree.

The PR #100 duplicate-claim safeguards are untouched: when the day's own planning cost is already
claimed, "Open existing claim" is primary, the duplicate call-to-action is removed, and "Raise
additional cost" remains available, deliberate and secondary.

## Image 12 — Finance Overview

**Implemented.** `src/admin/routes/AdminFinance.jsx`, with the derivation in
`src/admin/utils/financePortfolio.js`.

Matched: the department title and framing; an in-page area selector in the settled order; a
portfolio money position in the first viewport; a "what needs attention now" area; area cards that
drill through; all five departmental areas named.

Portfolio position — authorised, released, actual expenditure, authorised-not-released, plus the
unaccounted-advance and variance sentences when they apply. Every figure is a fold of the same
`deriveFinancialPosition()` rows that Project Costs and the Daily Site Record already read, so the
Overview cannot disagree with the page a reader drills into. **A release is not expenditure**: an
advance nobody has accounted for contributes zero to actual expenditure, which is what keeps the
outstanding position visible instead of flattering it.

Attention — cost claims awaiting decision, fund requests awaiting decision, approved-but-nothing-
released, advances not accounted for, reconciliations awaiting decision, reconciliations sent
back, and unresolved variance. Each is a count, an amount where one exists, and a link to the
register that owns the decision. **It decides nothing.** There is no Approve, Reject or Decide
control anywhere on Finance; unified Approvals remains the eventual aggregated decision surface.

Deliberate deviations:

- **No money-in, bank balance, expense categories or payroll figures.** See the precedence table.
- **No "recent finance activity" feed.** There is no activity model spanning the department; the
  two real registers each carry their own history, and a feed stitched from two of five areas
  would misrepresent the department.
- **Company Expenses and Staff Compensation are named in a compact strip, not given cards.** They
  are part of the settled architecture, so hiding them makes the department look smaller than it
  is — but they carry no amount, are not selectable, and say plainly that no records, workflow or
  figures exist for them. Drawing an unbuilt area at full card weight is exactly the empty-module
  problem this tranche exists to fix.
- **Zero state is a sentence, not a grid of KES 0.** When no authority has been approved, the
  panel says so and says what would change it.

## Image 13 — Finance children

**Partially implemented**, and deliberately so.

- **Project Costs** — `AdminFinance.jsx` (departmental panel) and `AdminSiteCosts.jsx` (register).
  The panel answers what is approved, what is waiting, what was sent back, and what actually
  moved, then lists the five most recent claims with drill-through. No second ledger.
- **Funding, Payments and Reconciliation** — `AdminFinance.jsx` (departmental panel) and
  `AdminFundRequests.jsx` (register). The canonical name is now used on the visible surface; the
  `/admin/fund-requests` route survives internally, because renaming a URL would break every
  existing drill-through link and grants nothing. Both surfaces state the lifecycle in order —
  awaiting decision, authorised, released, reconciliation outstanding — and never imply that
  approval is release.
- **Company Expenses / Staff Compensation** — architecture only. No schema, no model, no figures.

Custody is presented per release, never per authority. **One authority may carry both a direct
settled payment and an accountable advance**, and both are named side by side. A direct settled
payment never shows an acquittal or a reconciliation debt; an accountable advance always shows its
outstanding position. Before any release, the request's custody *intent* is all there is, and it
is labelled as an intent.

Deliberate deviations:

- **No persistent sidebar children.** See the precedence table.
- **No donut chart, no votehead breakdown, no expense-category split.** Voteheads and expense
  categories have no model.
- **No staff payment records table.** No Staff Compensation model exists.
- **No project or period grouping, and no export, on Project Costs.** Both are larger features
  than this tranche, and neither is required by the existing data to make the page useful.
  Recorded as deferred.

## WhatsApp support

**Implemented.** `src/admin/AdminLayout.jsx`. "Need help? / Contact your system admin" — which
named a person who does not exist — is replaced by "Need help? / Open WhatsApp support", opening
the Botanique WhatsApp thread with the Hub already named. The destination is `CONTACT.whatsapp`
through `waLink()`; no number is written into the Hub, so support can never drift from the number
the public site uses. It appears in both the desktop sidebar and the mobile drawer.

## Not in this tranche

Company Expenses model · Staff Compensation model · unified Approvals · Maintenance · Tools &
Equipment · Project Summary / Reports Centre · Project Templates · People/engagement remediation ·
Project Costs grouping and export · a day-close concept of any kind.

## Stage 6

**Still NOT `ACTIVE_VERIFIED`.** Shipping this tranche is presentation implementation. It is not
BD-FIN-01C hosted verification, and it is not wider Operations Hub completion.
