export const ROLES = {
  OWNER: "owner",
  MANAGER: "manager",
  STAFF: "staff",
};

export const ROLE_LABELS = {
  [ROLES.OWNER]: "Owner preview",
  [ROLES.MANAGER]: "Manager preview",
  [ROLES.STAFF]: "Staff preview",
};

export const ROLE_DESCRIPTIONS = {
  [ROLES.OWNER]: "Widson view: full operational access plus owner-only financial references.",
  [ROLES.MANAGER]: "Martine view: operational project access with all financial references hidden.",
  [ROLES.STAFF]: "Staff/casual view: limited assigned project visibility with financial references hidden.",
};
