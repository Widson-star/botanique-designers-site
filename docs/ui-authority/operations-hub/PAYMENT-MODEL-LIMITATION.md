# Authority report — recording a payment that already happened

**10 August 2026. STOP-AND-REPORT, per the Founder brief §7 and §35. No
migration was added. PR #102 continues safely without one.**

The Founder ruled that an approved Botanique cost must be able to record an
actual payment truthfully, including a payment made before the Hub's payment
module existed, and that a fund request is required only where money must be
made available beforehand. The current schema cannot do that. Here is exactly
why, and the smallest extension that would fix it.

## 1. Current model limitation

```sql
create table public.fund_releases (
  ...
  fund_request_id uuid not null references public.fund_requests(id) on delete restrict,
  ...
);
```

`fund_request_id` is **NOT NULL**. A payment can only exist in this product
hanging off a fund request.

A second constraint compounds it: a release belongs to the **request**, and a
cost claim reaches a request through `fund_request_allocations`, which is
many-to-many. There is no claim-level payment anywhere in the schema.

## 2. Why a directly paid cost cannot be represented

To record "this KES 5,950 cost was paid in cash on 31 July", the only available
path today is to **fabricate a fund request** — a request nobody raised, that
nobody approved, dated to make the release legal. That would:

- invent an approval event and an approver who never decided;
- corrupt every "approved — not yet released" figure, because the fake authority
  would count as authorised money;
- make `fund_request_financial_position()` describe a request that never existed.

The Founder's brief forbids exactly this, and so does the integrity model.

**Consequence in the product today:** every historically paid cost has no fund
request, so the Hub holds no payment record. PR #102 therefore shows **Paid —**
and **Balance —**, never `KES 0`, and counts those costs separately. That is
honest, but it is not the same as being able to record the payment.

## 3. Smallest recommended extension

Make the link optional and give a release a second, equally valid parent.

```sql
alter table public.fund_releases
  alter column fund_request_id drop not null,
  add column internal_cost_claim_id uuid null
    references public.internal_cost_claims(id) on delete restrict,
  add constraint fund_release_parent_exactly_one check (
    (fund_request_id is not null and internal_cost_claim_id is null)
    or
    (fund_request_id is null and internal_cost_claim_id is not null)
  );
```

A release then has exactly one parent: **an authority** (money made available
first) or **a cost** (money paid directly against an approved cost). Never both,
never neither.

One further column is worth having, and nothing else:

```sql
  add column recorded_context text not null default 'hub'
    check (recorded_context in ('hub', 'historical'));
```

`historical` marks a payment that happened before the Hub existed, so a
back-record is never mistaken for a live one and can always be filtered out of
operational reporting.

## 4. How this preserves PR #98 integrity

- **Nothing existing changes shape.** Every current release keeps its
  `fund_request_id`; the check constraint is satisfied by every existing row.
- **`fund_request_financial_position()` is untouched.** It scopes by
  `fund_request_id`; direct-cost releases have none, so they never enter an
  authority's released, reconciled or variance arithmetic.
- **The accountable-advance rules are unaffected.** A direct-cost release would
  be `direct_recipient_funding` only — an advance is by definition money made
  available in advance, which is what a fund request is for. That can be enforced
  by extending `fund_release_recipient_consistency`.
- **No release is ever apportioned.** A cost-parented release belongs to exactly
  one cost, which is what finally makes a per-cost Paid figure derivable without
  inventing anything.

## 5. How historical payment would be recorded

Principal opens an approved cost → **Record payment** → amount, date, channel,
reference, payee → saved as a release parented to the cost, `recorded_context =
'historical'`. No fund request is created. Project Costs then shows real Paid and
Balance instead of dashes.

## 6. How new direct payments would work

Identical, with `recorded_context = 'hub'`. This is the ordinary path for a cost
paid on the spot with no advance — which the Founder notes is most of them.

## 7. How accountable advances stay different

Unchanged. An advance is money handed over **before** it is spent, so it still
requires a fund request, still carries a custodian, and still demands an
acquittal. The distinction becomes clearer, not weaker: a fund request now means
"money needed in advance", and a cost-parented release means "this cost was
paid".

## 8. Migration / RLS / RPC scope

| Object | Change |
| --- | --- |
| `fund_releases` | drop NOT NULL, add two columns, add one check constraint |
| `fund_release_recipient_consistency` | extend to forbid an advance on a cost-parented release |
| `record_fund_release` RPC | accept a claim parent; keep every existing guard |
| New `record_cost_payment` RPC | Principal-only; requires `lifecycle = 'approved'`; rejects over-payment |
| RLS | reuse the existing `fund_releases` policies — the visibility rule is the project, which both parents reach |
| Reversal / acquittal | unchanged |

Additive only. No data backfill. No existing row rewritten.

## 9. Can PR #102 continue without it?

**Yes.** PR #102 ships the amended register and shows payment truth as unknown
where the Hub has none — which is correct with or without this extension. When
the extension lands, the same columns fill in with real figures and no visual
work is repeated. `costPaymentTruth.js` is the single place that would change.

**Awaiting a Founder ruling before any migration is written.**
