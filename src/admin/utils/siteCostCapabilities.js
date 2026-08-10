import { ROLES } from "../constants/roles";

export const SITE_COST_LIFECYCLES = {
  draft: "Draft",
  awaiting_review: "Awaiting review",
  amendment_requested: "Amendment requested",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  cancelled: "Cancelled",
};

export function canSeeSiteCosts(role) {
  return role === ROLES.OWNER || role === ROLES.MANAGER;
}

export function canCreateSiteCost(role) {
  return canSeeSiteCosts(role);
}

export function canEditSiteCost(claim, role, currentUserId) {
  return role === ROLES.MANAGER && claim?.requesterId === currentUserId &&
    ["draft", "amendment_requested"].includes(claim?.lifecycle);
}

export function canSubmitSiteCost(claim, role, currentUserId) {
  return canEditSiteCost(claim, role, currentUserId);
}

export function canWithdrawSiteCost(claim, role, currentUserId) {
  return role === ROLES.MANAGER && claim?.requesterId === currentUserId &&
    ["awaiting_review", "amendment_requested"].includes(claim?.lifecycle);
}

export function canDecideSiteCost(claim, role) {
  return role === ROLES.OWNER && claim?.lifecycle === "awaiting_review";
}

export function canCancelSiteCost(claim, role) {
  return role === ROLES.OWNER && claim?.lifecycle === "approved";
}

// FOUNDER RULING, 10 August 2026. A cost claim derived from a Daily Site Record
// must not reach the Principal's FINANCIAL approval before the site record
// itself has been accepted. Preparing a draft from a submitted record stays
// allowed, because it is operationally useful; submitting it for a money
// decision does not.
//
// The audit that produced this ruling is in WORKSTREAMS.md: the previous
// ordering was inherited implementation behaviour with no settled authority
// behind it.
//
// NOTE ON DURABILITY. This is the CLIENT half only. The database helper
// `private_internal_cost_claim_daily_site_snapshot` still accepts
// submitted/resubmitted/accepted at both create and submit, so a caller going
// straight to the RPC could still submit early. Closing that needs a migration
// to that function, which is reported for a decision rather than taken here.
export function canCopyDailySiteToCost(entry, role) {
  return canSeeSiteCosts(role) && entry?.disposition === "working" &&
    ["submitted", "resubmitted", "accepted"].includes(entry?.state);
}

// May a claim drafted from this site record be SUBMITTED for the Principal's
// financial decision yet? Only once the record itself is accepted.
export function canSubmitCostFromDailySite(entry) {
  // A claim with no Daily Site Record source is unaffected by this ordering.
  if (!entry) return true;
  return entry.state === "accepted";
}

// Why not, in the reader's language.
export function costSubmissionBlockedReason(entry) {
  if (!entry || entry.state === "accepted") return "";
  if (["submitted", "resubmitted"].includes(entry.state)) {
    return "The site record for this day is still awaiting review. It has to be accepted before this cost can go to the Principal for a financial decision.";
  }
  if (entry.state === "returned_for_correction") {
    return "The site record for this day was returned for correction. It has to be corrected and accepted before this cost can be submitted.";
  }
  return "The site record for this day is not accepted, so this cost cannot be submitted yet.";
}

export function calculateSiteCostTotal(lines = []) {
  return lines.reduce((sum, line) => {
    const quantity = Number(line.quantity);
    const unitRate = Number(line.unitRate);
    return sum + (Number.isFinite(quantity) && Number.isFinite(unitRate) ? quantity * unitRate : 0);
  }, 0);
}
