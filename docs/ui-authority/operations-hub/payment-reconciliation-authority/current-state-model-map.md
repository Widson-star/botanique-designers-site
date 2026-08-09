# Current-state financial model map

Read directly from the thirteen migrations on `origin/main` `8066b8cb`, the admin routes and the
context/capability modules. Nothing here is inferred from documentation; where a claim is made
about behaviour, the function that produces it is named.

## The exact point at which the model terminates

`public.decide_fund_request(target_request_id, target_expected_version, target_decision,
target_reason)` in `supabase/migrations/20260731000300_claim_backed_fund_requests.sql` sets
`fund_requests.status = 'approved'`, `decided_by = auth.uid()`, `decided_at = now()`, increments
`version`, appends an `approved` row to `fund_request_events`, and returns.

**There is no successor.** The only transition available after `approved` is
`public.cancel_fund_request`. No table, view, column, enum value, function, trigger or index in
the repository represents a payment, release, disbursement, reimbursement, receipt of funds,
actual expenditure, return of unspent money, reconciliation, variance, settlement, or any bank or
mobile-money balance.

This was verified by exhaustive search of the migration set for `released`, `release_`, `paid`,
`payment`, `disburse`, `reimburse`, `reconcil`, `receipt`, `variance`, `settlement`, `advance`,
`payroll`, `salary`, `compensation`, `expenditure`, `company_expense` and `overhead`. Every hit is
one of exactly three things:

1. A **prose comment** stating the object is deliberately *not* modelled — the header of the
   BD-FIN-01B1 migration is explicit: it "creates no fund release, transfer, advance receipt,
   payment, payment allocation, supplier settlement, worker payment status, evidence, proof of
   payment, reconciliation, return, dispute, reversal, carry-forward … object", and "An approved
   fund request authorises Botanique to make up to the approved amount available for the
   identified project claims. **It is not evidence that funds were released.**"
2. `project_financial_references.payment_status` / `.receipt_reference` — free text, no amount,
   **client-side income** pointers into the external Simple Invoice Manager, not internal
   expenditure.
3. `intended_custody_type = 'operations_manager_accountable_advance'` — the word "advance" naming
   an *intent*, guarded by the comment "Intended custody records intent only; it is never evidence
   of a release."

**Answer to "does any payment truth exist today?" — No.**
**Answer to "does any reconciliation truth exist today?" — No.**

## Table-by-table map

### `internal_cost_claims` + `internal_cost_claim_lines` + `internal_cost_claim_events`
*Migration `20260731000200_internal_cost_claims.sql` — BD-FIN-01A*

- **Purpose.** The cost claim: what Operations says the day cost, and the Principal's decision on it.
- **Owner.** Finance → Project Costs. Surfaced at `/admin/site-costs` (`AdminSiteCosts.jsx`,
  `AdminSiteCostForm.jsx`, `AdminSiteCostDetail.jsx`) and summarised in `AdminFinance.jsx`.
- **Key fields.** `project_id`; optional `daily_site_entry_id` with a frozen
  `daily_site_snapshot` + `daily_site_source_version`; `service_date`; `recipient_type`
  (crew/staff/supplier/contractor/service_provider/other); `recipient_label`; `category` (labour,
  mason_subcontract, cart_transport, transport, materials, equipment_hire, supplier_cost, other);
  `currency` fixed KES; `purpose`; `submitted_total`; `approved_total`; `requester_id`;
  `decider_id`; `direct_authority_actor_id`; optimistic `version`.
- **Lifecycle.** `draft → awaiting_review → {approved | rejected | amendment_requested}`;
  `amendment_requested → awaiting_review`; `awaiting_review|amendment_requested → withdrawn`;
  `approved → cancelled`. Lines carry `quantity × unit_rate` with a stored generated `line_total`.
  Events are immutable (trigger `internal_cost_claim_events_immutable`) and snapshot both claim
  and lines at every transition.
- **Can represent.** What was claimed, by whom, for which project, for which Daily Site Record day
  and at which source version, composed of which cost lines, at what total, when submitted, who
  decided, when, what decision, and the reason — the whole of §9A and most of §9B.
- **Cannot represent.** A **partial** approval amount (`decide_internal_cost_claim` hard-assigns
  `approved_total = submitted_total`); any payment; any actual expenditure; any evidence file
  (there is no attachment model anywhere); any link to a release.
- **Disposition. Remain, unchanged in shape.** Its lifecycle already terminates correctly at
  `approved`. Adding a `paid` value to `lifecycle` would collapse decision and payment and is
  forbidden.

### `fund_requests` + `fund_request_allocations` + `fund_request_events`
*Migration `20260731000300_claim_backed_fund_requests.sql` — BD-FIN-01B1*

- **Purpose.** Principal authority to *make money available* against approved claims. Not money.
- **Owner.** Finance → Funding, Payments and Reconciliation. `/admin/fund-requests`.
- **Key fields.** Human `request_number` from a sequence; `authority_type`
  (`manager_requested` | `principal_direct`); `intended_custody_type`
  (`operations_manager_accountable_advance`, which requires an active-manager
  `custodian_profile_id` | `direct_recipient_funding`, which forbids one); `total_requested_amount`;
  full actor set (`requester_id`, `decided_by`, `withdrawn_by`, `cancelled_by`,
  `direct_authority_actor_id`).
- **Lifecycle.** `draft → submitted → {approved | rejected | amendment_requested}`; `withdrawn`;
  `approved → cancelled`. Principal-direct enters at `approved` with `submission_round = 0` and
  `requester_id` null, by constraint `fund_request_authority_consistency`.
- **Allocations.** Each row reserves an amount against one approved claim, freezes seven
  snapshot columns, and is capped by `fund_request_allocation_not_over_claim`
  (`requested_amount <= claim_approved_total_snapshot`). `fund_request_claim_availability`
  computes `available_to_request` net of amounts already reserved by other requests in a
  reserving status (`submitted`, `amendment_requested`, `approved`).
- **Can represent.** Who authorised how much to be made available, against exactly which approved
  claims, under whose intended custody, and the whole immutable decision history — with genuine
  double-reservation prevention.
- **Cannot represent.** Whether any money moved, how much, when, to whom in fact, through what
  channel, under what reference, in how many instalments, or what became of it.
- **Disposition. Remain, and do not overload.** This is the correct authorisation object. It must
  **not** be mutated into a payment ledger by bolting `paid_amount`/`paid_at` onto it — that would
  collapse authority and payment inside one row and make partial and multiple releases
  unrepresentable.

**Note on partial approval.** Because an allocation may be *less than* the claim's approved total,
the settled system **already** supports "the Principal accepts the cost but makes less money
available", without any schema change. This matters for Founder decision **D1**.

### `daily_site_entries` + `daily_site_entry_events` + `daily_site_compliance_waivers`
*Migration `20260728000200_operations_hub_daily_site_operations.sql`*

- **Purpose.** The morning operational record. Operational truth only.
- **Owner.** Operations → Daily Site Record. `/admin/daily-site-operations`.
- **Key fields.** `work_date`; `disposition` (`working` | `no_work` with a reason enum);
  `expected_worker_count` (**planned**, an integer); `crew_reference` (**free text**);
  exactly one of `rate_per_worker` or `agreed_labour_total`; `planned_labour_cost` (constrained to
  equal the derivable value); `funds_available`; `additional_amount_requested`;
  `evidence_status` (`none|promised|provided|not_required` — **four labels, no file**);
  `state` (`draft|submitted|returned_for_correction|resubmitted|accepted|voided|superseded`);
  `version`, `supersedes_entry_id`, `is_late`.
- **Can represent.** The planned position and its review lifecycle, including an explicit
  *intent* to request additional money (`additional_amount_requested`) and a cash-on-hand figure
  (`funds_available`), neither of which is a transaction.
- **Cannot represent.** Actual attendance; any evidence file; any expenditure; any payment; any
  reconciliation. `funds_available` is a self-reported number with no ledger behind it.
- **Disposition. Remain, strictly operational.** The safeguard holds: it may *display or reference*
  financial state; it may never own it.

### `approval_requests` + `approval_events`
*Migrations `20260728000100` and `20260729000100`*

- **Purpose.** Project-domain approvals only.
- **`approval_type` domain.** `project_activation`, `project_target_completion_change`,
  `project_completion`, `project_cancellation`, `project_archive`, `project_restore`,
  `project_material_change`. `approval_domain` is constrained to the literal `'project'`;
  `subject_record_id` exists but is constrained to be null (`approval_requests_subject_reserved`).
- **Can represent.** One project-change decision queue with immutable history.
- **Cannot represent.** Cost claims or fund requests — both carry their own separate decision
  paths and appear nowhere in this table.
- **Disposition. Remain.** Aggregation across the four decision types is a **read/projection**
  problem, not a reason to migrate claims and fund requests into this table. Approvals must never
  become the payment ledger.

### `project_financial_references`
*Migration `20260614000100_admin_foundation.sql`*

- One row per project. `simple_invoice_client_name`, `estimate_number`, `invoice_number`,
  `receipt_reference`, `payment_status`, `financial_notes` — all free text, **no amount column**.
- **Client-side income reference** into the external Simple Invoice Manager, which remains the
  source of truth for client invoicing.
- **Disposition. Remain as a pointer.** It must not be repurposed as the internal expenditure or
  payment record. Its `payment_status` string is about a client paying Botanique, not about
  Botanique releasing money to Operations.

### `people`, `people_engagements`, `people_engagement_events`
*Migrations `20260803000100`, `20260803194000`*

- Labour identity and project engagement with an immutable ledger and Principal-only
  correct/reopen. **No rate, no pay, no compensation column of any kind.**
- **Disposition. Remain.** Staff Compensation cannot be built on this alone; see §Dependencies.

### Everything else
`profiles`, `projects`, `project_assignments`, `project_activities`, `campaigns`, `leads`,
`lead_activities`, `project_intake_requests`, `project_intake_events`, `work_inbox_read_state` —
context, intake and read-state. No financial truth.

## Existing lifecycles, stated exactly

**Cost claim.** `create_internal_cost_claim_draft` (manager) → `update_internal_cost_claim`
(manager, requester only, draft/amendment_requested only, version-checked) →
`submit_internal_cost_claim` (manager, requester only, re-validates the Daily Site source is still
`working` and `submitted|resubmitted|accepted`, sets `submitted_total` from the lines) →
`decide_internal_cost_claim` (**owner only**, refuses self-decision, requires a reason for
rejection and amendment, re-verifies the line sum against `submitted_total`) → terminal
`approved` / `rejected`, or back round via `amendment_requested`. Side paths:
`withdraw_internal_cost_claim` (manager) and `cancel_internal_cost_claim` (owner, approved only,
reason required). Exception path: `principal_authorise_internal_cost_claim` (owner, round 0,
stamps `direct_authority_actor_id`, `reason` currently **optional**).

**Fund request.** `create_fund_request_draft` → `update_fund_request` → `submit_fund_request` →
`decide_fund_request` (owner only, no self-decision, re-verifies reservations against the total)
→ terminal `approved` / `rejected`. Side paths: `withdraw_fund_request`, `cancel_fund_request`.
Exception path: `direct_authorise_fund_request`.

**Project approval.** `submit_project_approval` → `decide_project_approval` /
`request_approval_amendment` → `amend_and_resubmit_approval` / `withdraw_approval_request`, with
the approved change applied by `private_apply_project_material_change`.

## Surface-level consequence today

`AdminFinance.jsx` renders three of the five settled areas — Overview, Project Costs and Funding,
Payments and Reconciliation — and each shows only an **approved total and an approved count**.
The Funding area's own copy already tells the user the truth: these are "Requests for Principal
authority to make money available against approved claims." Company Expenses and Staff
Compensation are correctly omitted because no table exists behind either. The area named
"Funding, **Payments** and **Reconciliation**" can, today, show neither payments nor
reconciliation.
