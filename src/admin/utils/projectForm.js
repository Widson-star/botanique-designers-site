// Phase 1B-A2 shared-project-form helpers — PURE functions.
//
// Responsibilities:
//   * project record  -> form state       (projectToFormState)
//   * form state       -> INSERT payload   (buildCreatePayload)
//   * form state       -> changed-field UPDATE patch (buildUpdatePatch)
//   * material owner quick-action patches  (buildActionPatch)
//   * validation matching the database constraints (validateProjectForm)
//   * blank optional -> null normalisation (normalizeOptional)
//
// Rules enforced here (see the Phase 1B-A1 migration + product requirements):
//   * Audit-controlled columns are NEVER sent: created_by/at, updated_by/at,
//     archived_by/at, last_updated. Finance columns are never sent.
//   * Updates carry ONLY genuinely changed fields (no full-object PATCH).
//   * Manager payloads are role-scoped: forced Pending/non-archived/portfolio
//     defaults on create; owner-reserved fields excluded from an update patch.
//   * Optional blanks normalise to null so an inaccessible/absent value is not
//     coerced into an empty string.
import { isManager, isOwner, MATERIAL_FIELD_KEYS } from "./projectCapabilities";

// Blank / whitespace-only optional inputs normalise to null; otherwise trimmed.
export function normalizeOptional(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

// Optional date input -> ISO date string or null (never "").
export function normalizeDate(value) {
  const normalised = normalizeOptional(value);
  return normalised;
}

// An empty form for the create route.
export function emptyProjectForm(role) {
  return {
    projectName: "",
    clientSiteName: "",
    location: "",
    county: "",
    projectType: "Residential",
    status: isManager(role) ? "Pending" : "Pending",
    stage: "Inquiry",
    leadPersonId: "",
    startDate: "",
    actualStartDate: "",
    targetCompletionDate: "",
    actualCompletionDate: "",
    nextAction: "",
    nextActionDate: "",
    blocker: "",
    notes: "",
    portfolioEligible: false,
    portfolioPermissionStatus: "Not Reviewed",
  };
}

// Map a loaded project (camelCase, from projectMappers) into editable form state.
export function projectToFormState(project) {
  return {
    projectName: project.projectName || "",
    clientSiteName: project.clientSiteName || "",
    location: project.location || "",
    county: project.county || "",
    projectType: project.projectType || "Residential",
    status: project.status,
    stage: project.stage,
    leadPersonId: project.leadPersonId || "",
    startDate: project.startDate || "",
    actualStartDate: project.actualStartDate || "",
    targetCompletionDate: project.targetCompletionDate || "",
    actualCompletionDate: project.actualCompletionDate || "",
    nextAction: project.nextAction || "",
    nextActionDate: project.nextActionDate || "",
    blocker: project.blocker || "",
    notes: project.notes || "",
    portfolioEligible: Boolean(project.portfolioEligible),
    portfolioPermissionStatus: project.portfolioPermissionStatus,
  };
}

// Full DB-shaped operational value set from a form (used for diffing / create).
// Never includes audit or finance columns.
function formToOperationalValues(form) {
  return {
    project_name: normalizeOptional(form.projectName),
    client_site_name: normalizeOptional(form.clientSiteName),
    location: normalizeOptional(form.location),
    county: normalizeOptional(form.county),
    project_type: form.projectType,
    status: form.status,
    stage: form.stage,
    lead_person_id: form.leadPersonId ? form.leadPersonId : null,
    start_date: normalizeDate(form.startDate),
    actual_start_date: normalizeDate(form.actualStartDate),
    target_completion_date: normalizeDate(form.targetCompletionDate),
    actual_completion_date: normalizeDate(form.actualCompletionDate),
    next_action: normalizeOptional(form.nextAction),
    next_action_date: normalizeDate(form.nextActionDate),
    blocker: normalizeOptional(form.blocker),
    notes: normalizeOptional(form.notes),
    portfolio_eligible: Boolean(form.portfolioEligible),
    portfolio_permission_status: form.portfolioPermissionStatus,
  };
}

// Columns a role may include when CREATING a project.
const OWNER_CREATE_COLUMNS = [
  "project_name",
  "client_site_name",
  "location",
  "county",
  "project_type",
  "status",
  "stage",
  "lead_person_id",
  "start_date",
  "actual_start_date",
  "target_completion_date",
  "actual_completion_date",
  "next_action",
  "next_action_date",
  "blocker",
  "notes",
  "portfolio_eligible",
  "portfolio_permission_status",
];

// A manager creates a Pending intake record only: no material status, no
// archived, no actual completion, portfolio publication left at owner defaults.
// A proposed target_completion_date IS allowed (planning value).
const MANAGER_CREATE_COLUMNS = [
  "project_name",
  "client_site_name",
  "location",
  "county",
  "project_type",
  "stage",
  "lead_person_id",
  "start_date",
  "actual_start_date",
  "target_completion_date",
  "next_action",
  "next_action_date",
  "blocker",
  "notes",
];

export function buildCreatePayload(form, role) {
  const values = formToOperationalValues(form);
  const payload = {};

  if (isOwner(role)) {
    for (const col of OWNER_CREATE_COLUMNS) payload[col] = values[col];
    return payload;
  }

  // Manager: role-scoped intake defaults.
  for (const col of MANAGER_CREATE_COLUMNS) payload[col] = values[col];
  payload.status = "Pending";
  payload.portfolio_eligible = false;
  payload.portfolio_permission_status = "Not Reviewed";
  return payload;
}

// Columns a role may CHANGE via an update patch. Note: `archived` is excluded
// for both — archive/restore is an explicit owner quick action, never a form
// field. `last_updated` and all audit/finance columns are never editable.
const OWNER_UPDATE_COLUMNS = [
  "project_name",
  "client_site_name",
  "location",
  "county",
  "project_type",
  "status",
  "stage",
  "lead_person_id",
  "start_date",
  "actual_start_date",
  "target_completion_date",
  "actual_completion_date",
  "next_action",
  "next_action_date",
  "blocker",
  "notes",
  "portfolio_eligible",
  "portfolio_permission_status",
];

// Phase 1B-A4 — a manager's DIRECT update patch now carries ONLY low-risk
// operational fields. Every material identity/authority/schedule field
// (project_name, client_site_name, location, county, project_type, stage,
// lead_person_id, start_date, actual_start_date) is excluded here and instead
// routed through a project_material_change approval (see buildMaterialProposal).
// status remains (the form only offers Ongoing<->Paused for a manager).
const MANAGER_UPDATE_COLUMNS = [
  "status",
  "next_action",
  "next_action_date",
  "blocker",
  "notes",
];

function valuesEqual(a, b) {
  // null and "" are treated as equal-to-null already (normalised). Booleans and
  // strings compare directly; dates are ISO strings.
  return a === b;
}

export function buildUpdatePatch(form, originalProject, role) {
  const next = formToOperationalValues(form);
  const prev = formToOperationalValues(projectToFormState(originalProject));
  const columns = isOwner(role) ? OWNER_UPDATE_COLUMNS : MANAGER_UPDATE_COLUMNS;

  const patch = {};
  for (const col of columns) {
    if (!valuesEqual(next[col], prev[col])) {
      patch[col] = next[col];
    }
  }
  return patch;
}

// ---- Manager material-change proposal + intake proposal -------------------
// Build a project_material_change proposal payload from a proposed-values form
// keyed by material field. Only genuinely changed material fields are included;
// original snapshot mirrors the proposed key set (matching the database
// validator). `proposed` is a partial map of material field key -> new value
// (already form-normalised). Returns { changedKeys, originalValues, proposedValues }.
export function buildMaterialProposal(originalProject, proposed) {
  const current = formToOperationalValues(projectToFormState(originalProject));
  const originalValues = {};
  const proposedValues = {};
  const changedKeys = [];
  for (const key of MATERIAL_FIELD_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(proposed, key)) continue;
    const nextValue = proposed[key];
    if (valuesEqual(nextValue, current[key])) continue;
    changedKeys.push(key);
    originalValues[key] = current[key];
    proposedValues[key] = nextValue;
  }
  return { changedKeys, originalValues, proposedValues };
}

// Intake proposal payload (project_intake_requests.proposed_values). Only the
// minimum, non-owner-reserved intake fields; never status/stage/lead/portfolio.
const INTAKE_KEYS = [
  "project_name",
  "project_type",
  "client_site_name",
  "location",
  "county",
  "notes",
  "start_date",
  "target_completion_date",
];

export function buildIntakePayload(form) {
  const values = formToOperationalValues(form);
  const payload = {};
  for (const key of INTAKE_KEYS) {
    const value = values[key];
    // project_name and project_type are always sent; optionals only when set.
    if (key === "project_name" || key === "project_type") {
      payload[key] = value;
    } else if (value !== null && value !== undefined && value !== "") {
      payload[key] = value;
    }
  }
  return payload;
}

// ---- Owner material quick-action patches ----------------------------------
// Each sends ONLY the genuinely changing field(s); no coupled/silent changes.
export function buildActivatePatch() {
  return { status: "Ongoing" };
}

export function buildMarkCompletedPatch(actualCompletionDate) {
  const date = normalizeDate(actualCompletionDate);
  if (!date) {
    throw new Error("An actual completion date is required.");
  }
  return {
    status: "Completed",
    actual_completion_date: date,
  };
}

export function validateActualCompletionDate(actualCompletionDate, actualStartDate) {
  const date = normalizeDate(actualCompletionDate);
  if (!date) return "An actual completion date is required.";
  const start = normalizeDate(actualStartDate);
  if (start && date < start) {
    return `Actual completion cannot be before the actual start date (${start}).`;
  }
  return "";
}

export function buildCancelPatch() {
  return { status: "Cancelled" };
}

export function buildDesignOnlyPatch() {
  return { status: "Design-only" };
}

export function buildArchivePatch() {
  return { archived: true };
}

export function buildRestorePatch() {
  return { archived: false };
}

// ---- Validation (mirrors database CHECK constraints) ----------------------
const LIMITS = {
  projectName: 160,
  clientSiteName: 160,
  location: 120,
  county: 80,
  nextAction: 500,
  blocker: 500,
  notes: 5000,
};

export function validateProjectForm(form) {
  const errors = {};

  const name = normalizeOptional(form.projectName);
  if (!name) {
    errors.projectName = "Project name is required.";
  } else if (name.length > LIMITS.projectName) {
    errors.projectName = `Project name must be ${LIMITS.projectName} characters or fewer.`;
  }

  const lengthChecks = [
    ["clientSiteName", "Client / site label"],
    ["location", "Location"],
    ["county", "County"],
    ["nextAction", "Next action"],
    ["blocker", "Blocker"],
    ["notes", "Notes"],
  ];
  for (const [key, label] of lengthChecks) {
    const value = normalizeOptional(form[key]);
    if (value && value.length > LIMITS[key]) {
      errors[key] = `${label} must be ${LIMITS[key]} characters or fewer.`;
    }
  }

  const start = normalizeDate(form.startDate);
  const target = normalizeDate(form.targetCompletionDate);
  if (start && target && target < start) {
    errors.targetCompletionDate =
      "Target completion cannot be before the planned start date.";
  }

  const actualStart = normalizeDate(form.actualStartDate);
  const actualCompletion = normalizeDate(form.actualCompletionDate);
  if (actualStart && actualCompletion && actualCompletion < actualStart) {
    errors.actualCompletionDate =
      "Actual completion cannot be before the actual start date.";
  }

  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
