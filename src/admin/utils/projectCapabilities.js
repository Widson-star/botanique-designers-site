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

// Operational stages a manager may PROPOSE (material change) — never terminal.
export const MANAGER_STAGES = PROJECT_STAGES.filter(
  (stage) => !OWNER_ONLY_STAGES.includes(stage)
);

// Statuses a manager may toggle an already-active project between (low-risk,
// direct — Ongoing<->Paused is the one status move that stays a direct write).
export const MANAGER_STATUS_TOGGLE = ["Ongoing", "Paused"];

// Phase 1B-A4 — the material project fields a manager may no longer edit
// directly. Changes to these route through a project_material_change approval
// for Principal review. This list MUST match the database allowlist in
// supabase/migrations/20260729000100_operations_hub_project_material_change_approvals.sql
// (public.private_project_material_allowlist).
export const MATERIAL_FIELD_KEYS = [
  "project_name",
  "client_site_name",
  "location",
  "county",
  "project_type",
  "stage",
  "lead_person_id",
  "start_date",
  "actual_start_date",
];

export const MATERIAL_FIELD_LABELS = {
  project_name: "Project name",
  client_site_name: "Client / site label",
  location: "Location",
  county: "County",
  project_type: "Project type",
  stage: "Stage",
  lead_person_id: "Accountable lead",
  start_date: "Planned start",
  actual_start_date: "Actual start",
};

// The low-risk operational fields a manager keeps as a direct, audited write on
// an authorised project (never material identity/authority/schedule).
export const MANAGER_LOW_RISK_KEYS = [
  "status", // only Ongoing<->Paused, enforced by statusOptionsForForm
  "next_action",
  "next_action_date",
  "blocker",
  "notes",
];

export function isOwner(role) {
  return role === ROLES.OWNER;
}

export function isManager(role) {
  return role === ROLES.MANAGER;
}

// The create/edit ROUTES remain reachable for owner and manager, but the
// behaviour differs by role (see the direct/proposal helpers below).
export function canCreateProjects(role) {
  return isOwner(role) || isManager(role);
}

export function canEditProjects(role) {
  return isOwner(role) || isManager(role);
}

// Only the owner creates a live project directly; a manager submits a
// restricted project-intake proposal for Principal approval.
export function canCreateProjectDirectly(role) {
  return isOwner(role);
}

export function canProposeProjectIntake(role) {
  return isManager(role);
}

// A manager proposes material changes (never writes them directly); the owner
// edits material fields directly.
export function canProposeMaterialChange(role) {
  return isManager(role);
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
  // Stage is now a MATERIAL field for managers: not a direct write. The manager
  // intake proposal opens every project at Inquiry, so no stage choice is
  // offered on create either; any later stage move is a material-change proposal.
  return [currentStage];
}

export function isStageEditable(role) {
  // Owner edits stage directly; manager stage changes are material (proposed).
  return isOwner(role);
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

// A single capability snapshot for the shared form. `materialEditable` gates
// the material identity/authority/schedule fields: owner edits them directly,
// a manager sees them read-only and proposes changes for Principal approval.
export function projectFormCapabilities(role, mode, project) {
  const currentStatus = project?.status;
  const currentStage = project?.stage;
  return {
    owner: isOwner(role),
    manager: isManager(role),
    materialEditable: isOwner(role),
    proposesMaterial: isManager(role),
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
