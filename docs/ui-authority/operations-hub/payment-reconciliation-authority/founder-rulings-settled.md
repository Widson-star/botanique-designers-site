# The five Founder rulings — settled 9 August 2026

`founder-decisions-required.md` put five decisions to the Founder. All five are now settled. This
file records the **rulings as given**, and is the authority the payment/reconciliation
implementation unit must be written against. Where a ruling differs from the recommendation in
`founder-decisions-required.md`, **the ruling below wins**.

Nothing in this file is implemented. No release, acquittal or reconciliation schema exists in the
repository, and none may be written on the strength of this file alone.

---

## D1 — Partial approval stays at the funding level

**Ruling.** Do **not** introduce another partial-approval state on cost claims. The current
funding/allocation level already permits the funded amount to be less than the approved claim
amount. Retain that distinction.

Authorised project cost and cash actually funded or released are **not the same concept**. A claim
is approved as a true statement of what the day cost; the fund request governs how much money is
made available against it.

**Consequence.** No schema change to `internal_cost_claims`. `decide_internal_cost_claim` keeps
approving the claimed amount in full. Where the Principal disputes the *cost itself* rather than
the *amount to release*, `amendment_requested` remains the correct existing path. The interface
carries the burden of explaining the difference.

---

## D2 — The Principal records the release; recipient acknowledgement is not universal

**Ruling.** The ordinary future flow is:

```
Operations requests  →  Principal decides  →  Principal records the actual release / payment
```

Where an **accountable advance** is made to Martine / Operations, the receiving person **may**
confirm receipt. Recipient acknowledgement is **not universally required**: if Botanique pays a
supplier directly, Martine must not be forced to acknowledge receiving money he never received.

**No Finance Officer role is to be invented.** The existing `owner` / `manager` authority stands.

**Consequence.** This is narrower than option (b) in `founder-decisions-required.md`. A
receipt-confirmation field may exist on a future release record, but it must be **optional and
meaningful only for accountable advances** — never a required step that manufactures a false
acknowledgement on a direct payment.

---

## D3 — Reconciliation follows custody, not every payment

**Ruling.** Do **not** require an artificial acquittal/reconciliation workflow for every direct
payment.

```
accountable advance                        →  reconciliation required
direct supplier / vendor / settled payment →  payment or expenditure evidence
                                           →  no artificial advance acquittal
```

Direct settled payments require truthful expenditure/payment evidence. They do not need a second,
fictional advance-acquittal process.

**Consequence.** `intended_custody_type` already distinguishes the two cases, so this needs no new
field. **No schema implementation of this ruling belongs in the current PR.**

---

## D4 — Unspent money lives on the reconciliation record, and overrides stay visible

**Ruling.** Future accountable-advance reconciliation must be capable of truthfully establishing:

- the amount released
- the amount actually spent
- the unspent / returned amount
- any additional amount legitimately required
- the variance

The unspent/returned position belongs to the **reconciliation / acquittal record**, not to a
disconnected balance object.

Any **exceptional override or closure of an abnormal reconciliation position must require a reason
and must remain visible in history.**

**Consequence.** No separate return-transaction entity. This schema is **not implemented yet**.

---

## D5 — Two closes: operational close and financial settlement are distinct

**Ruling.** There are two distinct concepts — **operational close** and **financial settlement**.

The Daily Site Record may close operationally around the normal 5:00 pm end-of-day rhythm without
requiring final financial reconciliation. Financial reconciliation may legitimately occur later.

However, **operational close must not erase or hide outstanding financial workflow.** The Daily
Site Record should eventually be capable of visibly distinguishing positions such as:

- no financial follow-up required
- claim outstanding
- awaiting decision
- approved but unpaid
- funded
- reconciliation outstanding
- financially settled

These are **linked / derived financial indicators**. The Daily Site Record itself must **not**
become the financial ledger.

**Consequence.** Only the first four of those positions are derivable from the repository as it
stands today, and the implemented hand-off (see below) shows exactly those. The remainder —
*funded*, *reconciliation outstanding*, *financially settled*, and any "paid" or "released"
wording — require the unbuilt payment/reconciliation model and must not be displayed before it
exists.

---

## What the Daily Site Record → cost claim hand-off now supports

Implemented against these rulings, without any schema, migration or RLS change:

| Position | Source | Shown |
| --- | --- | --- |
| No cost claim yet | no related `internal_cost_claims` row | yes |
| No cost claim expected | `disposition = no_work` | yes |
| Claim cannot be raised yet | entry not submitted / not live | yes |
| Draft claim | `lifecycle = draft` | yes |
| Awaiting the Principal's decision | `awaiting_review` | yes |
| Amendment requested | `amendment_requested` | yes |
| Approved (authority to incur, not payment) | `approved` | yes |
| Rejected / withdrawn / cancelled | those lifecycles | yes |
| Several related claims for the same day | linked or same project + service date | yes |

The relationship is the existing one: `internal_cost_claims.daily_site_entry_id`, plus
`project_id` + `service_date` for a same-day claim raised directly in Site Costs. No new
relationship was created.

## What remains unsupported

Because no payment/reconciliation model exists:

- **funded**, **released**, **paid**, **reconciled** and **financially settled** are not derived,
  stored or displayed anywhere;
- there is no release record, acquittal record, payment amount, payment reference, returned-balance
  field or reconciliation evidence model;
- there is no operational close-out action, so "closed operationally while money is outstanding"
  is a rule this authority states, not a state the software records.

The Daily Site Record remains an **operational record**. It reads the claim position and links to
it. Site Costs remains authoritative for the claim, its lines and its decision history. The
historical safeguard is unweakened: the Daily Site Record creates no liability, payment, release,
reimbursement, approval, invoice or expenditure transaction, and creates no cost claim on its own —
a person must choose to raise one.

## The next implementation unit

The minimal payment/release plus accountable-advance reconciliation model authorised by BD-FIN-01C
and the five rulings above. It is **not** in this unit.
