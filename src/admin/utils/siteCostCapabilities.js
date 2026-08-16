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
export function canCopyDailySiteToCost(entry, role) {
  return canSeeSiteCosts(role) && entry?.disposition === "working" &&
    ["submitted", "resubmitted", "accepted"].includes(entry?.state);
}

// A Project Cost keeps the Daily Site Record it was originally copied from as
// immutable provenance. Superseding that record must not strand the cost,
// though: the current authoritative record for the SAME project/date becomes
// the submission gate. The Daily Site table guarantees at most one live row
// for a project/date, so this resolver does not invent a new relationship or
// rewrite the claim's original source.
export function resolveCurrentDailySiteSource(entry, entries = []) {
  if (!entry || entry.state !== "superseded") return entry || null;

  const liveStates = new Set(["draft", "submitted", "returned_for_correction", "resubmitted", "accepted"]);
  return entries.find((candidate) =>
    candidate.id !== entry.id &&
    candidate.projectId === entry.projectId &&
    candidate.workDate === entry.workDate &&
    liveStates.has(candidate.state)
  ) || entry;
}

// May a claim drafted from this site record be SUBMITTED for the Principal's
// financial decision yet? If its original source was superseded, the current
// corrected record for the same project/date controls the answer.
export function canSubmitCostFromDailySite(entry, entries = []) {
  if (!entry) return true;
  const current = resolveCurrentDailySiteSource(entry, entries);
  return current?.disposition === "working" && current?.state === "accepted";
}

// Why not, in the reader's language. A superseded source is historical, not a
// dead end: explain the state of the current corrected record instead.
export function costSubmissionBlockedReason(entry, entries = []) {
  if (!entry) return "";
  const current = resolveCurrentDailySiteSource(entry, entries);
  if (current?.disposition === "working" && current?.state === "accepted") return "";

  const correctedPrefix = entry.state === "superseded" && current?.id !== entry.id
    ? "The current corrected site record for this day"
    : "The site record for this day";

  if (["submitted", "resubmitted"].includes(current?.state)) {
    return `${correctedPrefix} is still awaiting review. It has to be accepted before this cost can go to the Principal for a financial decision.`;
  }
  if (current?.state === "returned_for_correction") {
    return `${correctedPrefix} was returned for correction. It has to be corrected and accepted before this cost can be submitted.`;
  }
  if (current?.state === "draft") {
    return `${correctedPrefix} is still a draft. It has to be submitted and accepted before this cost can be submitted.`;
  }
  if (current?.disposition === "no_work") {
    return `${correctedPrefix} records no work for this day, so this labour cost cannot be submitted from it.`;
  }
  return `${correctedPrefix} is not accepted, so this cost cannot be submitted yet.`;
}

export function calculateSiteCostTotal(lines = []) {
  return lines.reduce((sum, line) => {
    const quantity = Number(line.quantity);
    const unitRate = Number(line.unitRate);
    return sum + (Number.isFinite(quantity) && Number.isFinite(unitRate) ? quantity * unitRate : 0);
  }, 0);
}
