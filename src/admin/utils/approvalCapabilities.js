import { ROLES } from "../constants/roles";

export const ACTIVE_APPROVAL_STATES = [
  "submitted",
  "awaiting_review",
  "amendment_requested",
];

export function canSeeApprovals(role) {
  return role === ROLES.OWNER || role === ROLES.MANAGER;
}

export function canDecideApproval(role, request) {
  return role === ROLES.OWNER && request?.state === "awaiting_review";
}

export function canWithdrawApproval(role, request, currentUserId) {
  return (
    [ROLES.OWNER, ROLES.MANAGER].includes(role) &&
    request?.requesterId === currentUserId &&
    ACTIVE_APPROVAL_STATES.includes(request?.state) &&
    !(request.state === "awaiting_review" && request.reviewedAt)
  );
}

export function canAmendApproval(role, request, currentUserId) {
  return (
    [ROLES.OWNER, ROLES.MANAGER].includes(role) &&
    request?.requesterId === currentUserId &&
    request?.state === "amendment_requested"
  );
}

export function requestableProjectApprovalTypes(role, project) {
  if (role !== ROLES.MANAGER || !project) return [];
  if (project.archived) return ["project_restore"];

  const types = [];
  if (project.status === "Pending") types.push("project_activation");
  if (!["Completed", "Cancelled", "Design-only"].includes(project.status)) {
    types.push("project_target_completion_change");
  }
  if (!["Completed", "Cancelled"].includes(project.status)) {
    types.push("project_completion", "project_cancellation");
  }
  types.push("project_archive");
  return types;
}

export function proposedValuesForApproval(type, value = "") {
  switch (type) {
    case "project_activation":
      return { status: "Ongoing" };
    case "project_target_completion_change":
      return { target_completion_date: value };
    case "project_completion":
      return { status: "Completed", actual_completion_date: value };
    case "project_cancellation":
      return { status: "Cancelled" };
    case "project_archive":
      return { archived: true };
    case "project_restore":
      return { archived: false };
    default:
      return {};
  }
}

export function originalValuesForApproval(type, project) {
  switch (type) {
    case "project_activation":
    case "project_cancellation":
      return { status: project.status };
    case "project_target_completion_change":
      return { target_completion_date: project.targetCompletionDate || null };
    case "project_completion":
      return {
        status: project.status,
        actual_completion_date: project.actualCompletionDate || null,
      };
    case "project_archive":
    case "project_restore":
      return { archived: project.archived };
    default:
      return {};
  }
}
