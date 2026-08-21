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
