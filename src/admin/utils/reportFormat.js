// BD-REPORTS-01A — the shared Reports money formatter, section-state vocabulary
// and safe user-facing labels.
//
// The formatter's whole job is to keep five things apart that a naive
// `amount || 0` collapses into one:
//   * a genuine stored zero        -> "KES 0"
//   * an absent / null amount      -> "Not recorded"
//   * a value from an unavailable  -> "Not available in the current
//     capability                      Operations Hub stage"
//   * a value the reader may not   -> "You do not have access to this section"
//     access
//   * a value that failed to load  -> "Data could not be loaded"
//
// Sections carry the last four as states; the formatter is responsible for
// never printing a shilling figure for any of them.

// The five distinct data states a report section can be in, plus loading.
export const SECTION_STATE = {
  LOADING: "loading",
  READY: "ready",
  EMPTY_PERIOD: "empty_period",
  EMPTY_EVER: "empty_ever",
  UNAVAILABLE: "unavailable",
  NO_ACCESS: "no_access",
  ERROR: "error",
};

export const SECTION_STATE_MESSAGES = {
  [SECTION_STATE.EMPTY_PERIOD]: "No records in the selected period.",
  [SECTION_STATE.EMPTY_EVER]: "No records exist for this project.",
  [SECTION_STATE.UNAVAILABLE]: "Not available in the current Operations Hub stage.",
  [SECTION_STATE.NO_ACCESS]: "You do not have access to this section.",
  [SECTION_STATE.ERROR]: "Data could not be loaded.",
  [SECTION_STATE.LOADING]: "Loading…",
};

// Shown instead of an amount when the stored value is absent. Never "0".
export const NOT_RECORDED = "Not recorded";

// A single safe message for any failed read. A raw database, RLS or PostgREST
// error is never shown to a reader.
export const SAFE_LOAD_ERROR =
  "Data could not be loaded. Please try again, or ask the Principal if this continues.";

// The shared report money formatter. `value` must be an exact stored numeric
// value or null/undefined; it is never defaulted. `currency` is the record's
// stored currency code — presently constrained to KES, with no conversion.
export function formatReportMoney(value, currency = "KES") {
  if (value === null || value === undefined || value === "") return NOT_RECORDED;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return NOT_RECORDED;
  const code = currency || "KES";
  const whole = Number.isInteger(amount);
  return `${code} ${amount.toLocaleString("en-KE", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

// A plain count that keeps a genuine zero distinct from an absent value.
export function formatReportCount(value, unit = "") {
  if (value === null || value === undefined) return NOT_RECORDED;
  const count = Number(value);
  if (!Number.isFinite(count)) return NOT_RECORDED;
  if (!unit) return count.toLocaleString("en-KE");
  return `${count.toLocaleString("en-KE")} ${unit}${count === 1 ? "" : "s"}`;
}

export function formatReportText(value) {
  if (value === null || value === undefined) return NOT_RECORDED;
  const text = String(value).trim();
  return text || NOT_RECORDED;
}

// ---------------------------------------------------------------------------
// Approved plain-language labels
// ---------------------------------------------------------------------------
// These are the words readers see. Raw statuses are never shown where a clearer
// approved label exists, and no label strengthens what the record proves.
//
// BD-REPORTS-01B note. The concise Project Summary states figures, so several
// maps below — the claim, fund, custody, category, recipient, compliance and
// activity vocabularies — are no longer rendered by a Reports component. They
// are kept deliberately, not by oversight: this is the terminology Stage 4A
// declared binding across dashboards, mobile views, reports and future printing
// and exports, and `activityEventLabel` is what the retained, deferred
// cross-domain activity timeline will render. Removing them would delete
// approved wording that a later surface must reuse verbatim rather than
// reinvent.
export const REPORT_LABELS = {
  internalCostsSubmitted: "Internal costs submitted",
  internalCostsApproved: "Internal costs approved",
  fundingRequested: "Funding requested",
  fundingAuthorised: "Funding authorised — not released",
  expectedWorkers: "Expected workers",
  plannedLabour: "Planned labour",
  submittedLate: "Submitted late",
  returnedForCorrection: "Returned for correction",
  unavailable: "Not available in the current Operations Hub stage",
  noAccess: "You do not have access to this section",
};

export const CLAIM_LIFECYCLE_LABELS = {
  draft: "Draft",
  awaiting_review: "Submitted, awaiting review",
  amendment_requested: "Returned for correction",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  cancelled: "Cancelled",
};

export const FUND_STATUS_LABELS = {
  draft: "Draft",
  submitted: "Submitted, awaiting decision",
  amendment_requested: "Returned for correction",
  approved: "Funding authorised — not released",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  cancelled: "Cancelled",
};

export const CLAIM_CATEGORY_LABELS = {
  labour: "Labour",
  mason_subcontract: "Mason subcontract",
  cart_transport: "Cart transport",
  transport: "Transport",
  materials: "Materials",
  equipment_hire: "Equipment hire",
  supplier_cost: "Supplier cost",
  other: "Other",
};

export const CLAIM_RECIPIENT_TYPE_LABELS = {
  crew: "Crew",
  staff: "Staff",
  supplier: "Supplier",
  contractor: "Contractor",
  service_provider: "Service provider",
  other: "Other",
};

// See dailySiteFormatters.js: the `waived` key is the internal disposition,
// unchanged; only the display label reads "Not required", 3 August 2026.
export const COMPLIANCE_LABELS = {
  entry_present: "Entry submitted",
  entry_late: "Submitted late",
  waived: "Not required",
  missing: "Missing",
  not_due: "Not due",
};

export const CUSTODY_LABELS = {
  operations_manager_accountable_advance: "Intended accountable advance",
  direct_recipient_funding: "Intended direct recipient funding",
};

export const DISPOSITION_LABELS = {
  working: "Work planned",
  no_work: "No work planned",
};

export const ENTRY_STATE_LABELS = {
  draft: "Draft",
  submitted: "Submitted",
  returned_for_correction: "Returned for correction",
  resubmitted: "Resubmitted",
  accepted: "Accepted",
  voided: "Voided",
  superseded: "Superseded",
};

export const EVIDENCE_STATUS_LABELS = {
  none: "Not provided",
  promised: "Expected later",
  provided: "Confirmed as available",
  not_required: "Not required",
};

// Plain user-facing event labels for Recent Activity. A raw technical event-type
// identifier is never rendered; an unrecognised type falls back to a neutral
// phrase rather than leaking the stored slug.
export const ACTIVITY_EVENT_LABELS = {
  // Project history
  "project:created": "Project created",
  "project:updated": "Project details updated",
  "project:archived": "Project archived",
  "project:restored": "Project restored",
  // Daily Site
  "daily_site:created": "Site entry started",
  "daily_site:draft_updated": "Site entry updated",
  "daily_site:submitted": "Site entry submitted",
  "daily_site:returned_for_correction": "Site entry returned for correction",
  "daily_site:resubmitted": "Site entry corrected and resubmitted",
  "daily_site:accepted": "Site entry accepted",
  "daily_site:voided": "Site entry voided",
  "daily_site:superseded": "Site entry superseded",
  "daily_site:supersession_created": "Site entry correction recorded",
  // Internal Cost Claims
  "internal_cost:created": "Internal cost claim started",
  "internal_cost:amended": "Internal cost claim amended",
  "internal_cost:submitted": "Internal cost claim submitted",
  "internal_cost:amendment_requested": "Internal cost claim returned for correction",
  "internal_cost:resubmitted": "Internal cost claim corrected and resubmitted",
  "internal_cost:approved": "Internal cost claim approved",
  "internal_cost:rejected": "Internal cost claim rejected",
  "internal_cost:withdrawn": "Internal cost claim withdrawn",
  "internal_cost:cancelled": "Internal cost claim cancelled",
  "internal_cost:principal_authorised": "Internal cost authorised by the Principal",
  // Fund Requests
  "fund_request:draft_created": "Fund request started",
  "fund_request:draft_updated": "Fund request updated",
  "fund_request:submitted": "Fund request submitted",
  "fund_request:amendment_requested": "Fund request returned for correction",
  "fund_request:resubmitted": "Fund request corrected and resubmitted",
  "fund_request:approved": "Funding authorised — not released",
  "fund_request:rejected": "Fund request rejected",
  "fund_request:withdrawn": "Fund request withdrawn",
  "fund_request:cancelled": "Fund request cancelled",
  "fund_request:principal_direct_authorised": "Funding authorised directly by the Principal",
  // Approvals
  "approval:submitted": "Approval request submitted",
  "approval:queued_for_review": "Approval request queued for review",
  "approval:amendment_requested": "Approval request returned for amendment",
  "approval:amended": "Approval request amended",
  "approval:resubmitted": "Approval request resubmitted",
  "approval:approved": "Approval request approved",
  "approval:rejected": "Approval request rejected",
  "approval:withdrawn": "Approval request withdrawn",
  "approval:project_change_applied": "Approved change applied to the project",
};

export const SOURCE_DOMAIN_LABELS = {
  project: "Project record",
  daily_site: "Daily site",
  internal_cost: "Site costs",
  fund_request: "Fund requests",
  approval: "Approvals",
};

// Neutral fallbacks, one per domain, so an unmapped stored event type is
// described rather than exposed.
const DOMAIN_FALLBACK_LABELS = {
  project: "Project record activity",
  daily_site: "Daily site activity",
  internal_cost: "Site cost activity",
  fund_request: "Fund request activity",
  approval: "Approval activity",
};

export function activityEventLabel(sourceDomain, eventType) {
  return (
    ACTIVITY_EVENT_LABELS[`${sourceDomain}:${eventType}`] ||
    DOMAIN_FALLBACK_LABELS[sourceDomain] ||
    "Recorded activity"
  );
}
