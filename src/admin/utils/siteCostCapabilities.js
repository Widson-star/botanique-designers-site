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

export function canCopyDailySiteToCost(entry, role) {
  return canSeeSiteCosts(role) && entry?.disposition === "working" &&
    ["submitted", "resubmitted", "accepted"].includes(entry?.state);
}

export function calculateSiteCostTotal(lines = []) {
  return lines.reduce((sum, line) => {
    const quantity = Number(line.quantity);
    const unitRate = Number(line.unitRate);
    return sum + (Number.isFinite(quantity) && Number.isFinite(unitRate) ? quantity * unitRate : 0);
  }, 0);
}
