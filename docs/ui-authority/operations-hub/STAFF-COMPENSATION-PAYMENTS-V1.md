# Staff Compensation Payments V1

## Settled authority

- Staff Compensation approval and payment are separate truths.
- A payment belongs to one approved Staff Compensation record.
- Project linkage is context only and never gates payment.
- Payment recording is Principal-only in V1.
- Payment reversal is Principal-only and always requires a reason.
- Operations Manager and Principal may read payment position through the existing Staff Compensation access boundary.
- Partial payments are first-class.
- Overpayment is rejected.
- Reversal preserves history; payments are never deleted as a correction mechanism.
- An approved compensation with recorded payments cannot be cancelled until those payments are reversed.
- Because Staff Compensation launched with zero production rows, there is no historical payment-unknown state; every compensation starts at KES 0 paid.

## Derived position

For an approved Staff Compensation record:

`approved_amount - recorded_non_reversed_payments = balance_amount`

Payment status is derived as:
- `unpaid` — paid amount is KES 0
- `part_paid` — paid amount is greater than KES 0 but below approved amount
- `paid` — paid amount equals approved amount

## Deliberate non-scope

- no LEM migration
- no Project Cost rewrite
- no payroll/PAYE/NSSF/SHIF
- no Advances redesign
- no Approvals aggregation
- no Staff Compensation UI in this tranche
- no automatic Project status correction
