// BD-REPORTS-01B — the single builder for a module drill-through URL.
//
// A Reports figure covers one project over one period, so the list it opens
// must be narrowed to that same project and that same period. Carrying the
// dates is what makes the summary honest now that the individual records are
// no longer reproduced here: a reader who follows "Missing: 3" must arrive at
// the three days, not at the whole module.
//
// A URL parameter only narrows what the caller can already see. It grants
// nothing: every destination re-reads under the caller's own row level
// security and re-checks its own access exactly as before.
export function moduleLink(path, { projectId, status = "", range = null }) {
  const params = new URLSearchParams();
  if (projectId) params.set("project", projectId);
  if (status) params.set("status", status);
  // Approvals carries no period filter, so a range is passed only where the
  // destination genuinely supports one.
  if (range?.startDate && range?.endDate) {
    params.set("from", range.startDate);
    params.set("to", range.endDate);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
