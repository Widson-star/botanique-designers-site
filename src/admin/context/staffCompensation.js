import { createContext, useContext } from "react";

export const StaffCompensationContext = createContext(null);

export function useStaffCompensation() {
  const value = useContext(StaffCompensationContext);
  if (!value) throw new Error("useStaffCompensation must be used inside StaffCompensationProvider");
  return value;
}
