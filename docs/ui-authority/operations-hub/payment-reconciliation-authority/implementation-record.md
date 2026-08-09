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

---

# BD-FIN-01C READ INTEGRATION — Daily Site Record + Project Costs financial position

Second unit against this authority, merged after PR #98. **Read side only.** No migration, no
RLS change, no RPC change, no new financial authority, no production data touched.

## 12. Founder confirmation — release-level custody disposition is approved

PR #98 deliberately extended the settled authority by putting a `custody_disposition` on
`fund_releases` in addition to `fund_requests.intended_custody_type`. **The Founder has reviewed
this extension and approves it.** Both are kept, because they answer different questions:

| Record | Question it answers |
| --- | --- |
| `fund_requests.intended_custody_type` | What funding/custody arrangement was **intended**? |
| `fund_releases.custody_disposition` | How did this **actual** release occur? |

One approved authority may legitimately produce both a direct supplier payment and an
accountable advance, and the reconciliation obligation must follow the money rather than the
intention. Neither field is to be removed or collapsed into the other.

## 13. The read-model refinement: two dimensions, never one label

`fund_request_financial_position()` already returned `release_state` and `reconciliation_state`
as independent columns alongside the collapsed `financial_position`. **No schema change and no
new function were required** — the two-dimensional presentation is derived entirely from fields
the merged model already returns.

What was wrong was presentational. A KES 20,000 authority with KES 10,000 released as an
unreconciled advance is *simultaneously* partly funded and reconciliation-outstanding, and the
single collapsed label rendered it as "Funded — reconciliation outstanding", which is false about
the funding half. Every surface now states both dimensions:

- **Funding position** — no fund request raised / awaiting decision / approved but not yet
  funded / partly funded / fully funded.
- **Reconciliation position** — not required / outstanding / submitted / amendment requested /
  accepted.

A compact overall phrase is still used where one line is all there is, and it names both
dimensions when both say something ("Partly funded · Reconciliation outstanding"). No mutable
status column was added anywhere.

`src/admin/utils/claimFunding.js` is the single new derivation. It walks
claim → `fund_request_allocations` → request → releases → acquittals and reuses
`deriveFinancialPosition()` — the existing client mirror of the SQL function — as its only
arithmetic. Two rules govern it:

1. **Nothing is pro-rated.** A release belongs to a fund request, not to a claim, so no
   claim-level "released" figure is manufactured by apportioning. A claim shows the authorities
   it sits on, their true amounts, and says when an authority also funds other claims.
2. **Nothing is invented.** A claim on no fund request reads "No fund request raised" — never
   "unpaid". A day with no claim shows no financial position at all.

**What "actual" means.** A release is *not* actual expenditure. For an accountable advance,
actual expenditure is the spend on the current acquittal and nothing else, so an unaccounted
advance contributes zero — the outstanding position stays visible instead of being flattered.
A direct settled payment is actual expenditure the moment it is released: nobody holds it, there
is no return leg, and ruling D3 deliberately gives it no acquittal. `advanceSpendAmount` is
exactly the database's `actual_spend_amount` and is never widened, so the figures can always be
reconciled against the SQL.

## 14. Daily Site Record

The financial follow-up section now surfaces the downstream position: claim state, authorised,
released, unreleased, funding position, whether an accountable advance exists, reconciliation
position, actual expenditure, variance, and whether the workflow is settled — as a concise
summary plus a drill-through to each fund request. No release or acquittal rows are listed.

**It is still not the ledger.** No release is recorded, no advance reconciled, no expenditure
line edited, no payment reversed and no reconciliation decided from this surface. The only
outbound path is a link.

**Operational close remains independent of financial settlement.** No financial state gates any
operational transition, and an operationally closed day may visibly carry an outstanding
financial follow-up. The record's own copy says so.

## 15. Project Costs

The list gained a first-view financial band over exactly the claims in view — authorised,
released, actual spend, unreleased, summed across the *distinct* fund requests behind them — a
per-row funding and reconciliation phrase, a drill-through to the authority, and a financial
position filter (including "anything still unresolved"). The claim detail gained the same
two-dimension panel. The compact direction is preserved: no ledger table, no card-per-field, no
release rows on the primary surface. User-facing language remains **Project Costs**; internal
`site-costs` / `internal_cost_claim` names are unchanged.

## 16. One defect corrected on the PR #98 surface

`FundReleaseSection` displayed only the collapsed `FINANCIAL_POSITIONS` label, so a partly
released authority with an unreconciled advance read as "Funded — …". It now shows the release
state and reconciliation state as separate chips and states the unreleased remainder explicitly.
The derived model is unchanged; four PR #98 assertions were updated to assert both dimensions
instead of the collapsed label, which is strictly stronger and matches what those tests were
already named for.

## 17. Verification

- 21 new derivation units (`claimFunding.test.js`), 12 new Daily Site Record link units,
  7 new Daily Site Record surface tests, 8 new Project Costs surface tests.
- Full suite passes. PR #98 finance-integrity tests pass with no weakening.
- Production build passes; lint is at the unchanged 19-error baseline; `git diff --check` clean.
- Browser-verified at desktop, 375px and 400px: no horizontal overflow, no console errors.
  A real position was built through the demo (approved claim → approved authority → KES 10,000
  advance of KES 20,000) and read back correctly on Project Costs, the claim detail, the Daily
  Site Record list and detail, and the fund request.

**What demo could not verify.** Switching preview role still resets in-memory demo state, so no
continuous cross-role journey is claimed. Operations Manager behaviour is proven by the surface
tests and by the unchanged SQL/RLS matrix.

## 18. Remaining gaps after this unit

Company Expenses, Staff Compensation, unified Approvals, Maintenance, Tools & Equipment,
Project Summary / Reports Centre and evidence attachments are all **still not built** — section
10 above stands unchanged. Finance is **not** complete. Finance Overview still shows no
portfolio-level funding position. Project Costs still has no grouping by project or period and
no export.

**Stage 6 remains NOT ACTIVE_VERIFIED. Hosted authenticated verification is still outstanding**
and requires the Founder to sign in as Principal and as Operations Manager.

---

# PRODUCTION REMEDIATION — hosted walkthrough of 9 August 2026

The first real authenticated walkthrough on https://www.botaniquedesigners.com/admin, as both
Martine Lotom (Operations Manager) and Widson O. Ambaisi (Principal), found two production
blockers. Both are closed here. **No financial model was redesigned and no new authority was
introduced.**

## 19. Blocker A — the payment/reconciliation schema was never applied to production

**Symptom.** The hosted Funding, Payments and Reconciliation surface returned
`Could not find the table 'public.fund_acquittals' in the schema cache`.

**Diagnosis, before any change was made.** All five candidate causes were tested and four were
ruled out:

| Candidate cause | Finding |
| --- | --- |
| Applied to the wrong Supabase project | **Ruled out.** The production bundle at `/assets/index-*.js` resolves to `https://wcacyfyxjiysfibuuhgf.supabase.co` — `botanique-admin`, the documented project. The other two projects (`ask-botanique-db`, `ask-botanique-staging`) contain **no** `fund_*` object at all. |
| Applied partially | **Ruled out.** Not one PR #98 object existed: no `fund_releases`, `fund_release_events`, `fund_acquittals`, `fund_acquittal_lines`, `fund_acquittal_events`, no `fund_release_number_seq`, and none of the six RPCs. The BD-FIN-01B1 objects were all present and intact. |
| Stale PostgREST schema cache | **Ruled out.** The table genuinely did not exist; `PGRST205` is simply how a missing table surfaces through the API. No cache reload could have helped. |
| Deployment/config mismatch | **Ruled out.** Production was serving commit `247bb70` — merged main after PR #99 — so the frontend correctly expected the PR #98 model. |
| **Migration never applied** | **CONFIRMED.** Hosted migration history held 13 rows; the repository holds 14. Reconciled by name (hosted versions differ from repository filenames), the missing one was exactly `fund_release_and_reconciliation`. |

**Root cause.** There is **no automated migration deployment**. `.github/workflows/` does not
exist and `package.json` has no migration script. Vercel deploys the frontend on every merge to
main; nothing applies Supabase migrations. Every migration to date was applied by hand, which is
why hosted versions differ from repository filenames. PR #98's migration was simply never run.
**The frontend shipped ahead of its database, and nothing in the pipeline could notice.**

**Remediation.** The already-authorised migration was applied unchanged. No second migration
file was created, and no production schema was hand-edited.

- Repository file verified byte-identical to merged main (SHA-256
  `7aa66344d9c2f01bb497e99edef249c6ea3ff6014c821f2a9a26cd6adc0ca15c`).
- No later migration conflicts with it; it is the newest in the repository.
- Verified additive-only: every `alter table` targets a table the migration itself creates, and
  every `insert`/`update`/`delete` sits inside a new function body. No DDL against an existing
  table and no data backfill.
- Safe against current rows: production held **zero** `fund_requests`, so nothing could be
  affected.
- Applied to `botanique-admin` and recorded as `20260809191358 fund_release_and_reconciliation`.

**Proof the applied DDL is correct, not merely present.** A scratch PostgreSQL 17 was built from
the migration **files**, and a 191-row catalog fingerprint — every column type, nullability,
default and generated expression, every constraint definition, index, trigger, policy, grant and
RLS flag, plus an md5 of every function body — was computed identically on both sides:

```
local build-from-files   191 rows   e29ea4166f9d3cc665eafbad68644b1a
production               191 rows   e29ea4166f9d3cc665eafbad68644b1a
```

**Post-remediation verification against the live backend.**

- All five tables and the RPC now resolve through PostgREST. Anonymous callers receive
  `42501 permission denied`, not `PGRST205` — the schema-cache error is gone, and the security
  posture is correct because the migration grants only to `authenticated`.
- Both real profiles read the new tables through RLS and execute
  `fund_request_financial_position()`.
- `authenticated` holds **SELECT only** on all five tables; `anon` holds nothing; no INSERT,
  UPDATE or DELETE grant exists for any client role.
- `private_active_fund_release_role()` is correctly **not** executable by `authenticated`.
- **No backfill.** All five tables hold zero rows; the release sequence is unused; the 26 cost
  claims, 26 Daily Site Records and 0 fund requests are exactly as they were.
- The PR #98 database suite passes on PostgreSQL 17 against the real migration files.

**Honest boundary.** "Historical approved fund requests still read approved/unpaid" is
**vacuously true in production**: no fund request has ever been created there. The behaviour is
proven by the SQL matrix, not by production rows.

## 20. Blocker B — accidental duplicate cost claims

**What was found.** Worse than reported. The Daily Site Record hand-off offered "Create cost
claim" with equal prominence however many claims existed, and the form pre-filled the record's
own planning line. Revisiting a record therefore produced a claim that was a strict subset of one
already approved. In production, on Alego Usonga:

| Daily Site Record | Claims | Total | Planned labour |
| --- | --- | --- | --- |
| 2026-08-09 (10 × KES 500) | KES 5,350 + KES 5,000 + KES 5,000 | **KES 15,350** | KES 5,000 |
| 2026-08-08 (10 × KES 500) | KES 6,150 + KES 5,000 | **KES 11,150** | KES 5,000 |

Every KES 5,000 claim contains exactly one line — `Planned site labour`, daily, 10 worker,
KES 500 — identical to a line already inside the earlier, richer claim. All are approved.
**Nothing has been paid**: production holds no fund request, so no money has moved.

**The control.** Deterministic and structural; no fuzzy matching, no scoring, no text similarity.
A claim is treated as covering the day's cost only when **all three** hold:

1. the same `daily_site_entry_id`;
2. the same category;
3. a cost line equal to the record's own planning line in description, rate type, quantity and
   unit rate — the exact shape `AdminSiteCostForm.sourcePrefill()` generates.

**Behaviour.**

- **Case A — nothing claimed:** "Create cost claim", unchanged.
- **Case B — the day's cost is already claimed:** "Open existing claim" becomes the primary
  action, with a compact amber line naming the amount. The ordinary duplicate call-to-action is
  removed.
- **Case C — a genuinely additional cost:** "Raise additional cost" remains available as a
  secondary action. It opens the form with the planning line and purpose **deliberately blank**,
  so the duplicate cannot be produced by pre-fill, and the existing required `purpose` field
  captures why another claim is needed.
- **Principal review:** a claim structurally overlapping another from the same record shows
  "Possible duplicate" with drill-through. It is a warning; every decision stays available and
  nothing is auto-rejected.

**No schema change was required for the additional-claim reason.** `internal_cost_claims.purpose`
already exists, is already mandatory, and already means "what this claim is for". Clearing the
pre-fill makes the person state it. No speculative column was added and no RPC changed.

**Nothing is falsely blocked.** A different category, a different record, a genuinely different
line, and any rejected, withdrawn or cancelled prior claim all leave the ordinary path intact.
Multiple claims per day remain fully legitimate.

**Production data was not touched.** No claim was deleted, cancelled, rejected, merged or edited;
no payment, release or reconciliation was created; Martine's naming, the ZZ Verification Record
and LEM are all untouched. **The duplicate Alego claims remain exactly as the Founder left them,
for the Founder to resolve through the normal workflow.**

## 21. Status after this remediation

Stage 6 remains **NOT `ACTIVE_VERIFIED`**. The broad visual-authority implementation tranche
(images 08, 09, 12, 13 plus the settled WhatsApp support refinement) has **not** been started and
remains the next unit once this remediation is stable in production.
