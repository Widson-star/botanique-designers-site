// The admin data context object + consumer hook, kept in a non-component module
// so the provider file can export only its component (React Fast Refresh /
// react-refresh/only-export-components stays satisfied).
import { createContext, useContext } from "react";

export const AdminDataContext = createContext(null);

export function useAdminData() {
  const value = useContext(AdminDataContext);
  if (!value) {
    throw new Error("useAdminData must be used within an AdminDataProvider");
  }
  return value;
}
