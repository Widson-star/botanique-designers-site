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

export function costTotal(claim) {
  return round(claim?.approvedTotal ?? claim?.submittedTotal ?? 0);
}

export function costPaymentTruth(claim, position = null) {
  const total = costTotal(claim);

  if (!claim || claim.lifecycle !== "approved") {
    return {
      knowledge: PAYMENT_KNOWLEDGE.not_payable,
      total,
      paid: null,
      balance: null,
      paymentCount: 0,
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
      note: "Payment history has not yet been confirmed in the Hub.",
    };
  }

  const paid = round(position.paidAmount || 0);
  const balance = round(position.balanceAmount ?? Math.max(total - paid, 0));
  return {
    knowledge: PAYMENT_KNOWLEDGE.known,
    total,
    paid,
    balance,
    paymentCount: Number(position.paymentCount || 0),
    note: balance === 0 ? "Paid in full." : paid > 0 ? "Part paid." : "Nothing paid yet.",
  };
}

export function paidDisplay(truth, money) {
  return truth.paid == null ? "—" : money(truth.paid);
}

export function balanceDisplay(truth, money) {
  return truth.balance == null ? "—" : money(truth.balance);
}

export function summarisePaymentTruth(claims = [], positionForClaim = () => null) {
  let total = 0;
  let paid = 0;
  let balance = 0;
  let unrecorded = 0;
  let known = 0;

  claims.forEach((claim) => {
    const truth = costPaymentTruth(claim, positionForClaim(claim.id));
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