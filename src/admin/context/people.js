import { createContext, useContext } from "react";

export const PeopleContext = createContext(null);

export function usePeople() {
  const value = useContext(PeopleContext);
  if (!value) throw new Error("usePeople must be used within PeopleProvider");
  return value;
}
