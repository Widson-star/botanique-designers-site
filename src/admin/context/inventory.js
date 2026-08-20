import { createContext, useContext } from "react";

export const InventoryContext = createContext(null);

export function useInventory() {
  const value = useContext(InventoryContext);
  if (!value) throw new Error("useInventory must be used within InventoryProvider");
  return value;
}
