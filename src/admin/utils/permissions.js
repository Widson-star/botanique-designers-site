import { ROLES } from "../constants/roles";

export function canViewFinancialReferences(role) {
  return role === ROLES.OWNER;
}

export function canManageStaff(role) {
  return role === ROLES.OWNER || role === ROLES.MANAGER;
}

export function canViewProject(project, role) {
  if (role === ROLES.OWNER || role === ROLES.MANAGER) return true;
  if (role === ROLES.STAFF && project.accessGranted) return true;
  if (role === ROLES.STAFF) return project.assignments?.includes("Staff / Casual Team");
  return false;
}

export function getVisibleProjects(projects, role) {
  return projects.filter((project) => canViewProject(project, role));
}
