# Staff Compensation — Working Visual Authority

**Date:** 16 August 2026  
**Status:** FOUNDER APPROVED — USE AS IS FOR CURRENT IMPLEMENTATION  
**Scope:** Finance → Staff Compensation

## Authority

The Founder approved the Staff Compensation mockup generated and reviewed in the 16 August 2026 Operations Hub working session and instructed that it be implemented **as it is**, with refinements deferred until the wider Hub is operational.

This authority does not reopen any other committed Operations Hub PNG or module.

## Founder amendment — icons and Hub colour rule

The Founder subsequently reviewed the live implementation against the approved Staff Compensation mockup and issued the following amendment:

- the approved mockup remains authoritative for composition, spacing, hierarchy, register structure, support panels and icon placement;
- icon forms must follow the approved mockup as closely as the shared Hub icon system permits;
- `Outstanding` uses the balance/pie-style icon rather than a generic clock;
- `Awaiting decision` uses the people/group icon with a distinct decision treatment;
- `Needs attention` uses a bell, not a warning triangle;
- `Part-paid` uses the balance/pie-style icon;
- Filters use a recognisable filter glyph rather than an improvised text symbol;
- **amber is prohibited throughout the Botanique Designers Operations Hub.** Any amber visible in this or another previously approved authority image is superseded by this rule;
- waiting/pending/outstanding states use restrained cool blue or blue-grey;
- people/decision emphasis may use restrained violet;
- stone/grey remains for neutral, draft, inactive or unknown states;
- green remains for approved/paid/settled positive states;
- red is reserved for genuine errors, rejection, cancellation and destructive actions.

This is a Hub-wide presentation rule, not a Staff Compensation-only exception.

## Desktop composition

The live Staff Compensation screen must follow the approved mockup composition:

1. **Header**
   - `FINANCE`
   - `Staff Compensation`
   - concise explanatory line: compensation belongs to a person; Project is optional context; approval and payment remain separate
   - primary action `New compensation`
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
   - Person is primary identity
   - Project is optional context and uses `—` when absent
   - status chips are restrained
   - payment values come only from Staff Compensation payment truth
   - imported historical records whose payment history is not known must show `—` for Paid and Balance rather than falsely showing KES 0 or the full approved amount as outstanding

5. **Right-side support rail**
   - `Needs attention`
     - awaiting Principal decision
     - part-paid compensation
     - drafts pending submission
   - `Recent payment activity`
     - real Staff Compensation payment records only
   - no fabricated sample rows in production

6. **Responsive behavior**
   - desktop uses register + support rail
   - 375–400px uses progressive disclosure/cards and must not require horizontal page scrolling

## Operating-model rulings exposed by the mockup

- `New compensation` is available to an authorised Manager and to the Principal.
- Manager-created compensation follows the existing request → Approvals decision workflow.
- Principal-created compensation is a direct Principal authorisation of the obligation; it does **not** record payment.
- Direct Principal authorisation must remain explicitly audited.
- Approval/authorisation and payment remain separate truths.
- Payments remain inside the compensation record; no standalone Payments destination is created.

## Historical migration rule

The first historical migration may move verified Martine Lotom staff-compensation records from legacy Project Costs into Staff Compensation.

Do **not** migrate ordinary Project Costs merely because Martine created or submitted them. Crew wages, suppliers, materials, equipment, transport, maintenance and other project expenditure remain Project Costs unless the Founder has specifically identified the record as Martine's own staff-related claim.

Every migrated record must preserve:
- canonical `person_id` for Martine Lotom
- original Project as optional context
- original service date
- original lifecycle/decision truth, including Founder corrections
- source Project Cost identity for traceability
- unknown historical payment state until explicitly confirmed

## Deliberate non-scope

- no payroll engine
- no PAYE / NSSF / SHIF / payslips
- no casual-worker payroll migration
- no broad Project Cost migration
- no Company Expenses work
- no Project/Maintenance status changes
- no redesign/refinement beyond the approved mockup in this tranche
