// Phase 1B-A2 role/authority capabilities — PURE functions.
//
// These mirror the database authority applied in
// supabase/migrations/20260726000200_operations_hub_phase_1b_a1_project_integrity.sql
// (the interim owner/material-authority boundary + the project-lead guard). The UI
// uses them so it never renders a control whose write the database would reject.
// The database remains the source of truth; nothing here weakens it.
import { ROLES } from "../constants/roles";
import { PROJECT_STAGES, PROJECT_STATUSES } from "../constants/projectStatus";

// Stages the interim boundary reserves to the owner in BOTH directions.
export const OWNER_ONLY_STAGES = ["Completed", "Archived"];

// Operational stages a manager may set / move between.
export const MANAGER_STAGES = PROJECT_STAGES.filter(
  (stage) => !OWNER_ONLY_STAGES.includes(stage)
);

// Statuses a manager may toggle an already-active project between.
export const MANAGER_STATUS_TOGGLE = ["Ongoing", "Paused"];

export function isOwner(role) {
  return role === ROLES.OWNER;
}

export function isManager(role) {
  return role === ROLES.MANAGER;
}

export function canCreateProjects(role) {
  return isOwner(role) || isManager(role);
}

export function canEditProjects(role) {
  return isOwner(role) || isManager(role);
}

// The owner-facing "Pending activation" list is owner-only.
export function canSeePendingActivation(role) {
  return isOwner(role);
}

// ---- Material owner actions (quick actions) -------------------------------
// Each returns whether the action is available for this role + project state.
export function canActivate(role, project) {
  return isOwner(role) && !project.archived && project.status === "Pending";
}

export function canMarkCompleted(role, project) {
  return (
    isOwner(role) &&
    !project.archived &&
    !["Completed", "Cancelled"].includes(project.status)
  );
}

export function canCancel(role, project) {
  return (
    isOwner(role) &&
    !project.archived &&
    !["Cancelled", "Completed"].includes(project.status)
  );
}

export function canClassifyDesignOnly(role, project) {
  return (
    isOwner(role) &&
    !project.archived &&
    project.status !== "Design-only" &&
    project.status !== "Completed" &&
    project.status !== "Cancelled"
  );
}

export function canArchive(role, project) {
  return isOwner(role) && !project.archived;
}

export function canRestore(role, project) {
  return isOwner(role) && project.archived;
}

export function hasOwnerMaterialActions(role, project) {
  return (
    canActivate(role, project) ||
    canMarkCompleted(role, project) ||
    canCancel(role, project) ||
    canClassifyDesignOnly(role, project) ||
    canArchive(role, project) ||
    canRestore(role, project)
  );
}

// ---- Shared-form field authority ------------------------------------------
// mode is "create" | "edit". currentStatus/currentStage come from the project
// being edited (ignored on create).

export function statusOptionsForForm(role, mode, currentStatus) {
  if (isOwner(role)) return PROJECT_STATUSES;
  // Manager create is fixed to Pending.
  if (mode === "create") return ["Pending"];
  // Manager edit may only toggle an already-active project Ongoing<->Paused.
  if (MANAGER_STATUS_TOGGLE.includes(currentStatus)) return MANAGER_STATUS_TOGGLE;
  // Any other status is protected: shown read-only, no re-selection.
  return [currentStatus];
}

export function isStatusEditable(role, mode, currentStatus) {
  if (isOwner(role)) return true;
  if (mode === "create") return false; // fixed Pending
  return MANAGER_STATUS_TOGGLE.includes(currentStatus);
}

export function stageOptionsForForm(role, mode, currentStage) {
  if (isOwner(role)) return PROJECT_STAGES;
  if (mode === "create") return MANAGER_STAGES;
  // Manager edit cannot set OR reverse a Completed/Archived stage.
  if (OWNER_ONLY_STAGES.includes(currentStage)) return [currentStage];
  return MANAGER_STAGES;
}

export function isStageEditable(role, mode, currentStage) {
  if (isOwner(role)) return true;
  if (mode === "create") return true;
  return !OWNER_ONLY_STAGES.includes(currentStage);
}

// Target completion: owner any time; manager only proposes it at creation.
export function isTargetCompletionEditable(role, mode) {
  if (isOwner(role)) return true;
  return isManager(role) && mode === "create";
}

// Actual completion is owner-only in the form (managers never touch it; the
// owner "Mark completed" quick action is the primary path).
export function isActualCompletionEditable(role) {
  return isOwner(role);
}

// Portfolio eligibility + permission publication state are owner-only.
export function isPortfolioEditable(role) {
  return isOwner(role);
}

// Accountable-lead choices for a role, drawn from the RLS-visible profiles.
// Owner may assign an active owner/manager/staff profile; manager may assign
// himself or an active staff profile. (RLS already restricts what a manager can
// read, so this is defence-in-depth mirroring the database validator.)
export function leadOptionsForRole(role, profiles = [], currentUserId = "") {
  const active = profiles.filter((profile) => profile.is_active);
  if (isOwner(role)) {
    return active.filter((profile) =>
      ["owner", "manager", "staff"].includes(profile.role)
    );
  }
  if (isManager(role)) {
    return active.filter(
      (profile) => profile.role === "staff" || profile.id === currentUserId
    );
  }
  return [];
}

// A single capability snapshot for the shared form.
export function projectFormCapabilities(role, mode, project) {
  const currentStatus = project?.status;
  const currentStage = project?.stage;
  return {
    owner: isOwner(role),
    manager: isManager(role),
    statusOptions: statusOptionsForForm(role, mode, currentStatus),
    statusEditable: isStatusEditable(role, mode, currentStatus),
    stageOptions: stageOptionsForForm(role, mode, currentStage),
    stageEditable: isStageEditable(role, mode, currentStage),
    targetCompletionEditable: isTargetCompletionEditable(role, mode),
    actualCompletionEditable: isActualCompletionEditable(role),
    actualCompletionVisible: isOwner(role),
    portfolioEditable: isPortfolioEditable(role),
  };
}
