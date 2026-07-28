// Role capabilities and pure derivations for Daily Site Operations. These
// mirror the database authority (they never widen it) and keep the UI honest:
// owner and manager may record entries; only the owner reviews, voids,
// supersedes and waives; staff/viewer have no access.
import { ROLES } from "../constants/roles";

export const NO_WORK_REASONS = [
  "rain",
  "weekend_no_activity",
  "temporarily_paused_for_day",
  "no_labour_required",
  "site_access_unavailable",
  "other",
];

export const EVIDENCE_STATUSES = ["none", "promised", "provided", "not_required"];

export function canSeeDailySiteOperations(role) {
  return role === ROLES.OWNER || role === ROLES.MANAGER;
}

// Owner or manager may record a morning entry.
export function canRecordDailySiteEntry(role) {
  return role === ROLES.OWNER || role === ROLES.MANAGER;
}

// Only the owner reviews (return / accept), voids, supersedes and waives.
export function canReviewDailySiteEntry(role) {
  return role === ROLES.OWNER;
}

export function canWaiveCompliance(role) {
  return role === ROLES.OWNER;
}

// Draft edit / submit is limited to the author (managers) or the owner.
export function canEditDailyDraft(role, entry, currentUserId) {
  if (!entry || entry.state !== "draft") return false;
  if (role === ROLES.OWNER) return true;
  return role === ROLES.MANAGER && entry.createdBy === currentUserId;
}

export function canSubmitDailyEntry(role, entry, currentUserId) {
  return canEditDailyDraft(role, entry, currentUserId);
}

export function canCorrectDailyEntry(role, entry, currentUserId) {
  if (!entry || entry.state !== "returned_for_correction") return false;
  if (role === ROLES.OWNER) return true;
  return role === ROLES.MANAGER && entry.createdBy === currentUserId;
}

export function canReturnDailyEntry(role, entry) {
  return (
    role === ROLES.OWNER &&
    !!entry &&
    ["submitted", "resubmitted"].includes(entry.state)
  );
}

export function canAcceptDailyEntry(role, entry) {
  return (
    role === ROLES.OWNER &&
    !!entry &&
    ["submitted", "resubmitted"].includes(entry.state)
  );
}

export function canVoidDailyEntry(role, entry) {
  return (
    role === ROLES.OWNER &&
    !!entry &&
    ["draft", "submitted", "returned_for_correction", "resubmitted"].includes(entry.state)
  );
}

export function canSupersedeDailyEntry(role, entry) {
  return role === ROLES.OWNER && !!entry && entry.state === "accepted";
}

// The trusted planned labour cost preview, computed the same way the database
// derives it. Returns a number for working entries, 0 otherwise.
export function computeLabourCost({ disposition, expectedWorkerCount, ratePerWorker, agreedLabourTotal }) {
  if (disposition !== "working") return 0;
  const agreed = agreedLabourTotal === "" || agreedLabourTotal === null || agreedLabourTotal === undefined
    ? null
    : Number(agreedLabourTotal);
  if (agreed !== null && Number.isFinite(agreed)) return agreed;
  const rate = Number(ratePerWorker) || 0;
  const count = Number(expectedWorkerCount) || 0;
  return rate * count;
}

// Client-side mirror of the database validation, used to guide the form before
// a round trip. Returns a map of field -> message (empty when valid).
export function validateEntryPlan(values) {
  const errors = {};
  if (values.disposition !== "working" && values.disposition !== "no_work") {
    errors.disposition = "Choose working or no work.";
    return errors;
  }
  if (values.disposition === "working") {
    const count = Number(values.expectedWorkerCount);
    if (!Number.isInteger(count) || count < 1) {
      errors.expectedWorkerCount = "Enter at least one worker.";
    }
    if (!values.workPlanned || !String(values.workPlanned).trim()) {
      errors.workPlanned = "Describe the planned work.";
    }
    const hasRate = values.ratePerWorker !== "" && values.ratePerWorker !== null && values.ratePerWorker !== undefined;
    const hasAgreed = values.agreedLabourTotal !== "" && values.agreedLabourTotal !== null && values.agreedLabourTotal !== undefined;
    if (hasRate === hasAgreed) {
      errors.labour = "Enter either a rate per worker or an agreed total — not both.";
    }
    if (hasRate && Number(values.ratePerWorker) < 0) errors.ratePerWorker = "Cannot be negative.";
    if (hasAgreed && Number(values.agreedLabourTotal) < 0) errors.agreedLabourTotal = "Cannot be negative.";
  } else {
    if (!values.noWorkReason || !NO_WORK_REASONS.includes(values.noWorkReason)) {
      errors.noWorkReason = "Choose a reason.";
    }
    if (values.noWorkReason === "other" && (!values.reasonDetail || !String(values.reasonDetail).trim())) {
      errors.reasonDetail = "Add a short explanation.";
    }
  }
  for (const field of ["fundsAvailable", "additionalAmountRequested"]) {
    const raw = values[field];
    if (raw !== "" && raw !== null && raw !== undefined && Number(raw) < 0) {
      errors[field] = "Cannot be negative.";
    }
  }
  return errors;
}

// Aggregate the compliance rows into the Dashboard counts.
export function summarizeCompliance(rows = []) {
  const summary = {
    due: 0,
    missing: 0,
    late: 0,
    present: 0,
    waived: 0,
    voluntary: 0,
    missingProjects: [],
  };
  for (const row of rows) {
    if (row.due) summary.due += 1;
    switch (row.complianceStatus) {
      case "missing":
        summary.missing += 1;
        summary.missingProjects.push(row);
        break;
      case "entry_late":
        summary.late += 1;
        summary.present += 1;
        break;
      case "entry_present":
        summary.present += 1;
        if (!row.due) summary.voluntary += 1;
        break;
      case "waived":
        summary.waived += 1;
        break;
      default:
        break;
    }
  }
  summary.allComplete = summary.due > 0 && summary.missing === 0;
  return summary;
}
