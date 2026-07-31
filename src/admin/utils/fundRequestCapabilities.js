import { ROLES } from "../constants/roles";

// Approval of a fund request authorises Botanique to make money available. It never records
// a release, transfer, advance receipt, payment, settlement or reconciliation.
export const FUND_REQUEST_STATUSES = {
  draft: "Draft",
  submitted: "Submitted",
  amendment_requested: "Amendment requested",
  approved: "Approved — not released",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  cancelled: "Cancelled",
};

export const INTENDED_CUSTODY_TYPES = {
  operations_manager_accountable_advance: "Intended accountable advance",
  direct_recipient_funding: "Intended direct recipient funding",
};

// A reserving request holds approved claim value against future authority. A draft never
// does, which is why draft availability can only ever be advisory.
const RESERVING_STATUSES = ["submitted", "amendment_requested", "approved"];

export function isReservingFundRequest(status) {
  return RESERVING_STATUSES.includes(status);
}

export function canSeeFundRequests(role) {
  return role === ROLES.OWNER || role === ROLES.MANAGER;
}

export function canCreateFundRequest(role) {
  return role === ROLES.MANAGER;
}

export function canDirectAuthoriseFundRequest(role) {
  return role === ROLES.OWNER;
}

export function canEditFundRequest(request, role, currentUserId) {
  return role === ROLES.MANAGER && request?.requesterId === currentUserId &&
    ["draft", "amendment_requested"].includes(request?.status);
}

export function canSubmitFundRequest(request, role, currentUserId) {
  return canEditFundRequest(request, role, currentUserId);
}

export function canWithdrawFundRequest(request, role, currentUserId) {
  return role === ROLES.MANAGER && request?.requesterId === currentUserId &&
    ["draft", "submitted", "amendment_requested"].includes(request?.status);
}

export function canDecideFundRequest(request, role) {
  return role === ROLES.OWNER && request?.status === "submitted";
}

export function canCancelFundRequest(request, role) {
  return role === ROLES.OWNER && request?.status === "approved";
}

export function calculateFundRequestTotal(allocations = []) {
  return allocations.reduce((sum, allocation) => {
    const amount = Number(allocation.requestedAmount);
    return sum + (Number.isFinite(amount) && amount > 0 ? amount : 0);
  }, 0);
}

// Availability the Manager sees while building a request: what the Principal already
// approved on the claim, what other reserving requests hold, and what is left.
export function availableAfterRequest(availability, requestedAmount) {
  const available = Number(availability?.availableToRequest ?? 0);
  const requested = Number(requestedAmount);
  return available - (Number.isFinite(requested) && requested > 0 ? requested : 0);
}
