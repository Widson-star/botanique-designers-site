import { createContext, useContext } from "react";

export const SiteCostsContext = createContext(null);

export function useSiteCosts() {
  const value = useContext(SiteCostsContext);
  if (!value) throw new Error("useSiteCosts must be used within SiteCostsProvider");
  return value;
}
