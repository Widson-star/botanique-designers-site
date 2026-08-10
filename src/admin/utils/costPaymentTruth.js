// What has actually been paid against one project cost — and, just as often,
// the honest admission that the Hub does not know.
//
// FOUNDER AMENDMENT, 10 August 2026. Project Costs stops leading with funding
// mechanics ("Financial position", "Not yet funded — no fund request") and
// starts answering the three questions a Principal actually asks:
//
//     What was the cost?   How much has been paid?   What is left?
//
// THE HARD PART IS THAT THE HUB USUALLY CANNOT ANSWER THE SECOND ONE.
//
// `fund_releases.fund_request_id` is NOT NULL. A payment can therefore only
// exist in this product hanging off a fund request, and releases are recorded
// against the REQUEST, never against a claim — claims reach requests through
// `fund_request_allocations`, many-to-many. Two consequences follow and both are
// respected here:
//
//   1. Most historical Botanique costs were genuinely paid, in cash or M-Pesa,
//      long before this module existed. They have no fund request, so the Hub
//      holds no payment record for them. That is MISSING KNOWLEDGE, not a zero.
//   2. Even where a fund request exists, a release belongs to the request. It is
//      never apportioned across the claims that request funds — claimFunding.js
//      has refused to pro-rate since PR #99 and that rule is not weakened here.
//
// So `paid` and `balance` are NULL — rendered as "—" — unless the Hub genuinely
// holds the payment truth for that single cost. Showing "Paid KES 0 · Balance
// KES 5,950" for a cost the Founder paid in July would be a lie the register
// tells every time it is opened, and it is exactly what this module exists to
// prevent.
//
// Nothing here fabricates, infers or backfills a payment. Approval is never
// treated as payment.

import { fundingForClaims } from "./claimFunding";

export const PAYMENT_KNOWLEDGE = {
  // The Hub holds a release that unambiguously belongs to this one cost.
  known: "known",
  // No fund request, so no payment record exists here. The cost may well have
  // been paid outside the Hub; this product simply does not know.
  unrecorded: "unrecorded",
  // A fund request exists and funds several claims, so no per-cost figure can
  // be stated without apportioning a release, which is forbidden.
  shared: "shared",
  // Nothing to pay: the cost was never approved.
  not_payable: "not_payable",
};

function round(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

export function costTotal(claim) {
  return round(claim?.approvedTotal ?? claim?.submittedTotal ?? 0);
}

// The payment position of ONE cost. `finance` is the read-only fund-request
// context; without it nothing about money is asserted at all.
export function costPaymentTruth(claim, finance = null) {
  const total = costTotal(claim);

  if (!claim || !["approved"].includes(claim.lifecycle)) {
    return {
      knowledge: PAYMENT_KNOWLEDGE.not_payable,
      total,
      paid: null,
      balance: null,
      note: claim?.lifecycle === "cancelled"
        ? "Cancelled after approval."
        : "Not approved, so nothing is payable yet.",
    };
  }

  const funding = finance ? fundingForClaims([claim.id], finance) : null;

  // No fund request behind this cost. The Hub holds no payment record — which is
  // NOT the same as the cost being unpaid, and must never be shown as KES 0.
  if (!funding || funding.fundingPosition === "not_requested") {
    return {
      knowledge: PAYMENT_KNOWLEDGE.unrecorded,
      total,
      paid: null,
      balance: null,
      note: "Payment has not been recorded in the Hub. It may have been paid outside it.",
    };
  }

  // The authority behind this cost also funds other costs. A release belongs to
  // the whole authority, and apportioning it would invent a per-cost figure the
  // database does not hold.
  if (funding.requests.some((entry) => entry.coversOtherClaims)) {
    return {
      knowledge: PAYMENT_KNOWLEDGE.shared,
      total,
      paid: null,
      balance: null,
      note: "Funded together with other costs, so no separate paid figure exists for this one.",
      requests: funding.requests,
    };
  }

  // One authority, this cost only. Its releases are this cost's payments.
  const paid = round(funding.releasedAmount);
  return {
    knowledge: PAYMENT_KNOWLEDGE.known,
    total,
    paid,
    balance: round(Math.max(total - paid, 0)),
    note: paid >= total
      ? "Paid in full."
      : paid > 0 ? "Part paid." : "Approved and funded, but nothing released yet.",
    requests: funding.requests,
  };
}

// Display helpers. A null amount is "—" and never "KES 0": the difference
// between "we paid nothing" and "we have not recorded it" is the whole point.
export function paidDisplay(truth, money) {
  return truth.paid == null ? "—" : money(truth.paid);
}

export function balanceDisplay(truth, money) {
  return truth.balance == null ? "—" : money(truth.balance);
}

// The register's portfolio line. Costs whose payment truth is unknown are
// counted separately rather than silently folded into "unpaid".
export function summarisePaymentTruth(claims = [], finance = null) {
  let total = 0;
  let paid = 0;
  let balance = 0;
  let unrecorded = 0;

  claims.forEach((claim) => {
    const truth = costPaymentTruth(claim, finance);
    total = round(total + truth.total);
    if (truth.paid == null) {
      if (truth.knowledge !== PAYMENT_KNOWLEDGE.not_payable) unrecorded += 1;
      return;
    }
    paid = round(paid + truth.paid);
    balance = round(balance + truth.balance);
  });

  // When the Hub holds payment truth for NOTHING in view, a "Paid KES 0" line is
  // the same lie the row-level rule exists to prevent. Report it as unknown.
  const anyKnown = claims.some((claim) => costPaymentTruth(claim, finance).paid != null);
  return {
    total,
    paid: anyKnown ? paid : null,
    balance: anyKnown ? balance : null,
    unrecordedCount: unrecorded,
  };
}
