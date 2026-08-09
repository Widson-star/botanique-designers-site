// BD-FIN-01C read integration. What happened to the money behind a cost claim.
//
// The chain already exists in the merged model and nothing here invents a link:
//
//   daily_site_entries → internal_cost_claims → fund_request_allocations
//     → fund_requests → fund_releases → fund_acquittals
//
// Every amount below is either read straight from a source row or produced by
// deriveFinancialPosition(), which is the single client mirror of
// public.fund_request_financial_position(). No component recomputes financial
// arithmetic of its own, and nothing here is stored.
//
// Two rules govern this module.
//
// 1. FUNDING AND RECONCILIATION ARE INDEPENDENT DIMENSIONS. An authority may be
//    partly funded AND carry an unreconciled advance at the same time, and one
//    headline label must never conceal the other half of that truth. The
//    database already returns release_state and reconciliation_state separately
//    for exactly this reason; both are carried through here.
//
// 2. NOTHING IS PRO-RATED. Releases are recorded against a fund request, not
//    against an individual claim, so no claim-level "released" figure is
//    manufactured by apportioning a request's release across its allocations.
//    A claim shows the authorities it sits on and their true position; the
//    amounts belong to the request and are labelled as the request's.

import {
  deriveFinancialPosition, RECONCILIATION_STATES, RELEASE_STATES,
} from "./fundReleaseCapabilities";

export { RECONCILIATION_STATES, RELEASE_STATES };

// The funding dimension: how much of the authorised money has actually moved.
export const FUNDING_POSITIONS = {
  not_requested: "No fund request raised",
  awaiting_authority: "Fund request awaiting decision",
  unpaid: "Approved — not yet funded",
  partially_funded: "Partly funded",
  fully_funded: "Fully funded",
};

// One plain sentence per funding position, in the reader's language.
export const FUNDING_DETAIL = {
  not_requested:
    "No fund request has been raised against this cost yet, so no money has been authorised to move.",
  awaiting_authority:
    "A fund request exists but has not been approved, so nothing may be released against it yet.",
  unpaid: "The fund authority is approved but no money has been released against it.",
  partially_funded: "Part of the approved authority has been released. The rest is still unreleased.",
  fully_funded: "The whole approved authority has been released.",
};

export const RECONCILIATION_DETAIL = {
  not_required:
    "Every release was a direct settled payment, so no accountable-advance reconciliation is required.",
  outstanding: "An accountable advance has not been accounted for yet.",
  submitted: "A reconciliation has been submitted and is awaiting the Principal's decision.",
  amendment_requested: "The Principal sent a reconciliation back for amendment.",
  accepted: "Every accountable advance has been accounted for and accepted.",
};

// Worst-first, so an aggregate never reports the calmest of several positions.
const FUNDING_ATTENTION = [
  "partially_funded", "unpaid", "awaiting_authority", "not_requested", "fully_funded",
];
const RECONCILIATION_ATTENTION = [
  "outstanding", "amendment_requested", "submitted", "accepted", "not_required",
];

function worst(values, order) {
  let best = null;
  values.forEach((value) => {
    const rank = order.indexOf(value);
    if (rank === -1) return;
    if (best === null || rank < order.indexOf(best)) best = value;
  });
  return best;
}

function round(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

// The fund requests a set of claims is allocated to, each with its own
// authoritative derived position and the amount this claim set contributed.
export function fundRequestsForClaims(claimIds, { requests = [], allocations = [], releases = [], acquittals = [] } = {}) {
  const wanted = new Set((claimIds || []).filter(Boolean));
  if (!wanted.size) return [];
  const byRequest = new Map();

  allocations
    .filter((allocation) => wanted.has(allocation.claimId))
    .forEach((allocation) => {
      const request = requests.find((item) => item.id === allocation.fundRequestId);
      if (!request) return;
      const existing = byRequest.get(request.id);
      if (existing) {
        existing.allocatedAmount = round(existing.allocatedAmount + allocation.requestedAmount);
        existing.claimIds.push(allocation.claimId);
        return;
      }
      byRequest.set(request.id, {
        request,
        allocatedAmount: round(allocation.requestedAmount),
        claimIds: [allocation.claimId],
        position: deriveFinancialPosition(request, releases, acquittals),
      });
    });

  return [...byRequest.values()]
    // The whole authority may also fund claims that are not in this set. Saying so
    // is what stops a reader reading the request's amounts as this claim's amounts.
    .map((entry) => ({
      ...entry,
      coversOtherClaims: allocations.some((allocation) =>
        allocation.fundRequestId === entry.request.id && !wanted.has(allocation.claimId)),
    }))
    .sort((left, right) =>
      String(left.request.requestNumber || "").localeCompare(String(right.request.requestNumber || "")));
}

// The aggregate financial position of everything a set of claims is funded by.
// Amounts are summed across whole fund requests — each row of the derived model
// is one request, so summing rows is the same arithmetic the database does and
// never apportions a release to a claim.
export function fundingForClaims(claimIds, context = {}) {
  const linked = fundRequestsForClaims(claimIds, context);
  const approved = linked.filter((entry) => entry.request.status === "approved");

  const sum = (pick) => round(approved.reduce((total, entry) => total + Number(pick(entry.position) || 0), 0));

  const authorisedAmount = sum((position) => position.authorisedAmount);
  const releasedAmount = sum((position) => position.releasedAmount);

  const fundingPosition = (() => {
    if (!linked.length) return "not_requested";
    if (!approved.length) return "awaiting_authority";
    const states = approved.map((entry) => entry.position.releaseState);
    if (states.every((state) => state === "none")) return "unpaid";
    if (states.every((state) => state === "fully_released")) return "fully_funded";
    return "partially_funded";
  })();

  const reconciliationPosition = approved.length
    ? worst(approved.map((entry) => entry.position.reconciliationState), RECONCILIATION_ATTENTION)
      || "not_required"
    : "not_required";

  const advanceReleasedAmount = sum((position) => position.advanceReleasedAmount);
  const directPaidAmount = sum((position) => position.directPaidAmount);
  // Exactly the database's actual_spend_amount: the spend on the current acquittal
  // of each accountable advance, whatever state that acquittal is in. It is never
  // widened here, so this figure can always be reconciled against the SQL.
  const advanceSpendAmount = sum((position) => position.actualSpendAmount);

  return {
    requests: linked,
    fundingPosition,
    fundingLabel: FUNDING_POSITIONS[fundingPosition],
    fundingDetail: FUNDING_DETAIL[fundingPosition],
    // Only meaningful once an approved authority exists; "not_required" before
    // then means "nothing has been released, so nothing is owed an account".
    reconciliationPosition,
    reconciliationLabel: RECONCILIATION_STATES[reconciliationPosition],
    reconciliationDetail: RECONCILIATION_DETAIL[reconciliationPosition],
    reconciliationApplies: advanceReleasedAmount > 0,
    authorisedAmount,
    releasedAmount,
    remainingUnreleasedAmount: sum((position) => position.remainingReleasableAmount),
    advanceReleasedAmount,
    directPaidAmount,
    advanceSpendAmount,
    // A RELEASE IS NOT ACTUAL EXPENDITURE. For an accountable advance the actual
    // expenditure is the acquittal spend above and nothing else — an advance that
    // has not been accounted for contributes zero, which is what makes the
    // outstanding position visible instead of flattering it. A direct settled
    // payment is actual expenditure the moment it is released: nobody holds it,
    // there is no return leg, and Founder ruling D3 deliberately gives it no
    // acquittal, so waiting for one would understate spend forever.
    actualExpenditureAmount: round(advanceSpendAmount + directPaidAmount),
    returnedAmount: sum((position) => position.returnedAmount),
    varianceAmount: sum((position) => position.varianceAmount),
    releaseCount: approved.reduce((total, entry) => total + entry.position.releaseCount, 0),
    reversedReleaseCount: approved.reduce((total, entry) => total + entry.position.reversedReleaseCount, 0),
    hasAccountableAdvance: advanceReleasedAmount > 0,
    hasDirectPayment: directPaidAmount > 0,
    settled: approved.length > 0
      && approved.length === linked.length
      && approved.every((entry) => entry.position.financialPosition === "financially_settled"),
    needsAttention: ["outstanding", "amendment_requested"].includes(reconciliationPosition)
      || (approved.length > 0 && fundingPosition === "partially_funded"),
  };
}

// The one short phrase a list row has space for. Deliberately names both
// dimensions when both say something, because the mixed position — partly
// funded AND unreconciled — is precisely the one a single label would hide.
export function fundingSummaryPhrase(funding) {
  if (!funding || funding.fundingPosition === "not_requested") return "";
  const parts = [FUNDING_POSITIONS[funding.fundingPosition]];
  if (funding.reconciliationApplies && funding.reconciliationPosition !== "accepted") {
    parts.push(RECONCILIATION_STATES[funding.reconciliationPosition]);
  }
  if (funding.settled) return "Financially settled";
  return parts.join(" · ");
}

// What the reader should do next, or null when nothing is waiting on anyone.
export function fundingNextAction(funding) {
  if (!funding) return null;
  if (funding.settled) return null;
  if (funding.fundingPosition === "not_requested") return null;
  if (funding.reconciliationPosition === "outstanding") {
    return "An accountable advance is waiting to be accounted for in Funding, Payments and Reconciliation.";
  }
  if (funding.reconciliationPosition === "amendment_requested") {
    return "A reconciliation was sent back and needs to be amended and resubmitted.";
  }
  if (funding.reconciliationPosition === "submitted") {
    return "A reconciliation is waiting for the Principal's decision.";
  }
  if (funding.fundingPosition === "awaiting_authority") {
    return "The fund request is waiting for the Principal's decision.";
  }
  if (funding.fundingPosition === "unpaid" || funding.fundingPosition === "partially_funded") {
    return "Approved authority remains unreleased. The Principal records a release in Funding, Payments and Reconciliation.";
  }
  return null;
}
