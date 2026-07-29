// Presentation helpers for Daily Site Operations: database-row mappers, plain
// human labels (never raw enum values or JSON), and KES money formatting.

// The viewer's local ISO work date (YYYY-MM-DD). The database is the authority
// for EAT compliance; this is only for "today" defaults and demo derivation.
export function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

export const DISPOSITION_LABELS = {
  working: "Working today",
  no_work: "No work today",
};

export const NO_WORK_REASON_LABELS = {
  rain: "Rain",
  weekend_no_activity: "Weekend — no activity",
  temporarily_paused_for_day: "Paused for the day",
  no_labour_required: "No labour required",
  site_access_unavailable: "Site access unavailable",
  other: "Other",
};

// Display-only labels for the supporting-evidence enum. The stored values
// (none/promised/provided/not_required) are unchanged; only the wording shown
// to operators is polished to professional operational language.
export const EVIDENCE_STATUS_LABELS = {
  none: "Not provided",
  promised: "Expected later",
  provided: "Confirmed as available",
  not_required: "Not required",
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

export const ENTRY_EVENT_LABELS = {
  created: "Draft created",
  draft_updated: "Draft updated",
  submitted: "Submitted for review",
  returned_for_correction: "Returned for correction",
  resubmitted: "Corrected and resubmitted",
  accepted: "Accepted",
  voided: "Voided",
  superseded: "Superseded",
  supersession_created: "Correction recorded",
};

export const COMPLIANCE_STATUS_LABELS = {
  entry_present: "Entry submitted",
  entry_late: "Entry submitted (late)",
  waived: "Waived",
  missing: "Missing",
  not_due: "Not due",
};

// States that represent a live (non-historical) entry.
export const LIVE_ENTRY_STATES = [
  "draft",
  "submitted",
  "returned_for_correction",
  "resubmitted",
  "accepted",
];

export function mapDailySiteEntry(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    workDate: row.work_date || "",
    disposition: row.disposition,
    noWorkReason: row.no_work_reason || "",
    reasonDetail: row.reason_detail || "",
    expectedWorkerCount: row.expected_worker_count,
    crewReference: row.crew_reference || "",
    ratePerWorker: row.rate_per_worker,
    agreedLabourTotal: row.agreed_labour_total,
    plannedLabourCost: row.planned_labour_cost,
    workPlanned: row.work_planned || "",
    fundsAvailable: row.funds_available,
    additionalAmountRequested: row.additional_amount_requested,
    notes: row.notes || "",
    evidenceStatus: row.evidence_status || "none",
    state: row.state,
    version: row.version,
    supersedesEntryId: row.supersedes_entry_id || "",
    returnedReason: row.returned_reason || "",
    voidReason: row.void_reason || "",
    supersessionReason: row.supersession_reason || "",
    createdBy: row.created_by || "",
    updatedBy: row.updated_by || "",
    submittedBy: row.submitted_by || "",
    reviewedBy: row.reviewed_by || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
    submittedAt: row.submitted_at || "",
    reviewedAt: row.reviewed_at || "",
    isLate: row.is_late === true,
  };
}

export function mapDailySiteEntryEvent(row) {
  return {
    id: row.id,
    entryId: row.daily_site_entry_id,
    eventType: row.event_type,
    actorId: row.actor_id,
    fromState: row.from_state || "",
    toState: row.to_state,
    versionNumber: row.version_number,
    eventNotes: row.event_notes || "",
    occurredAt: row.occurred_at || "",
  };
}

export function mapDailySiteWaiver(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    workDate: row.work_date || "",
    reason: row.reason || "",
    state: row.state,
    createdBy: row.created_by || "",
    createdAt: row.created_at || "",
    revokedBy: row.revoked_by || "",
    revokedAt: row.revoked_at || "",
    revokeReason: row.revoke_reason || "",
  };
}

export function mapComplianceRow(row) {
  return {
    projectId: row.project_id,
    projectName: row.project_name || "",
    workDate: row.work_date || "",
    isWeekend: row.is_weekend === true,
    due: row.due === true,
    entryId: row.entry_id || "",
    entryState: row.entry_state || "",
    disposition: row.disposition || "",
    isLate: row.is_late === true,
    waiverId: row.waiver_id || "",
    complianceStatus: row.compliance_status || "",
  };
}

// KES money formatting — grouped thousands, no decimals for whole shillings.
export function formatKes(value) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  const rounded = Math.round(number * 100) / 100;
  const whole = Number.isInteger(rounded);
  return `KES ${rounded.toLocaleString("en-KE", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

// Friendly ISO work-date, e.g. "Tue, 28 Jul 2026". Falls back to the raw value.
export function formatWorkDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function dispositionSummary(entry) {
  if (!entry) return "";
  if (entry.disposition === "no_work") {
    return NO_WORK_REASON_LABELS[entry.noWorkReason] || "No work today";
  }
  const count = entry.expectedWorkerCount ?? 0;
  return `${count} worker${count === 1 ? "" : "s"} planned`;
}

// Concise planned-activity summary for the list's Site plan column. For a
// working day this is the planned activities text; for a no-work day it is the
// reason. Never returns raw enum values. Falls back to a plain placeholder.
export function plannedActivitySummary(entry) {
  if (!entry) return "";
  if (entry.disposition === "no_work") {
    const label = NO_WORK_REASON_LABELS[entry.noWorkReason] || "No work today";
    return entry.reasonDetail ? `${label} — ${entry.reasonDetail}` : label;
  }
  return entry.workPlanned?.trim() || "No planned activities recorded";
}

// Planned workforce headline for the list — worker count only (cost is shown
// separately). Returns "—" for a no-work day.
export function plannedWorkforceSummary(entry) {
  if (!entry || entry.disposition === "no_work") return "—";
  const count = entry.expectedWorkerCount ?? 0;
  return `${count} worker${count === 1 ? "" : "s"}`;
}
