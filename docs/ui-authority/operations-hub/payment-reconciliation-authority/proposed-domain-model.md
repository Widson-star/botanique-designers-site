# Proposed domain model — payment, expenditure and reconciliation

**Nothing described here exists.** No SQL appears in this file by design: the business meaning is
settled first, and the shape follows only after the Founder rules on
`founder-decisions-required.md` and issues a separate implementation authorisation.

The design principle throughout is **the smallest coherent addition**: two new record families and
one derived read model, extending sound existing concepts rather than proliferating tables — and
without overloading an existing table whose business meaning is different.

## Why the two existing tables cannot simply be extended

The tempting minimal change is to add `paid_amount` and `paid_at` to `fund_requests`. It must be
rejected:

- It makes **multiple releases against one approval** unrepresentable (scenario 6).
- It makes **partial release** ambiguous — is a smaller `paid_amount` a partial payment or a
  correction?
- It puts payment truth inside the row whose entire documented purpose is that it is *not*
  evidence of payment, defeating the safeguard the migration header states in its first paragraph.

Equally, adding `paid` or `reconciled` to `internal_cost_claims.lifecycle` must be rejected: it
collapses decision and payment into one status field, which §6 of the settled authority forbids
outright.

---

## E1 — Fund release *(new record family)*

**Responsibility.** The single truth that money actually left Botanique's control. One row = one
movement of money.

**Relationship to current records.** Child of an **approved** `fund_requests` row. Never child of
a claim: a release is made against a funding authority, and the claims it settles are already
identified by that authority's allocations.

**Required truth it owns.** Was money released; how much; when; by whom recorded; under whose
authority; to whom; through what mechanism; under what reference; against which approved funding
authority; and, transitively, for which project and which day.

**Minimum data.**

| Category | Content |
| --- | --- |
| Link | approved `fund_request_id` (and therefore project, claims, service dates) |
| Amount | released amount, `KES` only, must be > 0 |
| Timing | released-at, recorded-at |
| Actors | authorising Principal (carried from the request), recording actor, receiving party |
| Recipient | custodian profile where the authority was an accountable advance; otherwise the direct recipient label frozen from the allocation snapshots |
| Mechanism | channel (M-Pesa / bank transfer / cash / other) and an optional external reference string |
| Integrity | a human-readable release number; an immutable event row per transition |
| Disclosure | whether it descends from a `principal_direct` authority chain |

**Lifecycle.** Deliberately tiny: **`recorded`** → **`reversed`** (reason required). A release
either happened or was recorded in error. It has no review round, because the authority round
already happened one level up.

**Invariants.** The sum of non-reversed releases against one approved fund request may never
exceed its approved total. Zero, one or many releases per approval are all valid and all
meaningful — zero is precisely "approved but unpaid".

**Actors.** Recorded under Principal authority. Whether the Operations Manager may record their
own receipt, and whether receipt confirmation is a separate act, is decision **D2**.

**Requires a new table.** There is no existing table whose business meaning this fits.

---

## E2 — Fund acquittal *(new record family, with lines)*

Schema name `fund_acquittal`; the user-facing word stays **Reconciliation**, matching the settled
Finance area name "Funding, Payments and Reconciliation". Two words for one thing is acceptable
here because "reconciliation" is already committed in the product vocabulary while "acquittal" is
the precise term for retiring an advance.

**Responsibility.** What became of released money. This is where **actual expenditure** lives.

**Relationship to current records.** Child of one E1 release. Not a child of the claim: the claim
records what was *authorised*; the acquittal records what was *spent*. Keeping them apart is the
only way variance can be told truthfully.

**Required truth it owns.** Has the released money been reconciled; when; by whom; what was
actually spent and on what; what evidence supports it; was there an unspent balance; was more
money required; was money returned; what is the variance; is reconciliation complete or
outstanding.

**Minimum data.**

| Category | Content |
| --- | --- |
| Link | `fund_release_id` |
| Actual spend | acquittal **lines**: description, category (the same controlled vocabulary as claim lines), amount, service date |
| Balance | returned amount; additional-required amount |
| Variance | derived: released − actual spend − returned |
| Evidence | a **nullable text reference only**, until the evidence/attachment model exists as its own authorised domain — this model must not invent file storage |
| Actors | submitting Operations Manager; accepting Principal; timestamps for both |

**Lifecycle.** `not_required` | `outstanding → submitted → {accepted | amendment_requested →
submitted}`. Four live states and one exemption. No more.

**Actors.** Submitted by the Operations Manager who held the money; accepted by the Principal.
This preserves the same separation of duties as the claim: the person who spent does not certify
their own spending. Whether every release requires an acquittal is decision **D3**; how returned
money is recorded is decision **D4**.

**Requires a new table** (plus a lines table).

---

## E3 — No new stored status anywhere else

`internal_cost_claims.lifecycle`, `fund_requests.status`, `approval_requests.state` and
`daily_site_entries.state` are **unchanged**. Their existing terminal states are correct.

---

## E4 — Derived financial position *(read model, no stored state)*

A computed projection — a view or a security-definer function, decided at implementation time —
that answers, for any claim, fund request, project, or day:

`claimed → authorised → reserved → released → acquitted → returned → outstanding → variance`

Every consumer reads it and **none of them stores it**:

- **Daily Site Record** displays the financial position of its day.
- **Finance → Project Costs** shows authorised versus actual cost, and the variance between them.
- **Finance → Funding, Payments and Reconciliation** shows the approved / paid / reconciled
  three-state truth that image `13` calls for.
- **Approvals** shows what a decision led to, without holding it.
- **Project Summary** shows paid-to-date and balance-outstanding.

This is what keeps the promise of "no duplicate ledgers" in the operating-model decision record.

---

## E5 — Explicitly not designed here

Company Expenses, Staff Compensation, evidence/attachments, actual attendance, Maintenance and
Tools & Equipment are **not** designed in this document. Each is named in
`README.md` and in the dependency section below only to establish its interface with E1/E2.

---

## The state model — four independent axes

One overloaded status field cannot express the required truths. Four axes can, and only the last
two are new.

```
AXIS 1 — CLAIM              (exists, unchanged)
  draft → awaiting_review → approved | rejected
              ↑    ↓ amendment_requested
              └────┘
  withdrawn (from awaiting_review / amendment_requested)
  approved → cancelled
  principal-direct: → approved (round 0, actor stamped)

AXIS 2 — FUNDING AUTHORITY  (exists, unchanged)
  draft → submitted → approved | rejected
             ↑   ↓ amendment_requested
             └───┘
  withdrawn ; approved → cancelled
  principal-direct: → approved (round 0, actor stamped)

AXIS 3 — RELEASE            (NEW — derived from E1 rows)
  none → partially_released → fully_released
  (each row: recorded → reversed)

AXIS 4 — RECONCILIATION     (NEW — derived from E2 rows)
  not_required | outstanding → submitted → accepted
                                  ↑  ↓ amendment_requested
                                  └──┘
```

Axes 3 and 4 are **derived, never stored as a status column**. That is what makes the required
combinations representable without contradiction:

| Truth | Expression | Contradiction? |
| --- | --- | --- |
| **APPROVED + UNPAID** | axis 2 `approved`, axis 3 `none` | none |
| **APPROVED + PAID + UNRECONCILED** | axis 2 `approved`, axis 3 `fully_released`, axis 4 `outstanding` | none |
| Approved, part-paid, part-reconciled | axis 3 `partially_released`, axis 4 `accepted` on the paid part | none |
| Approved, never paid, cancelled | axis 2 `cancelled`, axis 3 `none` | none |
| No money needed at all | no claim exists; axes 2–4 are absent, not "outstanding" | none |

---

## The chain, end to end

```
Daily Site Record (operational, owns no money)
        │  optional source reference + frozen snapshot
        ▼
Internal cost claim ──── lines ──── CLAIM AMOUNT
        │  Principal decision (owner only, no self-decision)
        ▼
        APPROVED  ── authority to incur, NOT money ──┐
        │                                            │
        │  allocation (may be ≤ approved total)      │
        ▼                                            │
Fund request ──────────────────────────────────────► APPROVED
        │  authority to make money available, NOT money
        ▼
Fund release  [E1]   0..N rows, each partial or full  ── MONEY MOVED
        ▼
Fund acquittal [E2] ── lines ── ACTUAL EXPENDITURE
        ├── returned amount        ── unspent balance
        ├── additional required    ── shortfall
        └── variance               ── derived
        ▼
Derived position [E4] ──► Daily Site Record · Finance · Approvals · Project Summary
```

## The ten scenarios, tested

| # | Scenario | Result |
| --- | --- | --- |
| 1 | Claim X, approved in full, paid in full, spent exactly, reconciled | One claim, one fund request, one release, one accepted acquittal with zero variance. **Fully supported by the proposal.** |
| 2 | Approved for less than claimed | **Already supported today**, at the funding level: an allocation may be less than `claim_approved_total_snapshot`. Claim-level partial approval is *not* possible, because `decide_internal_cost_claim` forces `approved_total = submitted_total`. See **D1**. |
| 3 | Approved but not yet paid | Axis 2 `approved`, axis 3 `none`. **Requires E1 to exist** — today this state is indistinguishable from paid, because neither can be recorded. |
| 4 | Paid but not reconciled | Axis 3 `fully_released`, axis 4 `outstanding`. **Requires E1 + E2.** |
| 5 | Spent less than released | Acquittal lines total < released; the difference appears as returned amount and/or variance. **Requires E2.** See **D4**. |
| 6 | Paid in multiple releases | N rows in E1 against one approval; axis 3 moves `none → partially_released → fully_released`. **This is the scenario that rules out putting `paid_amount` on `fund_requests`.** |
| 7 | Unexpected cost after mobilisation, before the 4pm claim | **Already supported, no change.** `internal_cost_claims` has no uniqueness on project + day, and `daily_site_entry_id` may repeat, so a second claim on the same day and same entry is valid. |
| 8 | Cost arises after the day's decision | **Already supported, no change.** A claim carries its own `service_date` independent of `created_at`, so a claim raised today for yesterday is truthful. This scenario is the decisive argument for the two-close model below. |
| 9 | Principal exceptionally originates a claim | Supported today by `principal_authorise_internal_cost_claim` / `direct_authorise_fund_request`, both round 0 and both stamping `direct_authority_actor_id`. Separation of duties is preserved **by disclosure**. Any E1/E2 record descending from that chain must carry the disclosure forward. See **D4**. |
| 10 | No money required that day | The Daily Site Record closes on its own operational lifecycle (`accepted`). No claim, no request, no release, no acquittal. **"No financial follow-up" must be a first-class complete state, never rendered as outstanding.** Requires no new model — only that the derived position (E4) distinguishes *absent* from *outstanding*. |

---

## Project Costs versus Funding and Payment — the conceptual relationship

They are **not** the same thing and must not be collapsed:

- A **project cost** is an obligation incurred against a project. Its authorised value is the
  claim's `approved_total`; its actual value is the sum of acquittal lines attributed to it.
- A **fund release** is money leaving Botanique. It may precede expenditure (an advance), follow
  it (a reimbursement), be smaller than the authorised cost, or be split across days.
- Therefore: authorised cost, released money and actual cost are three different numbers, and
  **Project Costs must display all three plus the variance** rather than presenting any one as
  the cost.
- A tool purchased on site produces *both* a Finance expenditure record *and* a Tools & Equipment
  asset/custody consequence. Per the operating-model decision record, Finance records the
  commercial purchase **once** and Operations receives the resulting inventory records without
  re-entering commercial detail. E2's acquittal line is the natural handoff point; the inventory
  side is out of scope here.

---

## Daily Site Record handoff — required relationships only

Images `08` and `09` establish the handoff: Daily Site Record → cost claims → Principal decision →
payment status → reconciliation status. The relationships needed to support it **already exist or
are added by E1/E2**:

```
daily_site_entries.id
   └── internal_cost_claims.daily_site_entry_id          (EXISTS)
         └── fund_request_allocations.internal_cost_claim_id  (EXISTS)
               └── fund_requests.id
                     └── fund_release.fund_request_id     (NEW, E1)
                           └── fund_acquittal.fund_release_id (NEW, E2)
```

No new foreign key is needed on `daily_site_entries` itself, and none should be added. The Daily
Site Record reaches the financial position by traversing the chain through E4 and **displays**
it. It stores nothing financial and creates nothing. The safeguard is intact.

---

## Daily close — operational close versus financial reconciliation

**Recommendation: two separate closes. Only the operational one happens at ~5:00 pm.**

**Operational close (~5:00 pm).** `daily_site_entries.state = 'accepted'`. This already exists and
needs no change. It asserts that the day's operational record is complete, truthful and reviewed.
It must require **nothing financial** — not a submitted claim, not a decision, not a release, not
a reconciliation.

**Financial settlement (whenever it genuinely completes).** A derived, dateless condition: every
claim carrying that service date is decided; every approved funding authority is fully released or
explicitly cancelled; every release is acquitted and accepted. It is computed from E4, never
stored, and never forced.

**Why.** Receipts legitimately arrive after 5:00 pm, and scenario 8 proves a cost can surface
after the decision. Requiring financial completeness at operational close would force one of two
lies: a fabricated reconciliation, or a day held permanently open. Both are worse than showing two
honest states.

**The trade-off, stated plainly.** Two closes must be explained in the interface, and a day can
legitimately read "operationally closed" while money is still outstanding. That is exactly why the
Daily Site Record must *display* the financial position prominently without owning it — which is
what image `09`'s "approval is not payment" notice already anticipates.

This is decision **D5** and requires Founder confirmation.

---

## Dependencies this model creates for other domains

| Domain | Dependency |
| --- | --- |
| **Company Expenses** | Overheads (company email, hosting, storage, software, X / Instagram / Facebook / Google advertising, marketing, professional fees, bills) have **no table today** and must **not** be forced into `internal_cost_claims`, which is project-scoped by a non-null `project_id`. They need their own record with the same claim → decision → release → reconciliation spine, reusing E1/E2 rather than duplicating them. Blocked on this authority; not designed here. |
| **Staff Compensation** | **Nothing in the repository represents compensation, payroll or a staff payment.** `people_engagements` carries no rate and no pay. Martine's compensation cannot be represented anywhere today. It must **not** be modelled as another Daily Site Record cost claim — the decision record already requires it to distinguish personal compensation, casual-worker money administered by a staff member, purchases made by a staff member, reimbursements and advances. It depends on E1 for the payment leg and E2 for the accountable-advance leg. Not designed here. |
| **Approvals aggregation** | Needs a read-side union across `approval_requests`, `internal_cost_claims` and `fund_requests`, plus the E4 position so a decision can show what it led to. It must remain a **decision surface**, never the payment ledger. Migrating claims or fund requests into `approval_requests` is explicitly rejected. |
| **Project Summary** | Cannot show paid-to-date, balance outstanding or actual-versus-authorised cost until E1/E2/E4 exist. Its budget, retention, certified-to-date and attendance panels remain blocked on other models. |
| **Evidence / attachments** | E2 deliberately carries only a nullable text reference. Real file evidence remains its own blocked domain, gated on the storage-backup posture recorded earlier (PITR off, Storage excluded from database backups). |
| **Tools & Equipment** | Receives inventory consequences from an acquittal line describing a purchase. Strictly separate from Finance's expenditure truth: one purchase, one expenditure record, one or more asset records, no duplicated commercial detail. |
| **WhatsApp support** | Unrelated to this model and **unblocked**. `CONTACT.whatsapp = "254720861592"` in `src/utils/backend.js` and `waLink()` in `src/utils/whatsapp.js` already exist and are unchanged by this authority. The admin `HelpCard` still reads "Contact your system admin" and links nowhere. Pointing it at the existing helper is a small, separate shell/support unit; it is deferred, not blocked, and it is not made the main task merely because it is small. |
