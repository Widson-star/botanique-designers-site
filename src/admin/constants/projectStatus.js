export const PROJECT_STATUSES = [
  "Pending",
  "Ongoing",
  "Completed",
  "Paused",
  "Cancelled",
  "Design-only",
];

export const PROJECT_STAGES = [
  "Inquiry",
  "Site Visit",
  "Concept Design",
  "Detailed Design",
  "Quotation Sent",
  "Awaiting Approval",
  "Implementation",
  "Maintenance",
  "Completed",
  "Archived",
];

export const PAYMENT_STATUSES = [
  "Not Quoted",
  "Quoted",
  "Invoiced",
  "Part Paid",
  "Paid",
  "Balance Outstanding",
  "Not Applicable",
];

export const PORTFOLIO_PERMISSION_STATUSES = [
  "Not Reviewed",
  "Eligible",
  "Permission Needed",
  "Approved For Portfolio",
  "Private / Do Not Publish",
];

// Portfolio publication status — a single, clear operator control that replaces
// the confusing "Portfolio eligible" checkbox + "Portfolio permission status"
// dropdown pair. This is a DISPLAY-ONLY consolidation (Option A): the underlying
// database columns (portfolio_permission_status text + portfolio_eligible
// boolean) are unchanged. The dropdown is bound to portfolio_permission_status;
// portfolio_eligible is derived deterministically so the two can never conflict.
//
// IMPORTANT INVARIANT: none of these values publishes anything to the public
// website. Public portfolio content is a separate, static, curated dataset
// (src/data/case-studies.js) — "Approved for publication" is an internal
// authorisation only and never auto-creates or publishes a public project.
export const PORTFOLIO_PUBLICATION_OPTIONS = [
  { value: "Not Reviewed", label: "Not assessed", eligible: false },
  { value: "Eligible", label: "Internal portfolio candidate", eligible: true },
  { value: "Permission Needed", label: "Client authorisation required", eligible: true },
  { value: "Approved For Portfolio", label: "Approved for publication", eligible: true },
  { value: "Private / Do Not Publish", label: "Confidential — do not publish", eligible: false },
];

// The permission-status value a publication option maps to (identity — the
// dropdown is bound directly to portfolio_permission_status).
export function portfolioPublicationLabel(permissionStatus) {
  const match = PORTFOLIO_PUBLICATION_OPTIONS.find((o) => o.value === permissionStatus);
  return match ? match.label : permissionStatus;
}

// Deterministically derive the legacy portfolio_eligible boolean from a chosen
// permission-status value, so the checkbox and dropdown can never disagree.
export function derivePortfolioEligible(permissionStatus) {
  const match = PORTFOLIO_PUBLICATION_OPTIONS.find((o) => o.value === permissionStatus);
  return match ? match.eligible : false;
}

export const PROJECT_TYPES = [
  "Residential",
  "Estate",
  "Hospitality",
  "Institutional",
  "Commercial",
  "Public Realm",
  "Design Concept",
  "Maintenance",
  "Other",
];
