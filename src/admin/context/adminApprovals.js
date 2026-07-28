import { createContext, useContext } from "react";

export const AdminApprovalsContext = createContext(null);

export function useAdminApprovals() {
  const value = useContext(AdminApprovalsContext);
  if (!value) {
    throw new Error("useAdminApprovals must be used within an AdminApprovalsProvider");
  }
  return value;
}
