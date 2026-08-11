# Finance information architecture — Founder amendment

**Date:** 11 August 2026  
**Status:** SETTLED FOUNDER AUTHORITY  
**Scope:** Operations Hub Finance information architecture and visible terminology

## 1. Authority relationship

The committed Operations Hub working-authority PNGs remain the visual authority.
This amendment changes only the Finance information architecture and terminology
where the Founder has explicitly ruled after reviewing the live product and the
Simple Invoice interaction reference.

Simple Invoice is **not** a new visual authority. Its useful lesson is simplicity:
compact registers, progressive disclosure, contextual actions, and child / mini-child
navigation only where a real workflow exists.

## 2. Final Finance business areas

Finance has five business areas:

1. **Project Financials**
   - agreed project value with the client
   - payment milestones / payment schedule
   - client receipts
   - client balance / amount still due

2. **Project Costs**
   - internal expenditure incurred while delivering a project
   - approval state
   - total cost
   - actual payment truth
   - outstanding balance

3. **Company Expenses**
   - non-project operating expenses
   - subscriptions
   - advertising / marketing spend
   - company bills and overheads
   - no model exists yet; do not invent records or figures

4. **Staff Compensation**
   - staff-related payments and allowances
   - no model exists yet; do not invent payroll, rates or figures

5. **Advances**
   - money issued to an accountable person before the underlying expenditure occurs
   - whether the Advance has been accounted for is part of the Advance itself

## 3. Rejected visible Finance concepts

The following are **not** standalone Finance navigation concepts:

- Funding
- Payments
- Reconciliation

### Funding

The word `Funding` is rejected in the normal Finance interface. It sounds like
donor, investor or grant financing and does not describe Botanique's ordinary
operation of giving an accountable person money before expenditure.

The user-facing term is **Advance**.

### Payments

Payments do not form a parallel department beside Project Costs or other financial
records. A payment belongs to the thing it settles:

- a Project Cost has its payment(s)
- a Company Expense has its payment(s)
- Staff Compensation has its payment(s)
- Project Financials has client receipt(s)
- an Advance records the money issued and its subsequent accounting

### Reconciliation

`Reconciliation` is an internal accounting concept, not a destination users should
have to understand. Inside an Advance, use plain states and actions such as:

- Not yet accounted for
- Submitted for review
- Returned for correction
- Accounted for
- Amount returned
- Still to account for

The existing database object names may remain until a separately authorised migration;
they are implementation details, not product terminology.

## 4. Project Costs register amendment

Project Costs adopts the Simple Invoice register interaction pattern for readability,
without becoming an invoice system.

The primary register columns are:

**Date · Cost Ref. · Project · Status · Total · Balance · Paid · Action**

Do not show `Financial position` or `Not yet funded — no fund request` as the primary
state of a Project Cost.

Where historic payment truth has not yet been recorded in the Operations Hub, `Paid`
and `Balance` remain unknown (`—`). Approval does not imply payment, and absence of a
Hub payment record does not prove the cost is unpaid.

## 5. Project Financials vs Project Costs

These are deliberately different:

- **Project Financials** answers: what did the client agree to pay Botanique, what has
  the client paid, and what remains due?
- **Project Costs** answers: what has Botanique spent delivering the project, what has
  actually been paid, and what remains to pay?

The future Principal-level project financial view may combine these truths for a useful
project position, but the underlying records remain distinct.

## 6. Finance landing page

The committed Finance PNG remains the visual guide for the department landing page.
The landing is a high-level view, not another navigation layer. It should show the five
business areas together, useful at-a-glance information, attention, and drill-through.

It must not recreate a second horizontal-tab architecture that duplicates the sidebar.

## 7. Child and mini-child navigation

Finance children may have mini-children when a real workflow benefits from them, similar
to the progressive hierarchy demonstrated by Simple Invoice.

Examples that may become appropriate once their models exist:

- Project Financials
  - Overview
  - Client Payments
  - Payment Milestones
- Company Expenses
  - Expenses
  - Subscriptions & Bills
- Advances
  - Active Advances
  - Advance History

These examples are **not authority to create empty routes today**. A mini-child is added
only when the underlying capability exists and improves navigation.

## 8. Other module authority

This amendment does not reopen other committed visual authority:

- Dashboard remains governed by its committed PNG.
- Reports remains governed by its committed PNG and has one visible module name: `Reports`.
- Daily Site Record remains governed by its committed PNGs 08 and 09 plus explicit Founder workflow rulings.
- Project Register, Project Proposals, People, Maintenance / Tools and Approvals are unchanged by this amendment.

## 9. Next finance-integrity requirement

The current database cannot yet represent all direct and historical Project Cost payments
truthfully without a synthetic fund request. A separate finance-integrity unit is required
to establish first-class payment truth against a specific approved Project Cost.

That future unit must preserve these rules:

- approval never implies payment
- a Project Cost payment does not require an Advance
- an Advance is used only where money genuinely needs to be provided before expenditure
- historical legitimate payments use their actual dates and are not fabricated from approval
- Project Costs derives `Paid` and `Balance` from actual recorded payments

No payment migration is authorised by this visual-authority amendment itself.
