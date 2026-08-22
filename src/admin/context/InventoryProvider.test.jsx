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

describe("InventoryProvider Site eligibility", () => {
  let fetchSpy;
  const register = [
    { id: "s-live", site_name: "Live Ongoing Property", location: "Karen", county: "Nairobi", is_selectable: true },
    { id: "s-history", site_name: "Closed Historical Property", location: "", county: "", is_selectable: false },
  ];

  beforeEach(() => {
    fetchSpy = vi.fn((url) => Promise.resolve({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(String(url).includes("inventory_site_register") ? register : [])),
    }));
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  // Eligibility must come from Inventory's own authority, not from another
  // domain's manager-scoped table ACL.
  it("reads Sites through the Inventory Site register RPC", async () => {
    mount({ isDemo: false, role: "manager" });
    await waitFor(() => {
      const called = fetchSpy.mock.calls.map(([url]) => String(url));
      expect(called.some((url) => url.includes("/rpc/inventory_site_register"))).toBe(true);
    });
  });

  it("never derives eligibility from the ordinary projects or maintenance endpoints", async () => {
    mount({ isDemo: false, role: "manager" });
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const called = fetchSpy.mock.calls.map(([url]) => String(url));
    expect(called.some((url) => /\/rest\/v1\/projects/.test(url))).toBe(false);
    expect(called.some((url) => /\/rest\/v1\/maintenance_relationships/.test(url))).toBe(false);
    expect(called.some((url) => /\/rest\/v1\/sites/.test(url))).toBe(false);
  });

  it("offers only the selectable Sites for a new destination", async () => {
    const get = mount({ isDemo: false, role: "manager" });
    await waitFor(() => expect(get().selectableSites.length).toBe(1));
    expect(get().selectableSites.map((site) => site.id)).toEqual(["s-live"]);
  });

  // A non-selectable Site must still resolve, or an old record loses its name.
  it("keeps every Site for historical name resolution", async () => {
    const get = mount({ isDemo: false, role: "manager" });
    await waitFor(() => expect(get().sites.length).toBe(2));
    expect(get().siteName("s-history")).toBe("Closed Historical Property");
    expect(get().siteName("s-live")).toBe("Live Ongoing Property");
    expect(get().selectableSites.map((site) => site.id)).not.toContain("s-history");
  });

  it("re-reads the register after a write, so eligibility follows the truth", async () => {
    const get = mount({ isDemo: false, role: "manager" });
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    fetchSpy.mockClear();
    await get().registerAsset({ itemId: "i1", assetCode: "BD-EQP-001" });
    const called = fetchSpy.mock.calls.map(([url]) => String(url));
    expect(called.some((url) => url.includes("/rpc/inventory_site_register"))).toBe(true);
  });

  it("touches no Finance endpoint", async () => {
    mount({ isDemo: false, role: "owner" });
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const called = fetchSpy.mock.calls.map(([url]) => String(url));
    for (const finance of ["internal_cost_claims", "fund_requests", "staff_compensations", "fund_releases"]) {
      expect(called.some((url) => url.includes(finance))).toBe(false);
    }
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

describe("automatic asset codes", () => {
  let fetchSpy;
  const bodies = [];

  beforeEach(() => {
    bodies.length = 0;
    fetchSpy = vi.fn((url, options) => {
      if (options?.body) bodies.push({ url: String(url), body: JSON.parse(options.body) });
      return Promise.resolve({ ok: true, text: () => Promise.resolve("[]") });
    });
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  // The operator must never choose a Botanique asset code, so the client must
  // not demand one before it will call.
  it("registers without an asset code", async () => {
    const get = mount({ isDemo: false, role: "owner" });
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const result = await get().registerAsset({ itemId: "i1" });
    expect(result.ok).toBe(true);
    expect(bodies.some(({ url }) => url.includes("/rpc/register_equipment_asset"))).toBe(true);
  });

  // A browser must have no say in a Botanique asset's identity. Even when a
  // caller passes one, it must not travel — the server ignores it too, but the
  // client should not be the thing relying on that.
  it("never sends an asset code, even when one is supplied", async () => {
    const get = mount({ isDemo: false, role: "owner" });
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    await get().registerAsset({ itemId: "i1", assetCode: "BD-EQP-001" });
    const call = bodies.find(({ url }) => url.includes("/rpc/register_equipment_asset"));
    expect(call).toBeTruthy();
    expect(call.body).not.toHaveProperty("target_asset_code");
    expect(JSON.stringify(call.body)).not.toMatch(/BD-EQP-001/);
  });

  it("still refuses a registration with no catalogue item", async () => {
    const get = mount({ isDemo: false, role: "owner" });
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const result = await get().registerAsset({ itemId: "" });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Choose the tool to register.");
  });
});

describe("atomic multi-asset handover", () => {
  let fetchSpy;
  const calls = [];

  beforeEach(() => {
    calls.length = 0;
    fetchSpy = vi.fn((url, options) => {
      if (options?.body) calls.push({ url: String(url), body: JSON.parse(options.body) });
      return Promise.resolve({ ok: true, text: () => Promise.resolve("[]") });
    });
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  const ready = async () => {
    const get = mount({ isDemo: false, role: "owner" });
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    calls.length = 0;
    return get;
  };

  // ONE call, not N. Several browser calls could half-succeed.
  it("hands several assets over in a single request", async () => {
    const get = await ready();
    const result = await get().issueAssets(
      [{ assetId: "a1", version: 2 }, { assetId: "a2", version: 5 }],
      { siteId: "s1", custodianPersonId: "p1" },
    );
    expect(result.ok).toBe(true);
    const issues = calls.filter(({ url }) => url.includes("/rpc/issue_equipment_assets"));
    expect(issues).toHaveLength(1);
    expect(issues[0].body.target_assets).toEqual([
      { asset_id: "a1", expected_version: 2 },
      { asset_id: "a2", expected_version: 5 },
    ]);
    expect(issues[0].body.target_site_id).toBe("s1");
    // The legacy single-asset RPC is not used as well.
    expect(calls.some(({ url }) => url.includes("/rpc/issue_equipment_asset?"))).toBe(false);
  });

  // A single handover is an array of one, not a second code path.
  it("routes a single-asset issue through the same canonical RPC", async () => {
    const get = await ready();
    await get().assetAction("issue", "a1", 3, { siteId: "s1" });
    const issues = calls.filter(({ url }) => url.includes("/rpc/issue_equipment_assets"));
    expect(issues).toHaveLength(1);
    expect(issues[0].body.target_assets).toEqual([{ asset_id: "a1", expected_version: 3 }]);
  });

  it("refuses an empty handover without calling the database", async () => {
    const get = await ready();
    const result = await get().issueAssets([], { siteId: "s1" });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Choose at least one asset to hand over.");
    expect(calls).toHaveLength(0);
  });

  it("requires a destination Site", async () => {
    const get = await ready();
    const result = await get().issueAssets([{ assetId: "a1", version: 1 }], {});
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Choose the Site this equipment is going to.");
    expect(calls).toHaveLength(0);
  });
});

describe("expected return date", () => {
  let fetchSpy;
  const calls = [];

  beforeEach(() => {
    calls.length = 0;
    fetchSpy = vi.fn((url, options) => {
      if (options?.body) calls.push({ url: String(url), body: JSON.parse(options.body) });
      return Promise.resolve({ ok: true, text: () => Promise.resolve("[]") });
    });
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  const dayOffset = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString("en-CA");
  };

  const ready = async () => {
    const get = mount({ isDemo: false, role: "owner" });
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    calls.length = 0;
    return get;
  };

  it.each([[0, "today"], [1, "tomorrow"], [30, "next month"]])(
    "accepts %s days away (%s)",
    async (days) => {
      const get = await ready();
      const result = await get().issueAssets(
        [{ assetId: "a1", version: 1 }],
        { siteId: "s1", expectedReturnDate: dayOffset(days) },
      );
      expect(result.ok).toBe(true);
    },
  );

  // Production shows why: Secateurs issued 21 Aug with an expected return of
  // 20 Aug — due back before they left.
  it("refuses a past date, before any request is made", async () => {
    const get = await ready();
    const result = await get().issueAssets(
      [{ assetId: "a1", version: 1 }],
      { siteId: "s1", expectedReturnDate: dayOffset(-1) },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toBe("An expected return date cannot be in the past.");
    expect(calls).toHaveLength(0);
  });

  it("applies the same rule to a transfer", async () => {
    const get = await ready();
    const result = await get().assetAction("transfer", "a1", 1, {
      siteId: "s1", expectedReturnDate: dayOffset(-3),
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("An expected return date cannot be in the past.");
    expect(calls).toHaveLength(0);
  });

  it("leaves an empty expected return alone", async () => {
    const get = await ready();
    const result = await get().issueAssets([{ assetId: "a1", version: 1 }], { siteId: "s1" });
    expect(result.ok).toBe(true);
  });
});
