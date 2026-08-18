export const PROJECT_STATUSES = [
  "Pending",
  "Ongoing",
  "Completed",
  "Paused",
  "Cancelled",
  "Design-only",
];

// Project stage describes Botanique's delivery phase only.
// Maintenance is an Operations relationship. Archive is a record state.
// Site Assessment describes the project-assessment phase; individual Site Visits
// are a separate Operations capability and may occur at any point in time.
export const PROJECT_STAGES = [
  "Inquiry",
  "Site Assessment",
  "Concept Design",
  "Detailed Design",
  "Quotation Sent",
  "Awaiting Approval",
  "Implementation",
  "Completed",
];

// The delivery phases a Pending project may be activated into. Inquiry is the
// pre-active position, so an active project never remains there; Completed is
// reached by the direct create-at-Completed path or Mark completed, not Activate.
export const ACTIVATION_STAGES = PROJECT_STAGES.filter(
  (stage) => !["Inquiry", "Completed"].includes(stage)
);

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

export const PORTFOLIO_PUBLICATION_OPTIONS = [
  { value: "Not Reviewed", label: "Not assessed", eligible: false },
  { value: "Eligible", label: "Internal portfolio candidate", eligible: true },
  { value: "Permission Needed", label: "Client authorisation required", eligible: true },
  { value: "Approved For Portfolio", label: "Approved for publication", eligible: true },
  { value: "Private / Do Not Publish", label: "Confidential — do not publish", eligible: false },
];

export function portfolioPublicationLabel(permissionStatus) {
  const match = PORTFOLIO_PUBLICATION_OPTIONS.find((o) => o.value === permissionStatus);
  return match ? match.label : permissionStatus;
}

export function derivePortfolioEligible(permissionStatus) {
  const match = PORTFOLIO_PUBLICATION_OPTIONS.find((o) => o.value === permissionStatus);
  return match ? match.eligible : false;
}

// Project type describes Botanique delivery work, never a Maintenance relationship.
export const PROJECT_TYPES = [
  "Residential",
  "Estate",
  "Hospitality",
  "Institutional",
  "Commercial",
  "Public Realm",
  "Design Concept",
  "Other",
];
