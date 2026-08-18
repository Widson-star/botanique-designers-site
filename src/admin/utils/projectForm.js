import { isManager, isOwner, MATERIAL_FIELD_KEYS } from "./projectCapabilities";

export function normalizeOptional(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

export function normalizeDate(value) {
  return normalizeOptional(value);
}

export function deriveInitialStatusFromStage(stage) {
  if (stage === "Inquiry") return "Pending";
  if (stage === "Completed") return "Completed";
  return "Ongoing";
}

export function emptyProjectForm(role) {
  return {
    projectName: "",
    siteName: "",
    clientSiteName: "",
    location: "",
    county: "",
    projectType: "Residential",
    status: "Pending",
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

export function projectToFormState(project) {
  return {
    projectName: project.projectName || "",
    siteName: project.siteName || project.projectName || "",
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

const OWNER_CREATE_COLUMNS = [
  "project_name", "client_site_name", "location", "county", "project_type",
  "status", "stage", "lead_person_id", "start_date", "actual_start_date",
  "target_completion_date", "actual_completion_date", "next_action",
  "next_action_date", "blocker", "notes", "portfolio_eligible",
  "portfolio_permission_status",
];

const MANAGER_CREATE_COLUMNS = [
  "project_name", "client_site_name", "location", "county", "project_type",
  "stage", "lead_person_id", "start_date", "actual_start_date",
  "target_completion_date", "next_action", "next_action_date", "blocker", "notes",
];

export function buildCreatePayload(form, role) {
  const values = formToOperationalValues(form);
  const payload = {};

  if (isOwner(role)) {
    values.status = deriveInitialStatusFromStage(values.stage);
    if (values.status === "Completed") {
      values.next_action = null;
      values.next_action_date = null;
      values.blocker = null;
    }
    for (const col of OWNER_CREATE_COLUMNS) payload[col] = values[col];
    // Client-only site identity consumed by the Supabase adapter before POST.
    payload.__site_name = normalizeOptional(form.siteName) || values.project_name;
    return payload;
  }

  for (const col of MANAGER_CREATE_COLUMNS) payload[col] = values[col];
  payload.status = "Pending";
  payload.stage = "Inquiry";
  payload.portfolio_eligible = false;
  payload.portfolio_permission_status = "Not Reviewed";
  return payload;
}

const OWNER_UPDATE_COLUMNS = [
  "project_name", "client_site_name", "location", "county", "project_type",
  "status", "stage", "lead_person_id", "start_date", "actual_start_date",
  "target_completion_date", "actual_completion_date", "next_action",
  "next_action_date", "blocker", "notes", "portfolio_eligible",
  "portfolio_permission_status",
];
const MANAGER_UPDATE_COLUMNS = ["next_action", "next_action_date", "blocker", "notes"];

function valuesEqual(a, b) { return a === b; }

export function buildUpdatePatch(form, originalProject, role) {
  const next = formToOperationalValues(form);
  const prev = formToOperationalValues(projectToFormState(originalProject));
  const columns = isOwner(role) ? OWNER_UPDATE_COLUMNS : MANAGER_UPDATE_COLUMNS;
  const patch = {};
  for (const col of columns) if (!valuesEqual(next[col], prev[col])) patch[col] = next[col];
  if (Object.keys(patch).length > 0 && originalProject?.updatedAt) {
    patch.__expected_updated_at = originalProject.updatedAt;
  }
  return patch;
}

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

const INTAKE_KEYS = [
  "project_name", "project_type", "client_site_name", "location", "county",
  "notes", "start_date", "target_completion_date",
];
export function buildIntakePayload(form) {
  const values = formToOperationalValues(form);
  const payload = {};
  for (const key of INTAKE_KEYS) {
    const value = values[key];
    if (key === "project_name" || key === "project_type") payload[key] = value;
    else if (value !== null && value !== undefined && value !== "") payload[key] = value;
  }
  return payload;
}

export function buildActivatePatch() { return { status: "Ongoing" }; }

export function buildMarkCompletedPatch(actualCompletionDate) {
  const date = normalizeDate(actualCompletionDate);
  if (!date) throw new Error("An actual completion date is required.");
  return {
    status: "Completed",
    stage: "Completed",
    actual_completion_date: date,
    next_action: null,
    next_action_date: null,
    blocker: null,
  };
}

export function validateActualCompletionDate(actualCompletionDate, actualStartDate) {
  const date = normalizeDate(actualCompletionDate);
  if (!date) return "An actual completion date is required.";
  const start = normalizeDate(actualStartDate);
  if (start && date < start) return `Actual completion cannot be before the actual start date (${start}).`;
  return "";
}

export function buildCancelPatch() { return { status: "Cancelled" }; }
export function buildDesignOnlyPatch() { return { status: "Design-only" }; }
export function buildArchivePatch() { return { archived: true }; }
export function buildRestorePatch() { return { archived: false }; }

const LIMITS = {
  projectName: 160,
  siteName: 160,
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
  if (!name) errors.projectName = "Project name is required.";
  else if (name.length > LIMITS.projectName) errors.projectName = `Project name must be ${LIMITS.projectName} characters or fewer.`;

  const siteName = normalizeOptional(form.siteName);
  if (siteName && siteName.length > LIMITS.siteName) errors.siteName = `Site / property name must be ${LIMITS.siteName} characters or fewer.`;

  const lengthChecks = [
    ["clientSiteName", "Client / account label"], ["location", "Location"], ["county", "County"],
    ["nextAction", "Next action"], ["blocker", "Blocker"], ["notes", "Notes"],
  ];
  for (const [key, label] of lengthChecks) {
    const value = normalizeOptional(form[key]);
    if (value && value.length > LIMITS[key]) errors[key] = `${label} must be ${LIMITS[key]} characters or fewer.`;
  }

  const start = normalizeDate(form.startDate);
  const target = normalizeDate(form.targetCompletionDate);
  if (start && target && target < start) errors.targetCompletionDate = "Target completion cannot be before the planned start date.";
  const actualStart = normalizeDate(form.actualStartDate);
  const actualCompletion = normalizeDate(form.actualCompletionDate);
  if (actualStart && actualCompletion && actualCompletion < actualStart) errors.actualCompletionDate = "Actual completion cannot be before the actual start date.";
  return errors;
}

export function hasErrors(errors) { return Object.keys(errors).length > 0; }
