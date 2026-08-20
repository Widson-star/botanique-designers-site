import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import InventoryProvider from "./InventoryProvider";
import { useInventory } from "./inventory";

// Captures the provider's context so each mutation can be called directly.
function Probe({ onReady }) {
  onReady(useInventory());
  return null;
}

function mount({ isDemo, role = "owner", token = "demo-token" }) {
  let value = null;
  render(
    <InventoryProvider session={{ access_token: token, user: { id: "u1" } }} role={role} isDemo={isDemo}>
      <Probe onReady={(next) => { value = next; }} />
    </InventoryProvider>,
  );
  return () => value;
}

describe("InventoryProvider in demo mode", () => {
  let fetchSpy;

  beforeEach(() => {
    fetchSpy = vi.fn(() => Promise.resolve({
      ok: true, text: () => Promise.resolve("[]"),
    }));
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // Supabase is unconfigured in demo mode, so a write would POST at the app's
  // own origin. Nothing may reach the network.
  it("issues no network call at all while merely displaying the page", async () => {
    mount({ isDemo: true });
    await waitFor(() => expect(fetchSpy).not.toHaveBeenCalled());
  });

  it("refuses every mutation with a controlled result and zero network calls", async () => {
    const get = mount({ isDemo: true });
    const inventory = get();
    const expected = "Tools & Equipment changes are unavailable in demo mode.";

    const attempts = await Promise.all([
      inventory.addItem({ itemName: "Lawn Mower", category: "grounds_equipment", trackingMethod: "asset", unitOfMeasure: "unit" }),
      inventory.registerAsset({ itemId: "i1", assetCode: "BD-LM-001" }),
      inventory.assetAction("issue", "a1", 1, { siteId: "s1" }),
      inventory.assetAction("retire", "a1", 1, { reason: "written off" }),
      inventory.recordStock("receipt", { itemId: "i1", quantity: 5 }),
      inventory.recordStock("adjustment", { itemId: "i1", quantity: 5, movementType: "adjustment_in", reason: "stocktake" }),
      inventory.deactivateItem("i1", 1, "no longer carried"),
      inventory.reactivateItem("i1", 1, "needed again"),
    ]);

    for (const result of attempts) {
      expect(result.ok).toBe(false);
      expect(result.error).toBe(expected);
    }
    // The whole point: not one request left the app.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // A demo refusal must not be mistaken for a save, and must not invent a row.
  it("creates no fake demo inventory", async () => {
    const get = mount({ isDemo: true });
    await get().addItem({ itemName: "Lawn Mower", category: "grounds_equipment", trackingMethod: "asset", unitOfMeasure: "unit" });
    const inventory = get();
    expect(inventory.items).toEqual([]);
    expect(inventory.assets).toEqual([]);
    expect(inventory.positions).toEqual([]);
    expect(inventory.canMutate).toBe(false);
  });

  it("reports ready rather than loading, because there is nothing to load", () => {
    const get = mount({ isDemo: true });
    expect(get().status).toBe("ready");
    expect(get().enabled).toBe(false);
  });
});

describe("InventoryProvider outside demo mode", () => {
  let fetchSpy;

  beforeEach(() => {
    fetchSpy = vi.fn(() => Promise.resolve({ ok: true, text: () => Promise.resolve("[]") }));
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads for an authorised role", async () => {
    mount({ isDemo: false, role: "owner" });
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
  });

  // Staff and viewer hold no Inventory capability, so there is no reason to ask.
  it.each([["staff"], ["viewer"]])("issues no read for %s", async (role) => {
    const get = mount({ isDemo: false, role });
    await waitFor(() => expect(get().status).toBe("ready"));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(get().enabled).toBe(false);
  });

  it("still allows mutations to reach the client for an authorised role", async () => {
    const get = mount({ isDemo: false, role: "owner" });
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    fetchSpy.mockClear();
    await get().registerAsset({ itemId: "i1", assetCode: "BD-LM-001" });
    expect(fetchSpy).toHaveBeenCalled();
  });
});
