import { createContext, useContext } from "react";

export const MaintenanceContext = createContext(null);

export function useMaintenance() {
  const value = useContext(MaintenanceContext);
  if (!value) throw new Error("useMaintenance must be used within MaintenanceProvider");
  return value;
}
