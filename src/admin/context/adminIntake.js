import { createContext, useContext } from "react";

export const AdminIntakeContext = createContext(null);

export function useAdminIntake() {
  const value = useContext(AdminIntakeContext);
  if (!value) {
    throw new Error("useAdminIntake must be used within an AdminIntakeProvider");
  }
  return value;
}
