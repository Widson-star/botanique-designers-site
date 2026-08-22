// Role capabilities for Operations > Tools & Equipment. These mirror the live
// Inventory V1 database authority and never widen it: Principal and Operations
// Manager operate the Inventory portfolio; Project Team and Read-only do not
// enter Inventory V1 at all. Exceptional actions — catalogue identity
// correction and deactivation, equipment correction and retirement, and
// stock-taking adjustment — stay Principal-only.
//
// Hiding a control is presentation. Supabase RLS and the SECURITY DEFINER RPCs
// remain the real boundary, and each one re-checks the caller's role.
import { ROLES } from "../constants/roles";

export function canSeeInventory(role) {
  return role === ROLES.OWNER || role === ROLES.MANAGER;
}

// Every ordinary operation: create catalogue items, register equipment,
// receive, issue, transfer, return, consume, update condition, report damage
// and loss, send for and return from repair.
export function canManageInventory(role) {
  return canSeeInventory(role);
}

// FOUNDER DECISION, Authority 17: "Principal and Operations Manager have full
// control of the Tools & Equipment domain." Retirement, catalogue correction /
// deactivation and stocktake adjustment are no longer Principal-only here.
//
// The old name is kept so every call site keeps working and the change is one
// definition rather than a scatter of edits; what it MEANS is now "may use the
// exceptional Tools & Equipment actions". Scoped to this domain only — Finance,
// Approvals, Projects, People, Maintenance and Daily Site Record are untouched
// and must not read anything into this.
export function canUsePrincipalInventoryActions(role) {
  return canManageInventory(role);
}

// ---------------------------------------------------------------------------
// Controlled vocabularies. These are the database CHECK values exactly — not a
// display invention. "Poor", "Excellent" and "Needs attention" are deliberately
// absent: the schema does not know them.
// ---------------------------------------------------------------------------

// The four approved summary cards: label, supporting line and pictogram. The
// supporting line explains what the number counts, which is what stops
// "Assets in circulation" being read as "assets we own".
export const INVENTORY_SUMMARY_CARDS = [
  { id: "catalogueItems", label: "Catalogue items", support: "Active items in catalogue", glyph: "catalogue" },
  { id: "assetsInCirculation", label: "Assets in circulation", support: "Issued to sites or people", glyph: "circulation" },
  { id: "underRepair", label: "Under repair", support: "Awaiting repair completion", glyph: "repair" },
  { id: "activeStockPositions", label: "Active stock positions", support: "Sites and custody locations", glyph: "positions" },
];

export const TRACKING_METHODS = ["asset", "stock"];

// OPERATOR LANGUAGE, Authority 17. A tool is a tool: "physical asset" and
// "individual equipment asset" are gone from anything a person reads. The
// database keeps `asset` and `stock` as storage values — renaming those would
// be a destructive schema change bought purely for presentation.
export const TRACKING_METHOD_LABELS = {
  asset: "Track each tool",
  stock: "Track quantity only",
};

// The choice has to be explained BEFORE it is made: it is effectively
// irreversible once an item has history, and the two options answer different
// questions about the same shed.
export const TRACKING_METHOD_EXPLAINERS = {
  asset: "Each reusable tool gets its own permanent BD-TE ID and can be assigned, returned, transferred, repaired and condition-checked.",
  stock: "Record how many units are at each location. Individual BD-TE IDs are not created.",
};

export const EQUIPMENT_STATUSES = ["available", "issued", "under_repair", "lost", "retired"];

export const EQUIPMENT_STATUS_LABELS = {
  available: "Available",
  issued: "Issued",
  under_repair: "Under repair",
  lost: "Lost",
  retired: "Retired",
};

// No amber anywhere. Green for available, restrained blue for equipment out in
// service, and muted rose for the states that need attention — repair, loss and
// damage. Retired is neutral stone because it is settled, not a problem.
//
// under_repair is deliberately NOT blue: blue reads as "out working", and a
// machine in the workshop is not working. The settled correction to the old
// amber treatment is rose or stone, never a new semantic colour.
export const EQUIPMENT_STATUS_CLASSES = {
  available: "bg-[#eef3f0] text-botanique-green",
  issued: "bg-sky-50 text-sky-800",
  under_repair: "bg-rose-50 text-rose-700",
  lost: "bg-rose-50 text-rose-700",
  retired: "bg-stone-100 text-gray-600",
};

export const EQUIPMENT_CONDITIONS = ["good", "fair", "damaged", "unserviceable"];

export const EQUIPMENT_CONDITION_LABELS = {
  good: "Good",
  fair: "Fair",
  damaged: "Damaged",
  unserviceable: "Unserviceable",
};

export const EQUIPMENT_CONDITION_CLASSES = {
  good: "bg-[#eef3f0] text-botanique-green",
  fair: "bg-stone-100 text-gray-700",
  damaged: "bg-rose-50 text-rose-700",
  unserviceable: "bg-rose-50 text-rose-700",
};

export const OWNERSHIP_TYPES = ["owned", "hired", "borrowed"];

export const OWNERSHIP_TYPE_LABELS = {
  owned: "Owned",
  hired: "Hired",
  borrowed: "Borrowed",
};

// Movement vocabulary, with the exact position semantics the database enforces.
// issued = Botanique custody -> Site; transferred = Site -> different Site;
// returned = Site -> Botanique custody.
export const STOCK_MOVEMENT_LABELS = {
  received: "Received",
  issued: "Issued to Site",
  transferred: "Transferred Site to Site",
  returned: "Returned to Botanique",
  consumed: "Consumed",
  damaged: "Damaged",
  lost: "Lost",
  adjustment_in: "Stocktake adjustment in",
  adjustment_out: "Stocktake adjustment out",
};

export const EQUIPMENT_EVENT_LABELS = {
  registered: "Registered",
  issued: "Issued",
  transferred: "Transferred",
  returned: "Returned",
  condition_changed: "Condition updated",
  sent_for_repair: "Sent for repair",
  returned_from_repair: "Returned from repair",
  lost: "Reported lost",
  retired: "Retired",
  corrected: "Corrected",
};

export const CATALOGUE_EVENT_LABELS = {
  created: "Catalogue item added",
  updated: "Catalogue item updated",
  corrected: "Catalogue item corrected",
  deactivated: "Catalogue item deactivated",
  reactivated: "Catalogue item reactivated",
};

export function statusLabel(status) {
  return EQUIPMENT_STATUS_LABELS[status] || status;
}

export function conditionLabel(condition) {
  return EQUIPMENT_CONDITION_LABELS[condition] || condition;
}

export function ownershipLabel(ownership) {
  return OWNERSHIP_TYPE_LABELS[ownership] || ownership;
}

export function trackingMethodLabel(method) {
  return TRACKING_METHOD_LABELS[method] || method;
}

export function movementLabel(movementType) {
  return STOCK_MOVEMENT_LABELS[movementType] || movementType;
}

// Categories and units are free text stored as canonical normalised tokens
// ("manual_tools", "cubic_metre"). That storage form must never reach the
// screen: "manual_tools" is a database detail, and showing it makes the
// taxonomy look like a fixed enum the operator has to match exactly.
//
// Deliberately NOT a lookup table. The taxonomy is extensible and a custom
// category must not require a migration, so this derives the display form from
// whatever token exists rather than recognising a closed list — an operator who
// types "Site consumables" gets it back as "Site consumables", with no code
// change and no new deployment.
//
// Sentence case, not title case: the authority reads "Power tools", not "Power
// Tools", so only the first word is lifted and the rest keeps its own casing —
// which also preserves a genuine proper noun in a custom category.
export function displayToken(token) {
  const words = String(token || "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!words) return "";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function categoryLabel(category) {
  return displayToken(category);
}

export function unitLabel(unit) {
  return displayToken(unit);
}

// A NULL Site is Botanique custody. It is never a fabricated store, warehouse
// or depot, so it is named rather than blanked.
export const BOTANIQUE_CUSTODY = "Botanique custody";

export function positionLabel(siteName) {
  return siteName || BOTANIQUE_CUSTODY;
}

// Which lifecycle actions the interface offers for a status. The database
// refuses anything else regardless; this only decides what is shown, so an
// operator is never invited into a call that will be rejected.
// Retirement appears only where the database actually permits it: available,
// under_repair and lost. It is not offered on issued (the RPC refuses it) or on
// retired (terminal).
export function equipmentActionsFor(status, role) {
  const principal = canUsePrincipalInventoryActions(role);
  if (!canManageInventory(role)) return [];
  switch (status) {
    case "available":
      return [
        { id: "issue", label: "Assign / hand over" },
        { id: "condition", label: "Update condition" },
        { id: "repair", label: "Send for repair" },
        { id: "lost", label: "Report lost" },
        ...(principal ? [{ id: "retire", label: "Retire", principal: true }] : []),
      ];
    case "issued":
      // Retire is deliberately ABSENT here, for the Principal too. The live
      // retire_equipment_asset RPC refuses an issued asset — "Return this
      // equipment before retiring it" — so offering it would invite a call the
      // database will reject. Equipment comes back first, then it is retired.
      return [
        { id: "transfer", label: "Transfer / hand over" },
        { id: "return", label: "Return to Botanique" },
        { id: "condition", label: "Update condition" },
        { id: "repair", label: "Send for repair" },
        { id: "lost", label: "Report lost" },
      ];
    case "under_repair":
      return [
        { id: "return_repair", label: "Return from repair" },
        { id: "condition", label: "Update condition" },
        { id: "lost", label: "Report lost" },
        ...(principal ? [{ id: "retire", label: "Retire", principal: true }] : []),
      ];
    case "lost":
      // No ordinary movement. A lost asset is an unresolved exception: it is
      // either found (Principal correction) or formally written off.
      return principal ? [{ id: "retire", label: "Retire", principal: true }] : [];
    default:
      return []; // retired is terminal and read-only.
  }
}
