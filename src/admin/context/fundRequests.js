import { createContext, useContext } from "react";

export const FundRequestsContext = createContext(null);

export function useFundRequests() {
  const value = useContext(FundRequestsContext);
  if (!value) throw new Error("useFundRequests must be used within FundRequestsProvider");
  return value;
}
