import { ROLES } from "../constants/roles";

// The Finance shell destination itself — whether the nav item and /admin/finance
// route render at all. Each area inside Finance is still separately gated by
// its own existing capability (canSeeSiteCosts, canSeeFundRequests); this
// widens nothing beyond what those two already allow, since both currently
// resolve to the same owner/manager rule.
export function canSeeFinance(role) {
  return role === ROLES.OWNER || role === ROLES.MANAGER;
}
