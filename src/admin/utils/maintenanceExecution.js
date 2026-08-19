// Which Daily Site Record is the execution truth for a Maintenance visit.
//
// Site + date is NOT a unique key: one Site may legitimately hold several
// Botanique Projects and therefore several field records on one date. Anything
// that keys activity by date alone can silently pick the wrong record, so this
// is the single deterministic answer used by BOTH the workboard and the detail
// page — they must never disagree about a visit.

export const LIVE_ENTRY_STATES = new Set([
  "draft", "submitted", "returned_for_correction", "resubmitted", "accepted",
]);

// Result shapes:
//   { status: "linked",    entry }   an explicit maintenance_visit_id match
//   { status: "legacy",    entry }   exactly one unlinked same-Site/date candidate
//   { status: "ambiguous", candidates } several — the operator must identify it
//   { status: "none",      entry: null }
export function entryForMaintenanceVisit(visit, relationship, entries = []) {
  if (!visit || !relationship) return { status: "none", entry: null };

  // 1. The durable fact always wins.
  const linked = entries.find((entry) => entry.maintenanceVisitId === visit.id);
  if (linked) return { status: "linked", entry: linked };

  // 2. Legacy fallback for records written before the link existed. Only an
  //    UNLINKED candidate qualifies: a record already claimed by another visit
  //    is that visit's execution truth, not this one's.
  const candidates = entries.filter((entry) =>
    !entry.maintenanceVisitId &&
    entry.siteId === relationship.siteId &&
    entry.workDate === visit.scheduledDate &&
    LIVE_ENTRY_STATES.has(entry.state)
  );

  if (candidates.length === 1) return { status: "legacy", entry: candidates[0] };
  if (candidates.length > 1) return { status: "ambiguous", entry: null, candidates };
  return { status: "none", entry: null };
}

// Convenience for callers that only care about a definite record.
export function resolvedEntryForMaintenanceVisit(visit, relationship, entries) {
  const result = entryForMaintenanceVisit(visit, relationship, entries);
  return result.status === "linked" || result.status === "legacy" ? result.entry : null;
}
