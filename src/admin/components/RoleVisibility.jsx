import { canViewFinancialReferences } from "../utils/permissions";

export default function RoleVisibility({ role, ownerOnly = false, children }) {
  if (ownerOnly && !canViewFinancialReferences(role)) return null;
  return children;
}
