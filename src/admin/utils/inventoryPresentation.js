// Pure presentation logic for Operations > Tools & Equipment.
//
// These live outside AdminInventory.jsx so that file exports only its
// component: a route module that also exports helpers defeats Fast Refresh,
// and these are worth testing directly anyway.

// Which page numbers a register footer should render, given a current page and
// a total.
//
// Always the first and last page, plus a run of three consecutive pages that
// contains the current one, with a gap marker wherever the sequence breaks.
// The run is what produces the authority's "1 2 3 … 5" on the first page: a
// window of merely the current page and its neighbours would show "1 2 … 5"
// there, which is not what the approved screen does.
//
// The run slides and clamps, so the last page shows "1 … 3 4 5" rather than
// running off the end. Returned as an explicit list so the footer renders
// truth rather than a fixed shape — four pages give 1 2 3 4 with no ellipsis
// at all, and two pages give two.
export function paginationSlots(page, pages) {
  if (pages <= 1) return [];
  const runStart = Math.max(0, Math.min(page - 1, pages - 3));
  const wanted = new Set([0, pages - 1, runStart, runStart + 1, runStart + 2, page]);
  const numbers = [...wanted].filter((n) => n >= 0 && n < pages).sort((a, b) => a - b);
  const slots = [];
  numbers.forEach((n, index) => {
    if (index > 0 && n - numbers[index - 1] > 1) slots.push({ gap: true, key: `gap-${n}` });
    slots.push({ page: n, key: `p-${n}` });
  });
  return slots;
}

// The authority keys an activity pictogram on WHAT HAPPENED, not on which
// table it happened in: an out-arrow for "issued", a cube for "transferred", a
// spanner for "sent for repair", a down-arrow for "consumed". Event types the
// authority does not literally show reuse the nearest of those four forms
// rather than introducing a fifth drawing.
const GLYPH_FOR_EVENT = {
  issued: "out", transferred: "cube", returned: "in", received: "in",
  consumed: "in", damaged: "repair", lost: "out",
  adjustment_in: "in", adjustment_out: "out",
  registered: "cube", sent_for_repair: "repair", returned_from_repair: "in",
  condition_changed: "repair", retired: "out", corrected: "repair",
  created: "cube", updated: "cube", deactivated: "out", reactivated: "in",
};

const GLYPH_FOR_KIND = { equipment: "repair", catalogue: "cube", stock: "cube" };

export function activityGlyphFor(entry) {
  const event = entry.eventType || entry.movementType;
  return GLYPH_FOR_EVENT[event] || GLYPH_FOR_KIND[entry.kind] || "cube";
}

// What a CATALOGUE row should say about the physical assets registered against
// it.
//
// The catalogue is the TYPE ("Secateurs"); the Equipment assets register holds
// the individual physical items (BD-TE-001, BD-TE-008, BD-TE-014). A catalogue
// row that only ever offers "Register asset" hides the difference — it reads as
// though nothing has been registered even when three tools exist.
//
// REGISTERED is not ISSUED. A registered asset keeps its identity whether it is
// available, issued, under repair, lost or retired, so the count of registered
// assets is the total and the statuses are a breakdown of it, never a
// replacement for it.
const ASSET_STATUS_SUMMARY_ORDER = [
  ["availableCount", "available"],
  ["issuedCount", "issued"],
  ["underRepairCount", "under repair"],
  ["lostCount", "lost"],
  ["retiredCount", "retired"],
];

export function assetCountsForItem(assets) {
  const rows = assets || [];
  const countOf = (status) => rows.filter((asset) => asset.status === status).length;
  return {
    registeredCount: rows.length,
    availableCount: countOf("available"),
    issuedCount: countOf("issued"),
    underRepairCount: countOf("under_repair"),
    lostCount: countOf("lost"),
    retiredCount: countOf("retired"),
  };
}

// "0 registered" · "1 registered · 1 issued" · "4 registered · 2 available · 2 issued".
//
// Zero-valued fragments are dropped: a row saying "1 registered · 0 available ·
// 1 issued · 0 under repair · 0 lost · 0 retired" is noise, and the reader has
// to subtract to find the fact. The registered total is always kept, including
// when it is zero, because "0 registered" is the answer to the question the row
// is being asked.
export function assetSummaryLine(counts) {
  const parts = [`${counts.registeredCount} registered`];
  if (counts.registeredCount > 0) {
    for (const [key, label] of ASSET_STATUS_SUMMARY_ORDER) {
      if (counts[key] > 0) parts.push(`${counts[key]} ${label}`);
    }
  }
  return parts.join(" · ");
}

// The action always means "register another PHYSICAL INSTANCE of this type",
// so the wording has to say which one it is.
export function registerActionLabel(registeredCount) {
  return registeredCount > 0 ? "Add another asset" : "Register first asset";
}
