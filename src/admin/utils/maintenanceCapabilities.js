// Role capabilities for Operations > Maintenance. These mirror the database
// authority and never widen it: Principal and Operations Manager operate the
// Maintenance portfolio; Project Team and Read-only do not enter Maintenance
// V1. Exceptional history/closure actions stay Principal-only.
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
  "weekly", "fortnightly", "monthly", "quarterly", "biannual", "annual", "as_needed", "other",
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

export const MAINTENANCE_ASSIGNMENT_ROLES = [
  "maintenance_lead", "site_technician", "inspector", "supervisor", "support",
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

// Day-to-day Maintenance operations are portfolio-wide for both operational
// authority roles. Supabase's can_manage_maintenance_project() is the real ACL.
export function canManageMaintenance(role) {
  return canSeeMaintenance(role);
}

// Ending the service relationship is a terminal business action, not ordinary
// scheduling. The database independently enforces this owner-only boundary.
export function canEndMaintenance(role) {
  return role === ROLES.OWNER;
}

// Correcting already-recorded assignment history is also exceptional authority.
export function canCorrectMaintenanceAssignment(role) {
  return role === ROLES.OWNER;
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
