// Project Cost payment truth.
//
// Founder ruling, 11 Aug 2026:
// Project Costs answers only three money questions:
//   What was the cost? How much was actually paid? What remains?
//
// Payment truth now comes from first-class Project Cost payments, not from
// fund requests or releases. Historical approved costs remain unknown until the
// Principal confirms that the Hub holds their complete payment history.

export const PAYMENT_KNOWLEDGE = {
  known: "known",
  unrecorded: "unrecorded",
  not_payable: "not_payable",
};

function round(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

// FOUNDER RULING, 12 Aug 2026. Draft means NOT YET SUBMITTED. It does not mean
// zero cost. A draft has no submittedTotal yet, but it already owns structured
// cost lines, and showing KES 0.00 for a draft holding KES 5,350 of lines is
// simply untrue. Where a decided amount exists it still wins — a line total
// never overrides what was submitted or approved.
export function costTotal(claim, lines = null) {
  const decided = claim?.approvedTotal ?? claim?.submittedTotal;
  if (decided != null) return round(decided);
  if (Array.isArray(lines) && lines.length > 0) {
    return round(lines.reduce((sum, line) => sum + Number(line.lineTotal || 0), 0));
  }
  return 0;
}

// The payment position of ONE cost, from its first-class payment position.
// `lines` lets a draft state its structured line total, which is a question
// about the cost, not about payment.
export function costPaymentTruth(claim, position = null, lines = null) {
  const total = costTotal(claim, lines);

  if (!claim || claim.lifecycle !== "approved") {
    return {
      knowledge: PAYMENT_KNOWLEDGE.not_payable,
      total,
      paid: null,
      balance: null,
      paymentCount: 0,
      historicalSettlement: 0,
      note: claim?.lifecycle === "cancelled"
        ? "Cancelled after approval."
        : "Not approved, so nothing is payable yet.",
    };
  }

  if (!position?.historyComplete) {
    return {
      knowledge: PAYMENT_KNOWLEDGE.unrecorded,
      total,
      paid: null,
      balance: null,
      paymentCount: Number(position?.paymentCount || 0),
      historicalSettlement: 0,
      note: "Payment history has not yet been confirmed in the Hub.",
    };
  }

  const paid = round(position.paidAmount || 0);
  const balance = round(position.balanceAmount ?? Math.max(total - paid, 0));
  // FOUNDER RULING, 12 Aug 2026. A historically settled cost is paid, but the
  // Hub holds no transaction detail for it and must not imply that it does.
  const historicalSettlement = round(position.historicalSettlementAmount || 0);
  return {
    knowledge: PAYMENT_KNOWLEDGE.known,
    total,
    paid,
    balance,
    paymentCount: Number(position.paymentCount || 0),
    historicalSettlement,
    note: historicalSettlement > 0
      ? "Settled historically, confirmed by the Principal."
      : balance === 0 ? "Paid in full." : paid > 0 ? "Part paid." : "Nothing paid yet.",
  };
}

export function paidDisplay(truth, money) {
  return truth.paid == null ? "—" : money(truth.paid);
}

export function balanceDisplay(truth, money) {
  return truth.balance == null ? "—" : money(truth.balance);
}

// Balance is the reconciliation answer, so it outranks Paid while money is
// still owed and steps back to ordinary weight when nothing is. Staff Pay reads
// the same way, so the two Finance registers signal unresolved money alike.
export function costBalanceEmphasis(truth) {
  if (!truth || truth.balance == null) return "quiet";
  return truth.balance > 0 ? "strong" : "quiet";
}

// The portfolio-level Project Cost position that sits ABOVE the register, and
// deliberately answers a different question from the register's own footer.
//
// Approval is the point at which a Project Cost becomes an accepted Botanique
// obligation, so only approved costs carry an amount here — a draft, a cost
// awaiting review and a withdrawn cost are none of them obligations. Payment
// stays on the same footing as everywhere else in Project Costs: a cost whose
// history the Hub has not confirmed is counted apart, never folded into KES 0
// paid, so Paid and Outstanding report only the position that is actually known.
export function approvedCostPosition(claims = [], positionForClaim = () => null, linesForClaim = null) {
  let approvedCount = 0;
  let approvedTotal = 0;
  let paid = 0;
  let outstanding = 0;
  let knownCount = 0;
  let unknownCount = 0;
  let awaitingDecisionCount = 0;

  claims.forEach((claim) => {
    // Only awaiting_review waits on the Principal. amendment_requested is back
    // with the requester, exactly as canDecideSiteCost already states.
    if (claim?.lifecycle === "awaiting_review") awaitingDecisionCount += 1;
    if (claim?.lifecycle !== "approved") return;

    approvedCount += 1;
    const truth = costPaymentTruth(
      claim, positionForClaim(claim.id), linesForClaim ? linesForClaim(claim.id) : null);
    approvedTotal = round(approvedTotal + truth.total);
    if (truth.paid == null) {
      unknownCount += 1;
      return;
    }
    knownCount += 1;
    paid = round(paid + truth.paid);
    outstanding = round(outstanding + truth.balance);
  });

  return {
    approvedCount,
    approvedTotal,
    paid: knownCount > 0 ? paid : null,
    outstanding: knownCount > 0 ? outstanding : null,
    knownCount,
    unknownCount,
    awaitingDecisionCount,
  };
}

// The register's portfolio line. Costs whose payment truth is unknown are
// counted separately rather than silently folded into "unpaid".
export function summarisePaymentTruth(claims = [], positionForClaim = () => null, linesForClaim = null) {
  let total = 0;
  let paid = 0;
  let balance = 0;
  let unrecorded = 0;
  let known = 0;

  claims.forEach((claim) => {
    const truth = costPaymentTruth(
      claim, positionForClaim(claim.id), linesForClaim ? linesForClaim(claim.id) : null);
    total = round(total + truth.total);
    if (truth.paid == null) {
      if (truth.knowledge !== PAYMENT_KNOWLEDGE.not_payable) unrecorded += 1;
      return;
    }
    known += 1;
    paid = round(paid + truth.paid);
    balance = round(balance + truth.balance);
  });

  return {
    total,
    paid: known > 0 ? paid : null,
    balance: known > 0 ? balance : null,
    unrecordedCount: unrecorded,
  };
}