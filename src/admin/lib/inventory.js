// Operations > Tools & Equipment V1 — database access.
//
// Stock quantities are NEVER requested as stored columns, because there are no
// stored quantity columns: inventory_stock_position() derives every position,
// every time, from public.inventory_stock_movements. Nothing here writes a
// balance, and nothing here reads a Finance table.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "") || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

function headers(accessToken) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}

async function read(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(data?.message || data?.hint || "Inventory request failed.");
    error.code = data?.code || "";
    throw error;
  }
  return data;
}

function rpc(accessToken, name, body) {
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST", headers: headers(accessToken), body: JSON.stringify(body || {}),
  });
}

const ITEM_COLUMNS = [
  "id", "item_name", "category", "tracking_method", "unit_of_measure", "is_active",
  "notes", "version", "created_at", "updated_at",
].join(",");

const ASSET_COLUMNS = [
  "id", "inventory_item_id", "asset_code", "ownership_type", "status", "condition",
  "current_site_id", "current_custodian_person_id", "expected_return_date", "acquired_on",
  "notes", "version", "created_at", "updated_at",
].join(",");

const ASSET_EVENT_COLUMNS = [
  "id", "equipment_asset_id", "event_type", "reason", "note",
  "project_id", "maintenance_visit_id", "occurred_at", "resulting_version",
].join(",");

const ITEM_EVENT_COLUMNS = [
  "id", "inventory_item_id", "event_type", "reason", "occurred_at", "resulting_version",
].join(",");

const MOVEMENT_COLUMNS = [
  "id", "inventory_item_id", "movement_type", "quantity", "from_site_id", "to_site_id",
  "person_id", "project_id", "maintenance_visit_id", "reason", "note", "occurred_at",
].join(",");

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function fetchInventoryItems(accessToken) {
  const params = new URLSearchParams({ select: ITEM_COLUMNS, order: "item_name.asc" });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/inventory_items?${params}`, { headers: headers(accessToken) }));
}

export async function fetchEquipmentAssets(accessToken) {
  const params = new URLSearchParams({ select: ASSET_COLUMNS, order: "asset_code.asc" });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/equipment_assets?${params}`, { headers: headers(accessToken) }));
}

export async function fetchEquipmentAssetEvents(accessToken) {
  const params = new URLSearchParams({ select: ASSET_EVENT_COLUMNS, order: "occurred_at.desc,resulting_version.desc", limit: "200" });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/equipment_asset_events?${params}`, { headers: headers(accessToken) }));
}

export async function fetchInventoryItemEvents(accessToken) {
  const params = new URLSearchParams({ select: ITEM_EVENT_COLUMNS, order: "occurred_at.desc,resulting_version.desc", limit: "200" });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/inventory_item_events?${params}`, { headers: headers(accessToken) }));
}

export async function fetchStockMovements(accessToken) {
  const params = new URLSearchParams({ select: MOVEMENT_COLUMNS, order: "occurred_at.desc,id.asc", limit: "200" });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/inventory_stock_movements?${params}`, { headers: headers(accessToken) }));
}

// The ONLY source of quantity truth. Passing null asks for every position.
export async function fetchStockPositions(accessToken) {
  return read(await rpc(accessToken, "inventory_stock_position", { target_item_id: null }));
}

// The Inventory-authorised Site read model. Deliberately an RPC and NOT a
// direct /sites + /projects read: the projects SELECT policy is manager-scoped
// (a manager sees only Projects they lead or are assigned to), while Inventory
// grants the Operations Manager full portfolio authority. Deriving eligibility
// client-side from that read hid valid operational Sites from the very person
// who runs the portfolio.
//
// Returns EVERY Site — so historical names still resolve — each carrying
// is_selectable for new Inventory destinations.
export async function fetchInventorySites(accessToken) {
  return read(await rpc(accessToken, "inventory_site_register", {}));
}

export async function fetchInventoryPeople(accessToken) {
  const params = new URLSearchParams({ select: "id,full_name,is_active", order: "full_name.asc" });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/people?${params}`, { headers: headers(accessToken) }));
}

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

export async function createInventoryItem(accessToken, values) {
  return read(await fetch(`${SUPABASE_URL}/rest/v1/inventory_items`, {
    method: "POST",
    headers: { ...headers(accessToken), Prefer: "return=representation" },
    body: JSON.stringify({
      item_name: values.itemName,
      category: values.category,
      tracking_method: values.trackingMethod,
      unit_of_measure: values.trackingMethod === "asset" ? "unit" : values.unitOfMeasure,
      notes: values.notes || null,
      // The audit trigger overwrites these from auth.uid(); PostgREST needs the
      // NOT NULL columns present on the insert.
      created_by: values.actorId,
      updated_by: values.actorId,
    }),
  }));
}

export async function deactivateInventoryItem(accessToken, itemId, expectedVersion, reason) {
  return read(await rpc(accessToken, "deactivate_inventory_item", {
    target_item_id: itemId, expected_version: expectedVersion, reason,
  }));
}

export async function reactivateInventoryItem(accessToken, itemId, expectedVersion, reason) {
  return read(await rpc(accessToken, "reactivate_inventory_item", {
    target_item_id: itemId, expected_version: expectedVersion, reason,
  }));
}

// ---------------------------------------------------------------------------
// Equipment lifecycle — every one of these is a live production RPC that
// re-checks the caller's role in its own body.
// ---------------------------------------------------------------------------

// The asset code is deliberately NOT sent. register_equipment_asset() allocates
// it from a sequence and returns it on the created row, so the browser has no
// say in a Botanique asset's identity — and the argument it still accepts for
// compatibility is inert server-side anyway.
export async function registerEquipmentAsset(accessToken, values) {
  return read(await rpc(accessToken, "register_equipment_asset", {
    target_item_id: values.itemId,
    target_ownership_type: values.ownershipType || "owned",
    target_condition: values.condition || "good",
    target_site_id: values.siteId || null,
    target_acquired_on: values.acquiredOn || null,
    target_notes: values.notes || null,
  }));
}

// ONE issue behaviour. A handover of a single tool is an array of one, so the
// single and multi paths cannot drift apart — and the whole group either lands
// or none of it does, because the database does it in one transaction.
//
// `members` is [{ assetId, version }, ...].
export async function issueEquipmentAssets(accessToken, members, values) {
  return read(await rpc(accessToken, "issue_equipment_assets", {
    target_assets: (members || []).map((member) => ({
      asset_id: member.assetId,
      expected_version: member.version,
    })),
    target_site_id: values.siteId || null,
    target_custodian_person_id: values.custodianPersonId || null,
    target_expected_return_date: values.expectedReturnDate || null,
    target_project_id: values.projectId || null,
    target_maintenance_visit_id: values.maintenanceVisitId || null,
    note: values.note || null,
  }));
}

export async function issueEquipmentAsset(accessToken, assetId, expectedVersion, values) {
  return issueEquipmentAssets(accessToken, [{ assetId, version: expectedVersion }], values);
}

export async function transferEquipmentAsset(accessToken, assetId, expectedVersion, values) {
  return read(await rpc(accessToken, "transfer_equipment_asset", {
    target_asset_id: assetId,
    expected_version: expectedVersion,
    target_site_id: values.siteId || null,
    target_custodian_person_id: values.custodianPersonId || null,
    target_expected_return_date: values.expectedReturnDate || null,
    target_project_id: values.projectId || null,
    target_maintenance_visit_id: values.maintenanceVisitId || null,
    note: values.note || null,
  }));
}

// Return always lands in Botanique custody; the RPC rejects a destination Site.
export async function returnEquipmentAsset(accessToken, assetId, expectedVersion, values) {
  return read(await rpc(accessToken, "return_equipment_asset", {
    target_asset_id: assetId,
    expected_version: expectedVersion,
    target_site_id: null,
    target_condition: values.condition || null,
    target_project_id: values.projectId || null,
    target_maintenance_visit_id: values.maintenanceVisitId || null,
    note: values.note || null,
  }));
}

export async function updateEquipmentAssetCondition(accessToken, assetId, expectedVersion, condition, note) {
  return read(await rpc(accessToken, "update_equipment_asset_condition", {
    target_asset_id: assetId, expected_version: expectedVersion,
    target_condition: condition, note: note || null,
  }));
}

export async function sendEquipmentAssetForRepair(accessToken, assetId, expectedVersion, note) {
  return read(await rpc(accessToken, "send_equipment_asset_for_repair", {
    target_asset_id: assetId, expected_version: expectedVersion, note: note || null,
  }));
}

// Resulting condition is required, and the destination is an explicit Site or
// Botanique custody. No repair workshop Site is ever invented.
export async function returnEquipmentAssetFromRepair(accessToken, assetId, expectedVersion, values) {
  return read(await rpc(accessToken, "return_equipment_asset_from_repair", {
    target_asset_id: assetId,
    expected_version: expectedVersion,
    target_condition: values.condition,
    target_site_id: values.siteId || null,
    note: values.note || null,
  }));
}

export async function reportEquipmentAssetLost(accessToken, assetId, expectedVersion, reason) {
  return read(await rpc(accessToken, "report_equipment_asset_lost", {
    target_asset_id: assetId, expected_version: expectedVersion, reason,
  }));
}

// Principal-only at the database boundary.
export async function retireEquipmentAsset(accessToken, assetId, expectedVersion, reason) {
  return read(await rpc(accessToken, "retire_equipment_asset", {
    target_asset_id: assetId, expected_version: expectedVersion, reason,
  }));
}

// ---------------------------------------------------------------------------
// Stock movements
// ---------------------------------------------------------------------------

export async function recordStockReceipt(accessToken, values) {
  return read(await rpc(accessToken, "record_stock_receipt", {
    target_item_id: values.itemId,
    target_quantity: values.quantity,
    target_to_site_id: values.toSiteId || null,
    target_person_id: values.personId || null,
    target_project_id: values.projectId || null,
    target_maintenance_visit_id: values.maintenanceVisitId || null,
    note: values.note || null,
  }));
}

// issued = Botanique custody -> Site; transferred = Site -> different Site;
// returned = Site -> Botanique custody. The database enforces each shape.
export async function recordStockTransfer(accessToken, values) {
  return read(await rpc(accessToken, "record_stock_transfer", {
    target_item_id: values.itemId,
    target_movement_type: values.movementType,
    target_quantity: values.quantity,
    target_from_site_id: values.fromSiteId || null,
    target_to_site_id: values.toSiteId || null,
    target_person_id: values.personId || null,
    target_project_id: values.projectId || null,
    target_maintenance_visit_id: values.maintenanceVisitId || null,
    note: values.note || null,
  }));
}

export async function recordStockUsage(accessToken, values) {
  return read(await rpc(accessToken, "record_stock_usage", {
    target_item_id: values.itemId,
    target_movement_type: values.movementType,
    target_quantity: values.quantity,
    target_from_site_id: values.fromSiteId || null,
    target_person_id: values.personId || null,
    target_project_id: values.projectId || null,
    target_maintenance_visit_id: values.maintenanceVisitId || null,
    reason: values.reason || null,
    note: values.note || null,
  }));
}

// Principal-only. Supports a real Site position or Botanique custody (null).
export async function recordStockAdjustment(accessToken, values) {
  return read(await rpc(accessToken, "record_stock_adjustment", {
    target_item_id: values.itemId,
    target_movement_type: values.movementType,
    target_quantity: values.quantity,
    target_site_id: values.siteId || null,
    reason: values.reason,
    note: values.note || null,
  }));
}
