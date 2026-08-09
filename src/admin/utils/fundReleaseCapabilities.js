import { ROLES } from "../constants/roles";

// BD-FIN-01C. Approval is not payment, and payment is not reconciliation. A fund release is
// the only record in the product that says money actually moved; a reconciliation is the only
// record that says what became of it.
//
// deriveFinancialPosition below is the client mirror of
// public.fund_request_financial_position(). The database is authoritative — the live surface
// reads the RPC — but demo mode has no database, and the two must not disagree, so the rule is
// written once here and asserted against the same scenarios the SQL matrix asserts.

export const CUSTODY_DISPOSITIONS = {
  operations_manager_accountable_advance: "Accountable advance",
  direct_recipient_funding: "Direct settled payment",
};

// What each disposition obliges afterwards, stated where the reader acts on it.
export const CUSTODY_CONSEQUENCE = {
  operations_manager_accountable_advance:
    "The person holding this money must account for how it was spent.",
  direct_recipient_funding:
    "Botanique paid the payee directly. No accountable-advance reconciliation is required.",
};

export const PAYMENT_CHANNELS = {
  mpesa: "M-Pesa",
  bank_transfer: "Bank transfer",
  cash: "Cash",
  other: "Other",
};

export const RELEASE_STATUSES = {
  recorded: "Recorded",
  reversed: "Reversed",
};

export const ACQUITTAL_STATES = {
  submitted: "Submitted for review",
  amendment_requested: "Amendment requested",
  accepted: "Accepted",
};

export const RELEASE_STATES = {
  none: "Nothing released",
  partially_released: "Partly released",
  fully_released: "Fully released",
};

export const RECONCILIATION_STATES = {
  not_required: "No reconciliation required",
  outstanding: "Reconciliation outstanding",
  submitted: "Reconciliation submitted",
  amendment_requested: "Reconciliation sent back",
  accepted: "Reconciled",
};

export const FINANCIAL_POSITIONS = {
  not_applicable: "No financial position",
  approved_unpaid: "Approved — unpaid",
  partially_funded: "Partly funded",
  reconciliation_outstanding: "Funded — reconciliation outstanding",
  reconciliation_submitted: "Reconciliation awaiting review",
  reconciliation_amendment_requested: "Reconciliation sent back",
  financially_settled: "Financially settled",
};

const ADVANCE = "operations_manager_accountable_advance";

function money(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function round(value) {
  return Math.round(money(value) * 100) / 100;
}

export function isAccountableAdvance(disposition) {
  return disposition === ADVANCE;
}

// Reversed releases hold no money, exactly as a withdrawn fund request holds no reservation.
export function liveReleases(releases = []) {
  return releases.filter((release) => release.status === "recorded");
}

export function releasedTotal(releases = []) {
  return round(liveReleases(releases).reduce((sum, release) => sum + money(release.releasedAmount), 0));
}

export function remainingReleasable(request, releases = []) {
  if (!request || request.status !== "approved") return 0;
  return Math.max(round(money(request.totalRequestedAmount) - releasedTotal(releases)), 0);
}

// The whole financial outcome of one accountable advance, derived and never entered by hand:
//   variance > 0  released but neither spent nor returned
//   variance = 0  fully accounted for
//   variance < 0  spent beyond the advance; its absolute value is what is still owed back
export function acquittalOutcome(acquittal) {
  if (!acquittal) return null;
  const released = money(acquittal.releasedAmountSnapshot);
  const spent = money(acquittal.actualSpendTotal);
  const returned = money(acquittal.returnedAmount);
  const variance = round(released - spent - returned);
  return {
    released, spent, returned, variance,
    unspent: round(released - spent),
    unaccounted: variance > 0 ? variance : 0,
    additionalRequired: variance < 0 ? Math.abs(variance) : 0,
    balances: variance === 0,
  };
}

export function deriveReleaseState(request, releases = []) {
  const live = liveReleases(releases);
  if (!live.length) return "none";
  const authorised = money(request?.totalRequestedAmount);
  return releasedTotal(releases) >= authorised ? "fully_released" : "partially_released";
}

export function deriveReconciliationState(releases = [], acquittals = []) {
  const advances = liveReleases(releases).filter((release) => isAccountableAdvance(release.custodyDisposition));
  if (!advances.length) return "not_required";
  const byRelease = new Map(acquittals.map((acquittal) => [acquittal.fundReleaseId, acquittal]));
  if (advances.some((release) => !byRelease.has(release.id))) return "outstanding";
  const states = advances.map((release) => byRelease.get(release.id).state);
  if (states.includes("amendment_requested")) return "amendment_requested";
  if (states.includes("submitted")) return "submitted";
  return "accepted";
}

// The one derivation every surface reads. Nothing here is stored, which is what lets
// APPROVED + UNPAID and APPROVED + PAID + UNRECONCILED both exist without contradiction, and
// what makes every fund request approved before BD-FIN-01C read truthfully with no backfill.
export function deriveFinancialPosition(request, releases = [], acquittals = []) {
  const scoped = releases.filter((release) => release.fundRequestId === request?.id);
  const scopedIds = new Set(scoped.map((release) => release.id));
  const scopedAcquittals = acquittals.filter((acquittal) => scopedIds.has(acquittal.fundReleaseId));
  const live = liveReleases(scoped);
  const releaseState = deriveReleaseState(request, scoped);
  const reconciliationState = deriveReconciliationState(scoped, scopedAcquittals);
  const outcomes = scopedAcquittals.map(acquittalOutcome);

  const position = (() => {
    if (request?.status !== "approved") return "not_applicable";
    if (releaseState === "none") return "approved_unpaid";
    if (reconciliationState === "outstanding") return "reconciliation_outstanding";
    if (reconciliationState === "submitted") return "reconciliation_submitted";
    if (reconciliationState === "amendment_requested") return "reconciliation_amendment_requested";
    if (releaseState === "partially_released") return "partially_funded";
    return "financially_settled";
  })();

  return {
    authorisedAmount: request?.status === "approved" ? money(request.totalRequestedAmount) : 0,
    releasedAmount: releasedTotal(scoped),
    remainingReleasableAmount: remainingReleasable(request, scoped),
    advanceReleasedAmount: round(live
      .filter((release) => isAccountableAdvance(release.custodyDisposition))
      .reduce((sum, release) => sum + money(release.releasedAmount), 0)),
    directPaidAmount: round(live
      .filter((release) => !isAccountableAdvance(release.custodyDisposition))
      .reduce((sum, release) => sum + money(release.releasedAmount), 0)),
    actualSpendAmount: round(outcomes.reduce((sum, outcome) => sum + outcome.spent, 0)),
    returnedAmount: round(outcomes.reduce((sum, outcome) => sum + outcome.returned, 0)),
    varianceAmount: round(outcomes.reduce((sum, outcome) => sum + outcome.variance, 0)),
    releaseCount: live.length,
    reversedReleaseCount: scoped.length - live.length,
    releaseState,
    reconciliationState,
    financialPosition: position,
  };
}

// ---------------------------------------------------------------------------
// Authority. These mirror the RPC guards exactly and never widen them: the surface hides what
// the database would refuse, rather than offering an action that fails.
// ---------------------------------------------------------------------------

// Founder ruling D2: Operations requests, the Principal decides, and the Principal records the
// actual release. There is no Finance Officer role.
export function canRecordFundRelease(request, role, releases = []) {
  return role === ROLES.OWNER
    && request?.status === "approved"
    && remainingReleasable(request, releases) > 0;
}

export function canReverseFundRelease(release, role, acquittal) {
  return role === ROLES.OWNER && release?.status === "recorded" && !acquittal;
}

// Optional, and only for an accountable advance. A direct supplier payment never asks anyone
// to acknowledge receiving money they did not receive.
export function canConfirmFundReleaseReceipt(release, currentUserId) {
  return release?.status === "recorded"
    && isAccountableAdvance(release.custodyDisposition)
    && release.recipientProfileId === currentUserId
    && !release.receiptConfirmedAt;
}

// Founder ruling D3: reconciliation follows custody, not every payment.
export function requiresReconciliation(release) {
  return release?.status === "recorded" && isAccountableAdvance(release.custodyDisposition);
}

export function canSubmitFundAcquittal(release, acquittal, currentUserId) {
  if (!requiresReconciliation(release)) return false;
  if (release.recipientProfileId !== currentUserId) return false;
  return !acquittal || acquittal.state === "amendment_requested";
}

export function canDecideFundAcquittal(acquittal, role, currentUserId) {
  return role === ROLES.OWNER
    && acquittal?.state === "submitted"
    && acquittal.submittedBy !== currentUserId;
}

// Accepting a reconciliation that does not balance closes an abnormal position. Founder ruling
// D4 makes the reason mandatory and permanently visible; balances are never silently zeroed.
export function acceptanceRequiresReason(acquittal) {
  const outcome = acquittalOutcome(acquittal);
  return Boolean(outcome) && !outcome.balances;
}

export function calculateAcquittalSpend(lines = []) {
  return round(lines.reduce((sum, line) => {
    const amount = money(line.amount);
    return sum + (amount > 0 ? amount : 0);
  }, 0));
}
