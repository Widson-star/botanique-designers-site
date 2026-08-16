# Staff Pay — Working Visual Authority

**Date:** 16 August 2026  
**Status:** FOUNDER APPROVED — USE AS IS FOR CURRENT IMPLEMENTATION  
**Scope:** Finance → Staff Pay  
**Technical continuity:** existing `/admin/finance/staff-compensation` route, database tables, RPCs and internal identifiers may retain `staff_compensation` naming. The Founder amendment is to the visible product language and operating presentation, not a risky schema rename.

## Authority

The Founder approved the Staff Pay mockup generated and reviewed in the 16 August 2026 Operations Hub working session and instructed that it be implemented **as it is**, with refinements deferred until the wider Hub is operational.

The mockup was initially labelled Staff Compensation. The Founder subsequently replaced the visible name with **Staff Pay** because the ordinary record represents money earned or otherwise due to a staff member, not a generic notion of compensation. Where the underlying `compensation_type` value is `compensation`, the visible type is **Pay**.

This authority does not reopen any other committed Operations Hub PNG or module.

## Founder amendment — icons and Hub colour rule

The approved mockup remains authoritative for composition, spacing, hierarchy, register structure, support panels and icon placement, subject to these explicit amendments:

- icon forms follow the approved mockup as closely as the shared Hub icon system permits;
- `Outstanding` uses the balance/pie-style icon;
- `Awaiting decision` uses the people/group icon with a distinct decision treatment;
- `Needs attention` uses a bell, not a warning triangle;
- `Part-paid` uses the balance/pie-style icon;
- Filters use a recognisable filter glyph;
- **amber is prohibited throughout the Botanique Designers Operations Hub**; amber visible in any earlier authority image is superseded;
- waiting/pending/outstanding states use restrained cool blue or blue-grey;
- people/decision emphasis may use restrained violet;
- stone/grey is used for neutral, draft, inactive or unknown states;
- green is used for approved/paid/settled positive states;
- red is reserved for genuine errors, rejection, cancellation and destructive actions.

This is a Hub-wide presentation rule, not a Staff Pay-only exception.

## Founder amendment — Staff Pay operating presentation

The live area must use the following visible language and behavior:

- navigation and page title: **Staff Pay**;
- primary action: **New staff pay**;
- ordinary earned-work type: **Pay**;
- other legitimate types may remain **Allowance**, **Bonus**, and **Other**;
- a person is displayed by **full name only** in the Staff Pay register and recent-payment activity; do not show initials alongside the same full name;
- the register has a Project Costs-style **Action** control rather than leaving the user to infer the next step;
- each action menu surfaces only valid next actions for that record:
  - historical approved record with unknown payment history → `Resolve payment history`;
  - approved record with a known outstanding balance → `Record payment`;
  - awaiting Principal decision → `Review in Approvals`;
  - Manager-owned draft → `Edit and submit`;
  - Manager-owned amendment-requested record → `Amend and resubmit`;
  - all records → `View staff pay`;
  - migrated historical records may additionally expose `View original Project Cost` for audit;
- action links may deep-link to the relevant section inside the Staff Pay detail screen; payments remain inside the record and no standalone Payments destination is created.

## Desktop composition

The live Staff Pay screen follows the approved mockup composition:

1. **Header**
   - `FINANCE`
   - `Staff Pay`
   - concise explanatory line: amounts are person-based; Project is optional context; approval and payment remain separate
   - primary action `New staff pay`
   - secondary action `Open Approvals`

2. **Compact position cards**
   - Approved
   - Paid
   - Outstanding
   - Awaiting decision
   - restrained height; financial position is visible without becoming a card-heavy dashboard

3. **Register controls**
   - Person → defaults to `All people`
   - Status → defaults to `All statuses`
   - Project (optional) → defaults to `All projects`
   - compact reset/filter actions only where useful

4. **Primary register**
   - central working surface, not a decorative table
   - columns: `# · Date · Person · Type · Project · Status · Total · Paid · Balance · Action`
   - Person is primary identity and is shown by full name only
   - Project is optional context and uses `—` when absent
   - status chips are restrained
   - payment values come only from Staff Pay payment truth
   - imported historical records whose payment history is not known show `—` for Paid and Balance rather than falsely showing KES 0 or the full approved amount as outstanding

5. **Right-side support rail**
   - `Needs attention`
     - awaiting Principal decision
     - part-paid staff pay
     - drafts pending submission
     - imported payment history requiring confirmation where applicable
   - `Recent payment activity`
     - real Staff Pay payment records only
   - no fabricated sample rows in production

6. **Responsive behavior**
   - desktop uses register + support rail
   - 375–400px uses progressive disclosure/cards and must not require horizontal page scrolling

## Operating-model rulings

- `New staff pay` is available to an authorised Manager and to the Principal.
- Manager-created Staff Pay follows request → Approvals decision.
- Principal-created Staff Pay is a direct Principal authorisation of the amount due; it does **not** record payment.
- Direct Principal authorisation remains explicitly audited.
- Approval/authorisation and payment remain separate truths.
- Payments remain inside the Staff Pay record.
- Staff Pay belongs to a Person. Project is optional context and does not gate the lifecycle.

## Historical migration and Project Cost ownership

Verified historical staff-pay records may be migrated from legacy Project Costs only when the Founder identifies the row as the staff member's own pay. Do **not** classify ordinary Project Costs merely because a staff member created or submitted them. Crew wages, suppliers, materials, equipment, transport, maintenance and other project expenditure remain Project Costs unless separately ruled otherwise.

Once a legacy Project Cost has a canonical Staff Pay record linked through `legacy_source_claim_id`:

- Staff Pay becomes the working financial home for that staff obligation;
- the legacy Project Cost source row remains in the database and is directly linkable for audit/provenance;
- the migrated source row is **excluded from the ordinary Project Costs register, Project Cost summaries, and Finance activity/totals** so it is not presented or counted twice;
- this exclusion is not deletion and does not destroy the historical source evidence.

Every migrated record preserves canonical person identity, optional original Project context, service date, lifecycle/decision truth, source Project Cost identity, and unknown historical payment state until explicitly confirmed.

## Deliberate non-scope

- no payroll engine
- no PAYE / NSSF / SHIF / payslips
- no casual-worker payroll migration
- no broad Project Cost migration
- no Company Expenses work
- no Project/Maintenance status changes
- no database/table/RPC rename from `staff_compensation` solely for presentation terminology
- no further visual redesign beyond these Founder amendments
