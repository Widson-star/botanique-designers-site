// Role capabilities and pure derivations for Operations > Maintenance. These
// mirror the database authority (they never widen it) — the RLS helper
// public.can_manage_maintenance_project is the real boundary; owner reaches
// every project, a manager reaches a project they lead or are assigned to.
// Staff and viewer have no access, matching every other Operations domain.
import { ROLES } from "../constants/roles";

export const MAINTENANCE_RELATIONSHIP_STATUSES = ["active", "paused", "ended"];

export const MAINTENANCE_RELATIONSHIP_STATUS_LABELS = {
  active: "Active",
  paused: "Paused",
  ended: "Ended",
};

export const MAINTENANCE_VISIT_STATUSES = ["scheduled", "completed", "cancelled"];

export const MAINTENANCE_VISIT_STATUS_LABELS = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const MAINTENANCE_FREQUENCIES = [
  "weekly",
  "fortnightly",
  "monthly",
  "quarterly",
  "biannual",
  "annual",
  "as_needed",
  "other",
];

export const MAINTENANCE_FREQUENCY_LABELS = {
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  biannual: "Biannual",
  annual: "Annual",
  as_needed: "As needed",
  other: "Other",
};

// A maintenance responsibility is a distinct fact from a project engagement
// role, so it keeps its own, deliberately small, vocabulary.
export const MAINTENANCE_ASSIGNMENT_ROLES = [
  "maintenance_lead",
  "site_technician",
  "inspector",
  "supervisor",
  "support",
];

export const MAINTENANCE_ASSIGNMENT_ROLE_LABELS = {
  maintenance_lead: "Maintenance lead",
  site_technician: "Site technician",
  inspector: "Inspector",
  supervisor: "Supervisor",
  support: "Support",
};

export function canSeeMaintenance(role) {
  return role === ROLES.OWNER || role === ROLES.MANAGER;
}

export function canManageMaintenance(role) {
  return canSeeMaintenance(role);
}

export function frequencyLabel(frequency) {
  return MAINTENANCE_FREQUENCY_LABELS[frequency] || frequency;
}

export function relationshipStatusLabel(status) {
  return MAINTENANCE_RELATIONSHIP_STATUS_LABELS[status] || status;
}

export function visitStatusLabel(status) {
  return MAINTENANCE_VISIT_STATUS_LABELS[status] || status;
}

export function assignmentRoleLabel(role) {
  return MAINTENANCE_ASSIGNMENT_ROLE_LABELS[role] || role;
}
