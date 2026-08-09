# Findings by category, and the Founder decisions still genuinely required

> **Status: all five decisions in Category C were settled by the Founder on 9 August 2026.**
> The rulings as given are recorded in `founder-rulings-settled.md` and govern. Two of them are
> narrower than the recommendation below — **D2** (recipient acknowledgement is not universally
> required, and no Finance Officer role exists) and **D4(ii)** (the ruling addresses overrides of
> an abnormal *reconciliation* position; it did not re-open the principal-direct claim reason).
> Read the rulings before implementing anything from this file.

Findings are separated so that only genuinely open questions reach the Founder. Category C is kept
deliberately small: **five decisions**, each in plain language, each with concrete options,
consequences and a recommendation.

---

## A. Already settled by existing authority — no decision needed

1. **Approval is not payment.** Stated in the BD-FIN-01B1 migration header, on image `09` and on
   image `13`. Binding.
2. **The Daily Site Record creates no financial transaction.** The historical safeguard. Binding.
3. **Separation of duties.** Martine / Operations raises, the Principal decides. Already enforced
   in the database by role checks and by the two no-self-decision constraints.
4. **The five Finance areas**, in order: Overview, Project Costs, Company Expenses, Staff
   Compensation, Funding Payments and Reconciliation. Settled in the operating-model decision
   record and re-confirmed by ruling **B** in `README.md`.
5. **Finance is one shell destination with an in-page area selector** (Option B). Confirmed
   against image `13`.
6. **Projects is Project Register + Project Proposals.** No Project Templates. Confirmed against
   image `06`.
7. **Maintenance and Tools & Equipment are two distinct capabilities.** Confirmed against image
   `11`.
8. **Approvals aggregates decisions and is never a ledger.** Operating-model decision record.
9. **Finance records a commercial purchase once; Operations receives the inventory consequence.**
   Operating-model decision record.
10. **Staff Compensation is its own Finance capability**, distinguishing personal compensation,
    casual-worker money administered by a staff member, purchases by a staff member,
    reimbursements and advances. It is not a Daily Site Record cost claim.
11. **The WhatsApp destination.** `CONTACT.whatsapp = "254720861592"`, `waLink()`. Unchanged, and
    no number needs inventing.

---

## B. Clearly implied by the current model plus settled authority — no decision needed

1. **Release and reconciliation need their own records.** Nothing existing can hold them, and both
   `fund_requests` and `internal_cost_claims` state in their own headers that they deliberately do
   not.
2. **Release must support zero, one or many rows per approval, each partial.** Directly implied by
   scenario 6, and the reason a `paid_amount` column on `fund_requests` is rejected.
3. **Release and reconciliation state must be derived, not stored as a status column.** The only
   way `APPROVED + PAID + UNRECONCILED` is expressible without contradiction.
4. **Actual expenditure ≠ released amount ≠ authorised amount.** Project Costs must show all three
   plus variance.
5. **A same-day second claim and a next-day correction claim both already work.** Scenarios 7 and
   8 need no schema change.
6. **"No money required" is a complete state, not an outstanding one.** Scenario 10.
7. **Company Expenses cannot use `internal_cost_claims`**, whose `project_id` is `not null`.
8. **Evidence stays a text reference until the attachment domain is authorised**, because the
   storage-backup posture is unresolved.
9. **Approvals aggregation is a read-side union**, not a table migration.

---

## C. Requires an explicit Founder decision before schema implementation

### D1 — Where is a partial approval expressed?

**In plain language.** Martine claims KES 50,000. The Principal is willing to accept the day's
costs but only wants KES 35,000 to go out. Where does the "35,000" get recorded?

Today, `decide_internal_cost_claim` forces the approved amount to equal the claimed amount — a
claim is approved in full or not at all. But a fund request may already allocate *less* than a
claim's approved total, so the reduction is expressible one level down without any change.

| Option | What it means | Consequence |
| --- | --- | --- |
| **(a) At the funding level — recommended** | The claim is approved as a true statement of what the day cost; the fund request makes less money available | **No migration.** Works today. Honest: the cost was real, the money released was limited. Requires the interface to explain the difference |
| (b) At the claim level | Add a Principal-set approved amount to the claim decision | Schema change to a table whose decision path is otherwise complete. Risks reading as "the day cost less than it did" |
| (c) Neither — use amendment | The Principal returns the claim asking Martine to reduce it | Truthful but slow, and it cannot meet a 4:30 pm decision target on a busy day |

**Recommendation: (a).** It needs no schema change, it is already how the reservation model works,
and it keeps the cost record honest. Where the Principal disputes the *cost itself* rather than the
*amount to release*, `amendment_requested` is the correct existing path.

---

### D2 — Who may record that money was released?

**In plain language.** When cash actually goes to Martine, who types that into the system?

| Option | What it means | Consequence |
| --- | --- | --- |
| (a) Principal only | Only the Principal records a release | Strongest separation. But the Principal must return to the system after paying, and until they do the record shows unpaid when money has moved |
| **(b) Principal records; Operations Manager confirms receipt — recommended** | Two fields on one release row: released-by and received-confirmed-by | Preserves separation, and adds a genuinely useful "released but not yet confirmed received" state at the cost of two nullable columns. No extra table |
| (c) Either party may record | Whoever is at a device records it | Fastest. But the custodian could record their own receipt of money nobody confirms sending — the exact control weakness the claim model was built to avoid |

**Recommendation: (b).** It matches how the money actually moves, keeps the person who receives
from being the sole author of the record, and costs nothing structurally.

---

### D3 — Does every release need a reconciliation?

**In plain language.** If Botanique pays a supplier directly, is there anything left to reconcile?

Recall the two custody types already in the model: an **accountable advance** into an Operations
Manager's hands, and **direct recipient funding** paid straight to the payee.

| Option | What it means | Consequence |
| --- | --- | --- |
| **(a) Required for accountable advances; `not_required` for direct funding — recommended** | Only money someone *holds* must be acquitted | Matches reality. The existing `intended_custody_type` already tells the system which case applies, so this needs no new field |
| (b) Required for every release | Every payment gets a reconciliation record | Uniform and simple to explain, but generates empty paperwork for direct supplier payments and will train people to click through it |
| (c) Always optional | Reconciliation is encouraged, never enforced | Cheapest, and it quietly destroys the ability to say reconciliation is outstanding — the thing this whole model exists to make truthful |

**Recommendation: (a).** Note that direct funding still needs evidence eventually; that belongs to
the evidence domain, not to this one.

---

### D4 — How is unspent money recorded, and how visible is the Principal override?

Two small questions bundled because both are about recording an exception honestly.

**(i) Unspent money.** Martine is released KES 35,000 and spends KES 31,200.

| Option | Consequence |
| --- | --- |
| **(a) An amount on the reconciliation record — recommended** | Smallest truthful model. Variance is computed as released − spent − returned. One number, no new table |
| (b) A separate return transaction record | Justified only if returns themselves need approval or a payment reference. Nothing so far suggests they do |

**Recommendation: (a).** A separate return record earns its place later if returns turn out to need
their own authority; it does not today.

**(ii) Principal-originated claims.** `principal_authorise_internal_cost_claim` currently takes an
**optional** reason. When the Principal both raises and authorises, the override should never be
silent.

| Option | Consequence |
| --- | --- |
| **(a) Make the reason mandatory on both principal-direct paths, and carry the override disclosure onto every descendant release and reconciliation — recommended** | Separation of duties is preserved by disclosure. Slightly stricter than today; a genuine schema/function change |
| (b) Leave the reason optional; disclose only on the claim | No change, but an unexplained override is possible and downstream records look ordinary |

**Recommendation: (a).** The override path is legitimate and must stay available — it simply must
never be indistinguishable from the ordinary flow.

---

### D5 — Does the day close at 5:00 pm even when money is outstanding?

**In plain language.** At 5:00 pm the site work is done and the record is accurate, but a receipt
has not arrived. Is the day closed?

| Option | What it means | Consequence |
| --- | --- | --- |
| **(a) Two closes — recommended** | Operational close at ~5:00 pm on the operational record alone; financial settlement completes whenever it genuinely completes | Honest at both ends. Nothing is fabricated and nothing is held hostage. Costs one extra concept to explain in the interface, and a day can read "closed" while money is outstanding |
| (b) One close requiring financial completeness | The day closes only when claim, decision, release and reconciliation are all done | Reads tidier. In practice it forces either a fabricated reconciliation or a permanently open day — scenario 8 shows a cost can appear *after* the decision |
| (c) One close requiring claim and decision only | A middle position: money must be decided, not settled | Better than (b), but still blocks operational close on a financial step, and still cannot handle scenario 8 |

**Recommendation: (a).** It is the only option that keeps the 5:00 pm rhythm without making the
system lie. The Daily Site Record should show the financial position prominently — exactly as image
`09` composes it — while owning none of it.

---

## What happens once these five are settled

The payment/reconciliation **implementation** unit becomes authorised to proceed: two new record
families, their immutable event logs and RLS, one derived position, and no change to any existing
lifecycle. Until then, nothing here may be implemented.
