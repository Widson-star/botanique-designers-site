import { useCallback, useEffect, useMemo, useState } from "react";
import { InventoryContext } from "./inventory";
import { canSeeInventory } from "../utils/inventoryCapabilities";
import {
  createInventoryItem, deactivateInventoryItem, fetchEquipmentAssetEvents, fetchEquipmentAssets,
  fetchInventoryItemEvents, fetchInventoryItems, fetchInventoryPeople, fetchInventorySites,
  fetchStockMovements, fetchStockPositions, reactivateInventoryItem,
  recordStockAdjustment, recordStockReceipt, recordStockTransfer, recordStockUsage,
  issueEquipmentAssets, registerEquipmentAssets, reportEquipmentAssetLost, retireEquipmentAsset,
  returnEquipmentAsset, returnEquipmentAssetFromRepair, sendEquipmentAssetForRepair,
  transferEquipmentAsset, updateEquipmentAssetCondition,
} from "../lib/inventory";

function mapItem(row) {
  return {
    id: row.id, itemName: row.item_name, category: row.category,
    trackingMethod: row.tracking_method, unitOfMeasure: row.unit_of_measure,
    isActive: row.is_active === true, notes: row.notes || "",
    version: row.version, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapAsset(row) {
  return {
    id: row.id, itemId: row.inventory_item_id, assetCode: row.asset_code,
    ownershipType: row.ownership_type, status: row.status, condition: row.condition,
    currentSiteId: row.current_site_id || "", custodianPersonId: row.current_custodian_person_id || "",
    expectedReturnDate: row.expected_return_date || "", acquiredOn: row.acquired_on || "",
    notes: row.notes || "", version: row.version,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

// A zero position is not returned by inventory_stock_position(); "nothing at
// that Site" is the absence of a position, not a position of nothing.
function mapPosition(row) {
  return {
    itemId: row.inventory_item_id, itemName: row.item_name, category: row.category,
    unitOfMeasure: row.unit_of_measure, isActive: row.is_active === true,
    siteId: row.site_id || "", siteName: row.site_name || "", location: row.location || "",
    quantity: Number(row.quantity),
  };
}

function mapAssetEvent(row) {
  return {
    id: row.id, kind: "equipment", assetId: row.equipment_asset_id, eventType: row.event_type,
    reason: row.reason || "", note: row.note || "", projectId: row.project_id || "",
    maintenanceVisitId: row.maintenance_visit_id || "",
    occurredAt: row.occurred_at, resultingVersion: row.resulting_version,
  };
}

function mapItemEvent(row) {
  return {
    id: row.id, kind: "catalogue", itemId: row.inventory_item_id, eventType: row.event_type,
    reason: row.reason || "", occurredAt: row.occurred_at, resultingVersion: row.resulting_version,
  };
}

function mapMovement(row) {
  return {
    id: row.id, kind: "stock", itemId: row.inventory_item_id, movementType: row.movement_type,
    quantity: Number(row.quantity), fromSiteId: row.from_site_id || "", toSiteId: row.to_site_id || "",
    personId: row.person_id || "", projectId: row.project_id || "",
    maintenanceVisitId: row.maintenance_visit_id || "",
    reason: row.reason || "", note: row.note || "", occurredAt: row.occurred_at,
  };
}

export default function InventoryProvider({ children, session, role, isDemo }) {
  const accessToken = session?.access_token || "";
  const [items, setItems] = useState([]);
  const [assets, setAssets] = useState([]);
  const [positions, setPositions] = useState([]);
  const [assetEvents, setAssetEvents] = useState([]);
  const [itemEvents, setItemEvents] = useState([]);
  const [movements, setMovements] = useState([]);
  const [sites, setSites] = useState([]);
  const [people, setPeople] = useState([]);
  const [loadState, setLoadState] = useState("loading");
  const [error, setError] = useState("");

  // Only load when there is a real session AND the role actually holds the
  // capability. A staff or viewer session must not issue Inventory reads at
  // all — RLS would return nothing, but there is no reason to ask.
  const enabled = Boolean(!isDemo && accessToken && role && canSeeInventory(role));

  // Demo mode may DISPLAY the Tools & Equipment composition for visual review,
  // but it has no Supabase behind it: VITE_SUPABASE_URL is empty, so any write
  // would POST at the app's own origin. Every mutation is therefore refused
  // before it can reach the REST client, with a controlled result the form
  // shows like any other. Nothing fake is written to stand in for it.
  const demoBlocked = useCallback(
    () => ({ ok: false, error: "Tools & Equipment changes are unavailable in demo mode." }),
    [],
  );

  // One canonical read, kept free of React state so it can be awaited from
  // both the mount effect and a post-write refresh without either one
  // touching state synchronously.
  const load = useCallback(async () => {
    const [itemRows, assetRows, positionRows, assetEventRows, itemEventRows, movementRows, siteRows, peopleRows] =
      await Promise.all([
        fetchInventoryItems(accessToken), fetchEquipmentAssets(accessToken), fetchStockPositions(accessToken),
        fetchEquipmentAssetEvents(accessToken), fetchInventoryItemEvents(accessToken), fetchStockMovements(accessToken),
        fetchInventorySites(accessToken), fetchInventoryPeople(accessToken),
      ]);
    return {
      items: (itemRows || []).map(mapItem),
      assets: (assetRows || []).map(mapAsset),
      positions: (positionRows || []).map(mapPosition),
      assetEvents: (assetEventRows || []).map(mapAssetEvent),
      itemEvents: (itemEventRows || []).map(mapItemEvent),
      movements: (movementRows || []).map(mapMovement),
      // Every Site, each carrying the server's eligibility verdict. The client
      // never recomputes that verdict — there is one algorithm, and it lives
      // where Inventory authority actually is.
      sites: (siteRows || []).map((row) => ({
        id: row.id, siteName: row.site_name,
        location: row.location || "", county: row.county || "",
        isSelectable: row.is_selectable === true,
      })),
      people: (peopleRows || []).map((row) => ({ id: row.id, fullName: row.full_name, isActive: row.is_active === true })),
    };
  }, [accessToken]);

  const apply = useCallback((next) => {
    setItems(next.items); setAssets(next.assets); setPositions(next.positions);
    setAssetEvents(next.assetEvents); setItemEvents(next.itemEvents); setMovements(next.movements);
    setSites(next.sites); setPeople(next.people);
    setLoadState("ready"); setError("");
  }, []);

  // The mount read owns its own cancellation, so a provider that unmounts (or
  // whose session changes) mid-flight neither writes state afterwards nor lets
  // a slow earlier response overwrite a newer one.
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const next = await load();
        if (!cancelled) apply(next);
      } catch (nextError) {
        if (cancelled) return;
        setLoadState("error");
        setError(nextError.message || "Unable to load Tools & Equipment.");
      }
    })();
    return () => { cancelled = true; };
  }, [enabled, load, apply]);

  const refresh = useCallback(async () => {
    if (!enabled) return { ok: true };
    try {
      apply(await load());
      return { ok: true };
    } catch (nextError) {
      setLoadState("error");
      setError(nextError.message || "Unable to load Tools & Equipment.");
      return { ok: false, error: nextError };
    }
  }, [enabled, load, apply]);

  // A provider that is switched off is not "loading" — it has nothing to load.
  // Deriving this keeps the effect above free of a synchronous setState.
  const status = enabled ? loadState : "ready";

  // Never invent physical truth optimistically: re-read the canonical state
  // after every successful write, so what the register shows is what the
  // database holds.
  const run = useCallback(async (operation, staleMessage) => {
    if (isDemo) return demoBlocked();
    try {
      const result = await operation();
      await refresh();
      return { ok: true, record: result };
    } catch (nextError) {
      return {
        ok: false,
        error: nextError.code === "40001"
          ? (staleMessage || "This was changed elsewhere. Reload and try again.")
          : (nextError.message || "The Inventory action did not complete."),
        stale: nextError.code === "40001",
      };
    }
  }, [refresh, isDemo, demoBlocked]);

  const siteName = useCallback((siteId) => sites.find((site) => site.id === siteId)?.siteName || "", [sites]);
  const personName = useCallback((personId) => people.find((person) => person.id === personId)?.fullName || "", [people]);
  const itemFor = useCallback((itemId) => items.find((item) => item.id === itemId) || null, [items]);

  const addItem = useCallback((values) => {
    if (isDemo) return Promise.resolve(demoBlocked());
    const itemName = (values.itemName || "").trim();
    if (!itemName) return Promise.resolve({ ok: false, error: "An item name is required." });
    if (!(values.category || "").trim()) return Promise.resolve({ ok: false, error: "A category is required." });
    return run(
      () => createInventoryItem(accessToken, { ...values, itemName, actorId: session?.user?.id }),
      "This catalogue item was changed elsewhere. Reload and try again.",
    );
  }, [accessToken, run, session, isDemo, demoBlocked]);

  const deactivateItem = useCallback((itemId, version, reason) =>
    isDemo ? Promise.resolve(demoBlocked()) : run(() => deactivateInventoryItem(accessToken, itemId, version, reason),
      "This catalogue item was changed elsewhere. Reload and try again."), [accessToken, run, isDemo, demoBlocked]);

  const reactivateItem = useCallback((itemId, version, reason) =>
    isDemo ? Promise.resolve(demoBlocked()) : run(() => reactivateInventoryItem(accessToken, itemId, version, reason),
      "This catalogue item was changed elsewhere. Reload and try again."), [accessToken, run, isDemo, demoBlocked]);

  const registerAsset = useCallback((values) => {
    if (isDemo) return Promise.resolve(demoBlocked());
    if (!values.itemId) return Promise.resolve({ ok: false, error: "Choose the tool to register." });
    // No asset-code check: the BD-TE ID is a Botanique identifier the database
    // allocates. There is nothing here for the operator to get wrong.
    const quantity = Number(values.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return Promise.resolve({ ok: false, error: "Register at least one tool." });
    }
    if (quantity > 200) {
      return Promise.resolve({ ok: false, error: "Register at most 200 tools at a time." });
    }
    // A named custodian with no Site would mean "somebody has it, and it is
    // also in Botanique custody". The database refuses it; say so here first.
    if (values.custodianPersonId && !values.siteId) {
      return Promise.resolve({ ok: false, error: "Choose the Site this tool is at when naming a custodian." });
    }
    return run(
      () => registerEquipmentAssets(accessToken, { ...values, quantity }),
      "These tools could not be registered.",
    );
  }, [accessToken, run, isDemo, demoBlocked]);

  const STALE_ASSET = "This equipment was changed elsewhere. Reload and try again.";

  // An expected return date describes a future obligation, so a past one is not
  // a fact anybody can act on. The database refuses it too — this exists to say
  // so in the form rather than after a round trip.
  const returnDateProblem = useCallback((value) => {
    if (!value) return "";
    const today = new Date();
    const todayKey = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");
    return String(value) < todayKey
      ? "An expected return date cannot be in the past."
      : "";
  }, []);

  // Handing several tools to one person is ONE act, so it is one call. The
  // database issues them in a single transaction: either the whole handover
  // lands or none of it does, and there is never a half-completed group.
  const issueAssets = useCallback((members, values) => {
    if (isDemo) return Promise.resolve(demoBlocked());
    if (!members || members.length === 0) {
      return Promise.resolve({ ok: false, error: "Choose at least one asset to hand over." });
    }
    if (!values.siteId) {
      return Promise.resolve({ ok: false, error: "Choose the Site this equipment is going to." });
    }
    const dateProblem = returnDateProblem(values.expectedReturnDate);
    if (dateProblem) return Promise.resolve({ ok: false, error: dateProblem });
    return run(() => issueEquipmentAssets(accessToken, members, values), STALE_ASSET);
  }, [accessToken, run, isDemo, demoBlocked, returnDateProblem]);

  const assetAction = useCallback((kind, assetId, version, values) => {
    if (isDemo) return Promise.resolve(demoBlocked());
    switch (kind) {
      case "issue":
        // Deliberately the same canonical path as a multi-asset handover.
        return issueAssets([{ assetId, version }], values);
      case "transfer": {
        if (!values.siteId) return Promise.resolve({ ok: false, error: "Choose the destination Site." });
        const staleDate = returnDateProblem(values.expectedReturnDate);
        if (staleDate) return Promise.resolve({ ok: false, error: staleDate });
        return run(() => transferEquipmentAsset(accessToken, assetId, version, values), STALE_ASSET);
      }
      case "return":
        return run(() => returnEquipmentAsset(accessToken, assetId, version, values), STALE_ASSET);
      case "condition":
        if (!values.condition) return Promise.resolve({ ok: false, error: "Choose the observed condition." });
        return run(() => updateEquipmentAssetCondition(accessToken, assetId, version, values.condition, values.note), STALE_ASSET);
      case "repair":
        return run(() => sendEquipmentAssetForRepair(accessToken, assetId, version, values.note), STALE_ASSET);
      case "return_repair":
        if (!values.condition) return Promise.resolve({ ok: false, error: "Record the condition it came back in." });
        return run(() => returnEquipmentAssetFromRepair(accessToken, assetId, version, values), STALE_ASSET);
      case "lost":
        if (!(values.reason || "").trim()) return Promise.resolve({ ok: false, error: "A reason is required to report equipment lost." });
        return run(() => reportEquipmentAssetLost(accessToken, assetId, version, values.reason), STALE_ASSET);
      case "retire":
        if (!(values.reason || "").trim()) return Promise.resolve({ ok: false, error: "A reason is required to retire equipment." });
        return run(() => retireEquipmentAsset(accessToken, assetId, version, values.reason), STALE_ASSET);
      default:
        return Promise.resolve({ ok: false, error: "Unknown equipment action." });
    }
  }, [accessToken, run, isDemo, demoBlocked, issueAssets, returnDateProblem]);

  const recordStock = useCallback((kind, values) => {
    if (isDemo) return Promise.resolve(demoBlocked());
    const quantity = Number(values.quantity);
    if (!values.itemId) return Promise.resolve({ ok: false, error: "Choose the stock item." });
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return Promise.resolve({ ok: false, error: "A quantity greater than zero is required." });
    }
    const payload = { ...values, quantity };
    switch (kind) {
      case "receipt":
        return run(() => recordStockReceipt(accessToken, payload), "This stock could not be received.");
      case "transfer":
        return run(() => recordStockTransfer(accessToken, payload), "This stock movement could not be recorded.");
      case "usage":
        if (["damaged", "lost"].includes(payload.movementType) && !(payload.reason || "").trim()) {
          return Promise.resolve({ ok: false, error: "A reason is required to record stock as damaged or lost." });
        }
        return run(() => recordStockUsage(accessToken, payload), "This stock movement could not be recorded.");
      case "adjustment":
        if (!(payload.reason || "").trim()) {
          return Promise.resolve({ ok: false, error: "A reason is required for a stocktake adjustment." });
        }
        return run(() => recordStockAdjustment(accessToken, payload), "This adjustment could not be recorded.");
      default:
        return Promise.resolve({ ok: false, error: "Unknown stock action." });
    }
  }, [accessToken, run, isDemo, demoBlocked]);

  // Sites a NEW Inventory destination may offer. `sites` deliberately stays the
  // FULL set so siteName() keeps resolving every historical reference; only the
  // choice list narrows, and it narrows on the server's verdict rather than on
  // anything reconstructed here.
  //
  // A Site already holding an asset or non-zero stock is selectable by rule (C)
  // of the register, so an existing record can always be returned, transferred
  // or moved out without the client needing to re-add its own current Site.
  const selectableSites = useMemo(
    () => sites.filter((site) => site.isSelectable),
    [sites],
  );

  // Derived summary. Every number comes from canonical state — none is
  // invented to make the screen look populated.
  const summary = useMemo(() => ({
    catalogueItems: items.filter((item) => item.isActive).length,
    assetsInCirculation: assets.filter((asset) => asset.status === "issued").length,
    underRepair: assets.filter((asset) => asset.status === "under_repair").length,
    activeStockPositions: positions.length,
  }), [items, assets, positions]);

  // One combined, newest-first activity stream across the three histories.
  const activity = useMemo(() => [...assetEvents, ...itemEvents, ...movements]
    .slice()
    .sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)))
    .slice(0, 40), [assetEvents, itemEvents, movements]);

  const value = useMemo(() => ({
    items, assets, positions, movements, assetEvents, itemEvents, activity,
    sites, selectableSites, people, summary, status, error, enabled, canMutate: !isDemo, refresh,
    addItem, deactivateItem, reactivateItem, registerAsset, assetAction, issueAssets, recordStock,
    siteName, personName, itemFor,
    assetsForItem: (itemId) => assets.filter((asset) => asset.itemId === itemId),
    eventsForAsset: (assetId) => assetEvents.filter((event) => event.assetId === assetId),
  }), [items, assets, positions, movements, assetEvents, itemEvents, activity, sites, selectableSites, people,
    summary, status, error, enabled, isDemo, refresh, addItem, deactivateItem, reactivateItem,
    registerAsset, assetAction, issueAssets, recordStock, siteName, personName, itemFor]);

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}
