// Which Sites may be chosen as a NEW Inventory destination.
//
// The live selector was reading the whole `sites` table, which exposed archived
// test fixtures and an archived duplicate Site alongside real operational
// locations. Those records are genuine production history — they carry approval
// requests and project activities — so they are neither deleted nor filtered by
// name. A name blacklist would rot the moment a fixture were renamed, and would
// quietly hide a legitimate Site that happened to match.
//
// Eligibility is therefore a property of the Site's CURRENT operational state:
//
//   A. it hosts a live Botanique Project (not archived, status Ongoing), or
//   B. it has an active Maintenance relationship, or
//   C. Inventory physical truth already sits there — an equipment asset, or a
//      non-zero stock position.
//
// (C) is what keeps the system honest about what it already holds: a mower left
// at a Site whose Project has since closed must still be returnable and
// transferable, so that Site stays selectable for as long as it holds anything.
//
// Historical Sites are NEVER dropped from the provider's `sites` collection —
// siteName() must keep resolving every Site an old record points at. This
// function only decides what a NEW choice may offer.

export function operationalSiteIds(projects = [], maintenanceRelationships = []) {
  const ids = new Set();
  for (const project of projects) {
    if (!project?.siteId) continue;
    if (project.archived) continue;
    if (project.status !== "Ongoing") continue;
    ids.add(project.siteId);
  }
  for (const relationship of maintenanceRelationships) {
    if (!relationship?.siteId) continue;
    if (relationship.status !== "active") continue;
    ids.add(relationship.siteId);
  }
  return ids;
}

// Sites that currently hold Inventory. A zero position is not returned by
// inventory_stock_position(), so any position present is by definition non-zero.
export function inventoryOccupiedSiteIds(assets = [], positions = []) {
  const ids = new Set();
  for (const asset of assets) {
    if (asset?.currentSiteId) ids.add(asset.currentSiteId);
  }
  for (const position of positions) {
    if (position?.siteId) ids.add(position.siteId);
  }
  return ids;
}

export function selectableSitesFrom({ sites = [], projects = [], maintenanceRelationships = [], assets = [], positions = [] }) {
  const operational = operationalSiteIds(projects, maintenanceRelationships);
  const occupied = inventoryOccupiedSiteIds(assets, positions);
  return sites
    .filter((site) => operational.has(site.id) || occupied.has(site.id))
    .slice()
    .sort((a, b) => String(a.siteName || "").localeCompare(String(b.siteName || "")));
}

// A Site already recorded on the row being edited stays offered even if it
// would not otherwise be selectable, so an existing record can always be read
// back and corrected rather than silently losing its own current position.
export function withCurrentSite(selectable, currentSiteId, allSites = []) {
  if (!currentSiteId || selectable.some((site) => site.id === currentSiteId)) return selectable;
  const current = allSites.find((site) => site.id === currentSiteId);
  return current ? [current, ...selectable] : selectable;
}
