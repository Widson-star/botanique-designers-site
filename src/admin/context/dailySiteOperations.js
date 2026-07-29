import { createContext, useContext } from "react";

export const DailySiteOperationsContext = createContext(null);

export function useDailySiteOperations() {
  const value = useContext(DailySiteOperationsContext);
  if (!value) {
    throw new Error("useDailySiteOperations must be used within a DailySiteOperationsProvider");
  }
  return value;
}
