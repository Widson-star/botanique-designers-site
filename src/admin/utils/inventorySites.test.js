import { describe, expect, it } from "vitest";
import { selectableSitesFrom, withCurrentSite } from "./inventorySites";

// Shapes only. No production UUID and no production Site name appears in the
// algorithm — eligibility is decided by operational state, so a fixture that
// were renamed tomorrow would still be excluded, and a real Site that happened
// to be named like one would still be offered.
const sites = [
  { id: "s-live", siteName: "Live Ongoing Property" },
  { id: "s-archived", siteName: "Archived Property" },
  { id: "s-maintained", siteName: "Completed But Maintained" },
  { id: "s-fixture", siteName: "Operations Hub Verification Fixture — PR44" },
  { id: "s-dupe", siteName: "Duplicate Archived Property" },
  { id: "s-holds-asset", siteName: "Closed But Holds Equipment" },
  { id: "s-holds-stock", siteName: "Closed But Holds Stock" },
];

const projects = [
  { id: "p1", siteId: "s-live", status: "Ongoing", archived: false },
  { id: "p2", siteId: "s-archived", status: "Ongoing", archived: true },
  { id: "p3", siteId: "s-maintained", status: "Completed", archived: false },
  // The fixtures are real production records carrying audit history. They are
  // archived, so the rule excludes them without ever naming them.
  { id: "p4", siteId: "s-fixture", status: "Completed", archived: true },
  { id: "p5", siteId: "s-dupe", status: "Ongoing", archived: true },
  { id: "p6", siteId: "s-holds-asset", status: "Completed", archived: false },
  { id: "p7", siteId: "s-holds-stock", status: "Completed", archived: false },
];

const maintenanceRelationships = [
  { id: "m1", siteId: "s-maintained", status: "active" },
  { id: "m2", siteId: "s-archived", status: "ended" },
];

const assets = [{ id: "a1", currentSiteId: "s-holds-asset" }];
const positions = [{ itemId: "i1", siteId: "s-holds-stock", quantity: 12 }];

function selectableIds(overrides = {}) {
  return selectableSitesFrom({ sites, projects, maintenanceRelationships, assets, positions, ...overrides })
    .map((site) => site.id);
}

describe("Inventory Site eligibility", () => {
  it("includes a Site hosting a live, non-archived Ongoing Project", () => {
    expect(selectableIds()).toContain("s-live");
  });

  it("excludes a Site whose only Project is archived", () => {
    expect(selectableIds()).not.toContain("s-archived");
  });

  it("includes a completed Site that still has active Maintenance", () => {
    expect(selectableIds()).toContain("s-maintained");
  });

  // The point of the rule: the fixture is excluded because it is archived, not
  // because anything recognises its name.
  it("excludes an archived fixture Site by rule rather than by name", () => {
    expect(selectableIds()).not.toContain("s-fixture");
    const renamed = sites.map((site) => site.id === "s-fixture" ? { ...site, siteName: "Perfectly Ordinary Garden" } : site);
    expect(selectableIds({ sites: renamed })).not.toContain("s-fixture");
  });

  it("excludes an archived duplicate Site by the same rule", () => {
    expect(selectableIds()).not.toContain("s-dupe");
  });

  // Physical truth wins: what is already there must stay reachable.
  it("includes a closed Site that still holds an equipment asset", () => {
    expect(selectableIds()).toContain("s-holds-asset");
  });

  it("includes a closed Site that still holds a stock position", () => {
    expect(selectableIds()).toContain("s-holds-stock");
  });

  it("drops a Site once its equipment and stock have gone", () => {
    expect(selectableIds({ assets: [], positions: [] })).not.toContain("s-holds-asset");
    expect(selectableIds({ assets: [], positions: [] })).not.toContain("s-holds-stock");
  });

  it("never invents a Site that is not in the Site list", () => {
    const ids = selectableIds();
    for (const id of ids) expect(sites.some((site) => site.id === id)).toBe(true);
  });

  it("sorts the offered Sites by name", () => {
    const names = selectableSitesFrom({ sites, projects, maintenanceRelationships, assets, positions })
      .map((site) => site.siteName);
    expect(names).toEqual([...names].slice().sort((a, b) => a.localeCompare(b)));
  });

  it("offers nothing when no Site is operational and nothing is held", () => {
    expect(selectableSitesFrom({ sites, projects: [], maintenanceRelationships: [], assets: [], positions: [] })).toEqual([]);
  });
});

describe("withCurrentSite", () => {
  // An existing record must always be able to show and correct its own Site,
  // even if that Site would no longer be offered for a new choice.
  it("re-adds the row's current Site when it is no longer selectable", () => {
    const selectable = [sites[0]];
    const result = withCurrentSite(selectable, "s-archived", sites);
    expect(result.map((site) => site.id)).toEqual(["s-archived", "s-live"]);
  });

  it("does not duplicate a Site that is already selectable", () => {
    const selectable = [sites[0]];
    expect(withCurrentSite(selectable, "s-live", sites)).toEqual(selectable);
  });

  it("changes nothing when there is no current Site", () => {
    const selectable = [sites[0]];
    expect(withCurrentSite(selectable, "", sites)).toEqual(selectable);
  });
});
