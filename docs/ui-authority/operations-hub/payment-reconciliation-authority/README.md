# BD-FIN-01C — Payment and Reconciliation Authority

Settled on 9 August 2026, against `origin/main` `8066b8cb5a32b705b909a87805f302471d9c33fd`
(the merge of PR #95).

This is **step 2 of the recommended sequence** recorded in `WORKSTREAMS.md` on 9 August 2026:
the Founder decision that unblocks Finance, Project Summary and the daily close-out. It is the
authority that must exist before the payment/reconciliation schema can be written.

## What this directory is

| File | Contents |
| --- | --- |
| `README.md` | This orientation, the scope boundary, and the three settled image rulings |
| `current-state-model-map.md` | What the repository can and cannot represent today, table by table, and the exact line at which the model terminates |
| `proposed-domain-model.md` | The smallest coherent future entity set, the four-axis state model, and the ten scenarios tested against it |
| `founder-decisions-required.md` | The five decisions that genuinely still need the Founder, each with options, consequences and a recommendation |

## What this directory is NOT

- **Not implementation authority.** As with `../operating-model-authority/`, a separate explicit
  authorisation is required before any migration, table, column, RLS policy, RPC, route or
  component is written. Nothing proposed here exists.
- **Not a schema.** No SQL appears anywhere in this directory by design. Entities are described
  conceptually so the Founder can rule on the business meaning before anyone commits to a shape.
- **Not a data change.** No production row was read for modification or modified.
- **Not a redefinition of the images.** The fourteen authority PNGs are untouched.

## The rule this authority exists to make representable

The Founder-settled daily rhythm is:

1. **Morning site record** — Operations records the morning position for every active site.
2. **Cost claim by ~4:00 pm** — normally originated by Martine / Operations.
3. **Principal decision by ~4:30 pm** — approve, reject, or request amendment.
4. **Payment / release** — approval is authority; it is not money.
5. **Reconciliation** — what the released money was actually used for.
6. **Close-out at ~5:00 pm** — the operational record reflects the known position.

The historical safeguard remains absolute and is restated here without weakening: **the morning
Daily Site Record must never automatically create a liability, payment, release, reimbursement,
approval, invoice or expenditure transaction.** It may guide the downstream workflow and display
status. It may not become the ledger.

Five concepts must never be collapsed into one another:

```
CLAIM / REQUEST  ≠  APPROVAL / DECISION  ≠  FUND RELEASE  ≠  ACTUAL EXPENDITURE  ≠  RECONCILIATION
```

and therefore:

```
APPROVED ≠ PAID          PAID ≠ RECONCILED
```

The repository today can represent the first two and nothing after them. `current-state-model-map.md`
proves that from the migrations rather than asserting it.

## Separation of duties — preserved, not relaxed

The ordinary flow is **Martine / Operations raises, Principal decides**. The database already
enforces this: `create_internal_cost_claim_draft`, `update_internal_cost_claim` and
`submit_internal_cost_claim` require the `manager` role; `decide_internal_cost_claim` and
`decide_fund_request` require `owner` and refuse a self-decision by constraint
(`internal_cost_claim_no_self_decision`, `fund_request_no_self_decision`).

A Principal-originated claim is an **exceptional correction/override path, not the ordinary
operating flow.** It exists today as `principal_authorise_internal_cost_claim` and
`direct_authorise_fund_request`, both constrained to round 0 and both stamping
`direct_authority_actor_id`. Separation of duties is therefore preserved *by disclosure* rather
than by prevention — the override is always identifiable. Any future release or reconciliation
record descending from a principal-direct chain must carry that disclosure forward visibly. See
decision **D4**.

## The three settled image rulings — 9 August 2026

PR #95 recorded three tensions between the frozen working-authority images and the settled
operating model. The Founder has now ruled on all three. **The PNGs remain frozen and unaltered;
these rulings govern how they are read.**

### A. Image `06` — "Project Templates" is not product architecture

Image `06-project-register-working-authority.png` shows a **Project Templates** destination in
its sidebar. This is **not approved product architecture**. The authoritative Projects structure
remains:

```
Projects
├── Project Register
└── Project Proposals
```

There is no approved Project Templates module, route, capability or model, and none may be
implemented on the strength of this image. The element is illustrative and does not override the
operating-model authority. `src/admin/navigation.js` is already correct and requires no change.

### B. Image `13` — Finance keeps its in-page area treatment

The five Finance capabilities remain authoritative and unchanged:

1. Overview
2. Project Costs
3. Company Expenses
4. Staff Compensation
5. Funding, Payments and Reconciliation

They are **not** required to become persistent expanded sidebar children. The navigation decision
implemented by PR #94 stands: **Finance is one top-level domain with its internal departmental
navigation handled through the Finance surface / in-page treatment** (Option B of
`../operating-model-authority/decision-record.md`). The deep-sidebar treatment visible in image
`13` must not be reinstated on the strength of that image.

Image `13`'s three-state **approved → paid → reconciled** truth model is a separate matter: it is
*correct as direction* and is precisely what this authority exists to make representable. It is
still not implementable until the Founder rules on `founder-decisions-required.md`.

### C. Image `11` — Maintenance and Tools & Equipment stay distinct

Maintenance and Tools & Equipment remain **two distinct Operations capabilities**:

```
Operations
├── Daily Site Record
├── People
├── Maintenance          (future — no model)
└── Tools & Equipment    (future — no model)
```

Image `11-maintenance-tools-equipment-working-authority.png` may provide composition guidance and
nothing more. It must **not** be read as merging their domain models or eliminating either
destination.

## Related authority

- `../README.md` — the four approved screens and nine binding interpretation rules.
- `../operating-model-authority/decision-record.md` — the settled architecture. Where an image and
  the decision record disagree, the decision record wins. An addendum there records the three
  rulings above.
- `../working-authority/README.md` — the ten frozen composition screens, with the three tensions
  now marked settled.
- `../../../WORKSTREAMS.md` — the dated programme record.
