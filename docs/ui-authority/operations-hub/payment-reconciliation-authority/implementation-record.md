# BD-FIN-01C — Implementation record

The payment/release and accountable-advance reconciliation model, implemented 9 August 2026
against `origin/main` `fd4bc1ac1e11435e2fa5ef68aa7415d6f7a2d9cf` (the merge of PR #97).

This implements the authority in this directory and the five rulings in
`founder-rulings-settled.md`. Where this record and an earlier proposal differ, the difference
is stated explicitly below rather than left to be discovered.

Everything the repository could not represent before — that money moved, to whom, when, through
what channel, what became of it, what was returned, and what remains unresolved — it can now
represent. Everything outside that is still unbuilt, and §"Remaining gaps" says so plainly.

---

## 1. Schema

One migration: `supabase/migrations/20260809000100_fund_release_and_reconciliation.sql`.
Five new tables. No existing table gained a column, and no existing lifecycle gained a value.

### `fund_releases` — E1, money actually moved

One row = one movement of money. Child of an **approved** `fund_requests` row, never of a claim.

| Field | Meaning |
| --- | --- |
| `release_number` | `BDRL-YYYY-NNNNNN`, from a sequence, assigned by trigger, immutable |
| `fund_request_id` | the approved authority this movement draws on |
| `status` | `recorded` → `reversed`. Two states, because a release either happened or was recorded in error |
| `custody_disposition` | `operations_manager_accountable_advance` \| `direct_recipient_funding` |
| `recipient_profile_id` | the accountable person — advances only |
| `recipient_label` | the payee — direct settled payments only |
| `released_amount` | `numeric(14,2)`, `> 0`, KES only |
| `released_at` | when the money actually moved |
| `payment_channel` | `mpesa` \| `bank_transfer` \| `cash` \| `other` |
| `payment_reference` | optional external reference (M-Pesa code, bank reference) |
| `note` | optional |
| `recorded_by`, `recorded_at` | the Principal who recorded it |
| `receipt_confirmed_by`, `receipt_confirmed_at` | optional, advances only |
| `reversed_by`, `reversed_at`, `reversal_reason` | reversal is the only correction path |
| `version` | optimistic concurrency, as elsewhere |

**Zero, one or many releases per approval are all valid.** Zero is precisely "approved but
unpaid", which is why no release row is ever fabricated for a historical fund request.

### `fund_acquittals` (+ `fund_acquittal_lines`) — E2, what became of it

Child of one release, `unique (fund_release_id)`. States: `submitted` →
`{accepted | amendment_requested → submitted}`.

A row exists **only once the custodian actually submits one.** A direct settled payment never
gets one, and an unaccounted-for advance is "outstanding" by the *absence* of a row rather than
a fabricated placeholder. Both are derived, not stored.

| Field | Meaning |
| --- | --- |
| `released_amount_snapshot` | frozen at submission so the arithmetic cannot drift |
| `actual_spend_total` | kept equal to the sum of the lines by a deferrable constraint trigger |
| `returned_amount` | unspent money handed back |
| `variance_amount` | **stored generated column**: `released − spend − returned` |
| `evidence_reference` | nullable text only — this model invents no file storage |
| `submitted_by` / `accepted_by` | separation of duties, enforced by constraint and by RPC |
| `variance_override_reason` | mandatory when an unbalanced position is accepted |

`fund_acquittal_lines` carry `description`, `category`, `amount`, `spent_on`. The category
vocabulary is **exactly** `internal_cost_claims.category` — labour, mason_subcontract,
cart_transport, transport, materials, equipment_hire, supplier_cost, other — so actual
expenditure is classified the way authorised cost is classified and Project Costs can compare
them later without a translation table.

`fund_release_events` and `fund_acquittal_events` are immutable append-only histories with a
full JSON snapshot per transition, matching the BD-FIN-01A/01B1 convention.

### The variance convention

```
variance = released − actual spend − returned

variance > 0   money released that was neither spent nor returned  (unaccounted for)
variance = 0   the advance is fully accounted for
variance < 0   more was legitimately spent than released; |variance| is the further
               amount required
```

"Unspent", "additional required" and "unaccounted for" are all **derived from this one number**
rather than stored as competing figures that could contradict each other. Founder ruling D4 is
satisfied without a separate return-transaction entity or a floating balance object.

---

## 2. Where this extends the proposal, and why

`proposed-domain-model.md` put custody on the fund request only, and ruling **D3** noted that
`intended_custody_type` "already distinguishes the two cases, so this needs no new field."

The implementation puts a `custody_disposition` **on the release as well**, in the *same
vocabulary* — no synonym is invented. The reason is factual, not cosmetic: the request records
*intent*, the release records *fact*, and one approved authority may legitimately produce both
an accountable advance and a direct supplier payment. Recording the fact per movement is what
lets the reconciliation obligation follow the money rather than the intention. The demo
walkthrough exercises exactly that case: one KES 8,000 authority settled as a KES 3,000 direct
supplier payment plus a KES 5,000 advance to Martine, where only the advance is owed an
acquittal.

The RPC still defends the intent: an advance may only go to the custodian the approved request
names, so a release cannot quietly redirect approved money to a different person.

---

## 3. RPCs and authority

| RPC | Who | Guard |
| --- | --- | --- |
| `record_fund_release` | **Principal only** | approved request; amount > 0; not future-dated; advance requires the named custodian and an active manager; direct requires a payee; aggregate must not exceed the authority |
| `reverse_fund_release` | **Principal only** | reason mandatory; refused if a reconciliation exists against the release |
| `confirm_fund_release_receipt` | **the recipient only** | advances only; never for a direct payment |
| `submit_fund_acquittal` | **the custodian only** | advances only; first submission or after `amendment_requested` |
| `decide_fund_acquittal` | **Principal only** | not the submitter; reason mandatory to send back, and mandatory to accept an unbalanced position |

No Finance Officer role was invented. The existing `owner` / `manager` authority stands, and
`private_assert_fund_request_project` reuses the BD-FIN-01A project-eligibility model unchanged.

### RLS

One `SELECT` policy per table, following `can_access_internal_cost_claim_project` through the
release's fund request. **No write policy on any of the five tables**, and no INSERT/UPDATE/
DELETE grant to `authenticated` — so no client of any role can fabricate a release directly.
Staff and Viewer receive no policy and see nothing. The test matrix proves each of these.

---

## 4. Over-release protection and concurrency

Three layers, deliberately:

1. **The row lock.** `record_fund_release` does `select … from fund_requests … for update`
   before computing the already-released total, so a second concurrent release waits and then
   recomputes against the committed state of the first. This is the real defence.
2. **The check.** Aggregate non-reversed releases may never exceed
   `total_requested_amount`; violation raises `BDF02`, which the client surfaces as a conflict
   that keeps the form data rather than implying a partial save.
3. **The constraint trigger.** `fund_releases_within_authority` re-asserts the invariant at the
   database level so it cannot be lost if a future call site forgets the check.

A reversed release releases its hold, exactly as a withdrawn fund request releases its
reservation. The existing double-reservation protections of BD-FIN-01B1 are untouched.

Two further integrity guards: an approved authority with money released against it **cannot be
cancelled**, and a recorded release is immutable in every factual field — amount, date, request,
custody, recipient, channel, recorder — so a correction must be a reversal.

---

## 5. Derived financial position

`public.fund_request_financial_position(target_project_id, target_request_id)` — a
security-definer set-returning function, following the `fund_request_claim_availability`
convention. **Nothing it returns is stored anywhere.**

```
release_state         none | partially_released | fully_released
reconciliation_state  not_required | outstanding | submitted | amendment_requested | accepted
financial_position    not_applicable | approved_unpaid | partially_funded
                      | reconciliation_outstanding | reconciliation_submitted
                      | reconciliation_amendment_requested | financially_settled
```

The derivation, in order:

1. Not approved → `not_applicable`.
2. No live release → `approved_unpaid`.
3. Any advance without an acquittal → `reconciliation_outstanding`.
4. Any acquittal awaiting a decision → `reconciliation_submitted`.
5. Any acquittal sent back → `reconciliation_amendment_requested`.
6. Released less than authorised → `partially_funded`.
7. Otherwise → `financially_settled`.

`financially_settled` is therefore reached in exactly two ways: an authority fully released as
direct settled payments, or one fully released as advances whose every acquittal is accepted. A
variance **accepted with a stated reason** is settled; a variance still awaiting that decision
is not.

`src/admin/utils/fundReleaseCapabilities.js` carries a client mirror of the same rule for demo
mode. The two are held together by asserting the same scenarios in both
`supabase/tests/fund_release_and_reconciliation_test.sql` and
`src/admin/utils/fundReleaseCapabilities.test.js`. The live surface always reads the database.

---

## 6. What this does NOT change

- `internal_cost_claims.lifecycle` — **no `paid` value added.**
- `fund_requests.status` — **no payment state added**, and no `paid_amount`/`paid_at` shortcut
  column. The BD-FIN-01B1 test now asserts this directly (see §8).
- `fund_request_allocations` — still reserves authority, records no payment.
- `daily_site_entries` — **no financial column, constraint or trigger.** Operational close
  remains completely independent of financial settlement, per ruling D5. The Daily Site Record
  is not the ledger and reaches the financial position only by traversing the existing chain.
- `approval_requests` — untouched. No release record was moved into it.

---

## 7. Application surfaces

Deliberately compact; this is not a Finance visual redesign.

- `src/admin/lib/fundReleases.js` — reads and RPCs.
- `src/admin/utils/fundReleaseCapabilities.js` — the derivation and the permission mirror.
- `src/admin/context/FundRequestsProvider.jsx` — extended with releases, acquittals and lines.
- `src/admin/components/finance/FundReleaseSection.jsx` — one section on the approved fund
  request: authorised / released / remaining / actual spend, the record-release form, and a
  drill-through release history that expands to reconciliation, receipt confirmation and
  reversal. No giant table; one row per release, expanded on demand.

The Principal's "record a release" action disappears once the authority is exhausted, and
"cancel approved request" disappears once money has moved — the surface never offers what the
database would refuse.

### Visible terminology

The Finance area already said **Project Costs** while every page it linked to said "Site Costs".
That oscillation is corrected: headings, buttons, links, empty states, loading text, error
messages and report labels now say Project Costs / project cost. Routes, components, tables and
RPCs keep their `site-costs` / `internal_cost_claim` names — no repository-wide technical
rename was performed.

`FinancialFollowUp` previously ended "Payment, release and reconciliation are not recorded in
the Operations Hub yet." That is now false, and the sentence was corrected to point at the fund
request instead. The fund request banner no longer asserts "No funds have been released"
unconditionally; it states the actual released position.

---

## 8. The BD-FIN-01B1 assertion that had to change

`supabase/tests/claim_backed_fund_requests_test.sql` asserted that **no** release, payment,
expenditure or reconciliation table or function existed anywhere in the database. BD-FIN-01C
deliberately creates that family, so the absence assertion is false by authorised design.

It was **not deleted and not weakened.** What it was protecting is now asserted instead, and
more strictly: the fund request must never become the payment ledger. Four assertions replace
the two — no paid/released/reconciled/settled/variance column on `fund_requests`, no payment
state in its status check constraint, no paid/released column on an allocation, and the three
tables still being exactly three.

---

## 9. Prerequisite defect correction — demo `submitClaim`

PR #97 reported that the demo `submitClaim` returns an undefined claim. Reproduced from
authoritative main and confirmed, with one addition PR #97 did not record.

**Root cause.** `SiteCostsProvider.submitClaim` assigned its result inside a `setClaims`
updater callback, which React does not run synchronously, so the function returned
`{ ok: true, claim: undefined }`. `AdminSiteCostForm` then dereferenced `result.claim.id` and
threw. The KES 0 total had the same origin: the demo total was computed from a `lines` closure
captured before the just-created claim's lines were applied.

**Also found, not in the PR #97 diagnosis.** The demo path performed **no version check at
all**, so a stale submission that the database would reject with `40001` silently succeeded in
demo. Every other demo path (`demoTransition`) checked it. This is the same contract mismatch,
so it was corrected together.

**Correction.** Demo mode is now the truth for demo mode: `SiteCostsProvider` mirrors claims and
lines in refs written synchronously alongside state, so each demo path reads what the previous
one just wrote in the same tick. `submitClaim` became `demoSubmit`, matching the hosted contract
— returns the claim, sets `submittedTotal` from the claim's own lines, refuses a stale version,
and appends a submitted/resubmitted event.

Three regression tests in `src/admin/context/SiteCostsProvider.test.jsx` fail on unmodified main
and pass after. No production code path changed: hosted mode always went through `run()` and the
database, and still does.

---

## 10. Remaining gaps — what is still NOT built

Stated plainly so nothing here is mistaken for more than it is.

| Area | Status |
| --- | --- |
| **Company Expenses** | **Not built.** Still no table. Overheads cannot use the project-scoped `internal_cost_claims` model. It may later reuse this release/acquittal spine; it must not be forced into project fund requests. |
| **Staff Compensation** | **Not built.** Still nothing in the repository represents compensation, payroll or a staff payment. `people_engagements` carries no rate and no pay. Martine's own compensation remains unrepresentable. |
| **Unified Approvals** | **Not built.** Approvals remains a project-domain decision surface. It is not the payment ledger and no release record was moved into it. |
| **Maintenance** | **Not built.** |
| **Tools & Equipment** | **Not built.** No asset, inventory or custody record is created by an acquittal line describing a purchase. The integration point is identified — Finance owns expenditure truth once, Tools & Equipment will own inventory/custody/condition truth — and nothing more. |
| **Project Costs remediation** | **Not done.** Only the minimum read model exists: acquittal lines carry the claim category, and `fund_request_financial_position` exposes authorised / released / actual / variance per request, so Project Costs can later show all three plus variance. The page itself is unchanged apart from its name. |
| **Project Summary / Reports Centre** | **Not touched.** |
| **Daily Site Record** | Unchanged. It gained no financial column and no close-out action. It can consume the derived downstream state in a later refinement; it does not yet. |
| **Evidence / attachments** | **Not built.** The acquittal carries a nullable text reference only. Real file evidence stays blocked on the storage-backup posture (PITR off, Storage excluded from database backups). |
| **Multi-currency** | Out of scope. KES only, as everywhere else. |

**Stage 6 is NOT ACTIVE_VERIFIED.**

---

## 11. Verification

**Database.** `scripts/test-fund-release-db.sh` runs
`supabase/tests/fund_release_and_reconciliation_test.sql` on a scratch PostgreSQL 17, applying
every migration in order and rolling back. It covers all fourteen required scenarios plus the
structural, grant, RLS and immutability guarantees. All nine database suites pass.

**Application.** 686 tests pass. New: 19 derivation/authority units, 3 demo-contract
regressions, 10 release-lifecycle surface tests.

**Demo walkthrough, verified in the browser** at desktop, 375px and 400px, no horizontal
overflow at any width and no console errors:

- approved authority with no release reads **Approved — unpaid**;
- a KES 5,000 advance to Martine → **partly funded**, remaining KES 3,000, reconciliation
  outstanding;
- a KES 3,000 direct payment to a supplier against the same authority → aggregate KES 8,000,
  fully released, and the direct payment states *"Paid directly to the payee. No
  accountable-advance reconciliation is required."*;
- the record-release action disappears once the authority is exhausted;
- cancel disappears once money has moved;
- reversal requires a stated reason.

**What demo could NOT verify.** Switching preview role resets the in-memory demo state, and an
Operations Manager cannot approve a fund request, so the Principal-records-release →
Manager-reconciles hand-off cannot complete inside one demo session. This is a pre-existing
property of the demo environment, not of this model. The Operations Manager acquittal path is
proven instead by the SQL matrix (scenarios 5, 6, 7 and the amendment round, under real RLS with
role impersonation) and by the React surface tests. It is **not** claimed as demo-verified.

**Hosted authenticated verification remains outstanding.** It requires the Founder to sign in as
Principal and as Operations Manager; no credentials were handled here.
