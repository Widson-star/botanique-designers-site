export const ROLES = {
  OWNER: "owner",
  MANAGER: "manager",
  STAFF: "staff",
  VIEWER: "viewer",
};

// Display labels only; the database role VALUES (owner/manager/staff/viewer)
// are never changed. Manager is presented as "Operations Manager".
export const ROLE_LABELS = {
  [ROLES.OWNER]: "Principal",
  [ROLES.MANAGER]: "Operations Manager",
  [ROLES.STAFF]: "Project Team",
  [ROLES.VIEWER]: "Read-only",
};

export const ROLE_DESCRIPTIONS = {
  [ROLES.OWNER]: "Founder & Principal — Widson Omutelema Ambaisi, with full operational authority.",
  [ROLES.MANAGER]: "Martine Lotom — portfolio-wide operational project access.",
  [ROLES.STAFF]: "Assigned project and task visibility for the project team.",
  [ROLES.VIEWER]: "Read-only access to permitted operational records.",
};
