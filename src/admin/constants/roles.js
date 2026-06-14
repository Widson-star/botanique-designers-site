export const ROLES = {
  OWNER: "owner",
  MANAGER: "manager",
  STAFF: "staff",
  VIEWER: "viewer",
};

export const ROLE_LABELS = {
  [ROLES.OWNER]: "Owner",
  [ROLES.MANAGER]: "Manager",
  [ROLES.STAFF]: "Staff",
  [ROLES.VIEWER]: "Viewer",
};

export const ROLE_DESCRIPTIONS = {
  [ROLES.OWNER]: "Widson view: full operational access plus owner-only financial references.",
  [ROLES.MANAGER]: "Martine view: operational project access with all financial references hidden.",
  [ROLES.STAFF]: "Staff/casual view: limited assigned project visibility with financial references hidden.",
  [ROLES.VIEWER]: "Read-only view for permitted records, with financial references hidden.",
};
