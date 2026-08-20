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

// The three exceptional powers the database reserves for the Principal.
export function canUsePrincipalInventoryActions(role) {
  return role === ROLES.OWNER;
}

// ---------------------------------------------------------------------------
// Controlled vocabularies. These are the database CHECK values exactly — not a
// display invention. "Poor", "Excellent" and "Needs attention" are deliberately
// absent: the schema does not know them.
// ---------------------------------------------------------------------------

export const TRACKING_METHODS = ["asset", "stock"];

export const TRACKING_METHOD_LABELS = {
  asset: "Individual equipment asset",
  stock: "Quantity stock",
};

export const EQUIPMENT_STATUSES = ["available", "issued", "under_repair", "lost", "retired"];

export const EQUIPMENT_STATUS_LABELS = {
  available: "Available",
  issued: "Issued",
  under_repair: "Under repair",
  lost: "Lost",
  retired: "Retired",
};

// No amber anywhere. Green for available, stone for neutral/terminal, blue for
// in-progress repair, restrained rose for the two exception states.
export const EQUIPMENT_STATUS_CLASSES = {
  available: "bg-[#eef3f0] text-botanique-green",
  issued: "bg-sky-50 text-sky-800",
  under_repair: "bg-sky-50 text-sky-800",
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

// A NULL Site is Botanique custody. It is never a fabricated store, warehouse
// or depot, so it is named rather than blanked.
export const BOTANIQUE_CUSTODY = "Botanique custody";

export function positionLabel(siteName) {
  return siteName || BOTANIQUE_CUSTODY;
}

// Which lifecycle actions the interface offers for a status. The database
// refuses anything else regardless; this only decides what is shown, so an
// operator is never invited into a call that will be rejected.
export function equipmentActionsFor(status, role) {
  const principal = canUsePrincipalInventoryActions(role);
  if (!canManageInventory(role)) return [];
  switch (status) {
    case "available":
      return [
        { id: "issue", label: "Issue to Site" },
        { id: "condition", label: "Update condition" },
        { id: "repair", label: "Send for repair" },
        { id: "lost", label: "Report lost" },
        ...(principal ? [{ id: "retire", label: "Retire", principal: true }] : []),
      ];
    case "issued":
      return [
        { id: "transfer", label: "Transfer / hand over" },
        { id: "return", label: "Return to Botanique" },
        { id: "condition", label: "Update condition" },
        { id: "repair", label: "Send for repair" },
        { id: "lost", label: "Report lost" },
        ...(principal ? [{ id: "retire", label: "Retire", principal: true }] : []),
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
