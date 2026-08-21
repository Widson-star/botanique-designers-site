import { describe, expect, it } from "vitest";
import {
  EQUIPMENT_CONDITIONS, EQUIPMENT_STATUSES, EQUIPMENT_STATUS_CLASSES,
  EQUIPMENT_CONDITION_CLASSES, canManageInventory, canSeeInventory,
  canUsePrincipalInventoryActions, categoryLabel, equipmentActionsFor, positionLabel, unitLabel,
} from "./inventoryCapabilities";
import { ROLES } from "../constants/roles";

describe("Inventory V1 role boundary", () => {
  it("admits only Principal and Operations Manager", () => {
    expect(canSeeInventory(ROLES.OWNER)).toBe(true);
    expect(canSeeInventory(ROLES.MANAGER)).toBe(true);
    expect(canSeeInventory(ROLES.STAFF)).toBe(false);
    expect(canSeeInventory(ROLES.VIEWER)).toBe(false);
  });

  it("gives both operational roles every ordinary operation", () => {
    expect(canManageInventory(ROLES.OWNER)).toBe(true);
    expect(canManageInventory(ROLES.MANAGER)).toBe(true);
    expect(canManageInventory(ROLES.STAFF)).toBe(false);
    expect(canManageInventory(ROLES.VIEWER)).toBe(false);
  });

  // Retirement, catalogue correction/deactivation and stocktake adjustment are
  // the database's Principal-only powers. The interface must not imply the
  // Operations Manager has them.
  it("reserves the exceptional actions for the Principal alone", () => {
    expect(canUsePrincipalInventoryActions(ROLES.OWNER)).toBe(true);
    expect(canUsePrincipalInventoryActions(ROLES.MANAGER)).toBe(false);
    expect(canUsePrincipalInventoryActions(ROLES.STAFF)).toBe(false);
    expect(canUsePrincipalInventoryActions(ROLES.VIEWER)).toBe(false);
  });
});

describe("equipment lifecycle actions", () => {
  it("offers the Operations Manager every ordinary action but never Retire", () => {
    for (const status of ["available", "issued", "under_repair"]) {
      const ids = equipmentActionsFor(status, ROLES.MANAGER).map((action) => action.id);
      expect(ids).not.toContain("retire");
      expect(ids.length).toBeGreaterThan(0);
    }
  });

  // Retirement is offered only where the live RPC actually permits it.
  it("offers the Principal Retire from available, under_repair and lost", () => {
    for (const status of ["available", "under_repair", "lost"]) {
      expect(equipmentActionsFor(status, ROLES.OWNER).map((action) => action.id)).toContain("retire");
    }
  });

  // retire_equipment_asset() raises "Return this equipment before retiring it"
  // on an issued asset, so offering Retire there would invite a rejected call.
  it("never offers Retire on an issued asset, not even to the Principal", () => {
    expect(equipmentActionsFor("issued", ROLES.OWNER).map((action) => action.id)).not.toContain("retire");
    expect(equipmentActionsFor("issued", ROLES.MANAGER).map((action) => action.id)).not.toContain("retire");
  });

  it("still offers every ordinary issued action to the Principal", () => {
    expect(equipmentActionsFor("issued", ROLES.OWNER).map((action) => action.id))
      .toEqual(["transfer", "return", "condition", "repair", "lost"]);
  });

  it("matches each status to its valid transitions", () => {
    expect(equipmentActionsFor("available", ROLES.MANAGER).map((a) => a.id))
      .toEqual(["issue", "condition", "repair", "lost"]);
    expect(equipmentActionsFor("issued", ROLES.MANAGER).map((a) => a.id))
      .toEqual(["transfer", "return", "condition", "repair", "lost"]);
    expect(equipmentActionsFor("under_repair", ROLES.MANAGER).map((a) => a.id))
      .toEqual(["return_repair", "condition", "lost"]);
  });

  // A lost asset is an unresolved exception, not a movable one.
  it("offers no ordinary movement on a lost asset", () => {
    expect(equipmentActionsFor("lost", ROLES.MANAGER)).toEqual([]);
    expect(equipmentActionsFor("lost", ROLES.OWNER).map((a) => a.id)).toEqual(["retire"]);
  });

  it("treats retired as terminal and read-only for everyone", () => {
    expect(equipmentActionsFor("retired", ROLES.OWNER)).toEqual([]);
    expect(equipmentActionsFor("retired", ROLES.MANAGER)).toEqual([]);
  });

  it("offers nothing at all to staff or viewer", () => {
    for (const role of [ROLES.STAFF, ROLES.VIEWER]) {
      for (const status of EQUIPMENT_STATUSES) {
        expect(equipmentActionsFor(status, role)).toEqual([]);
      }
    }
  });
});

describe("controlled vocabularies", () => {
  it("uses exactly the database status and condition values", () => {
    expect(EQUIPMENT_STATUSES).toEqual(["available", "issued", "under_repair", "lost", "retired"]);
    expect(EQUIPMENT_CONDITIONS).toEqual(["good", "fair", "damaged", "unserviceable"]);
  });

  // "Poor", "Excellent" and "Needs attention" are not schema values, so they
  // must never appear as if they were.
  it("invents no condition the database does not know", () => {
    for (const invented of ["poor", "excellent", "needs_attention"]) {
      expect(EQUIPMENT_CONDITIONS).not.toContain(invented);
    }
  });

  it("uses no amber treatment anywhere", () => {
    const classes = [...Object.values(EQUIPMENT_STATUS_CLASSES), ...Object.values(EQUIPMENT_CONDITION_CLASSES)];
    for (const value of classes) expect(value).not.toMatch(/amber|yellow|orange/);
  });

  // A null Site is Botanique custody, never a fabricated store.
  it("names the Botanique-custody position rather than blanking it", () => {
    expect(positionLabel("")).toBe("Botanique custody");
    expect(positionLabel(null)).toBe("Botanique custody");
    expect(positionLabel("Karen Residence")).toBe("Karen Residence");
  });
});

describe("user-facing taxonomy language", () => {
  // Storage tokens must never reach the screen, and the taxonomy stays
  // extensible — a category the code has never seen still reads correctly, so
  // adding one needs no migration and no deployment.
  it.each([
    ["manual_tools", "Manual tools"],
    ["power_tools", "Power tools"],
    ["grounds_equipment", "Grounds equipment"],
    ["irrigation", "Irrigation"],
    ["site_consumables", "Site consumables"],
    ["safety-ppe", "Safety ppe"],
  ])("shows %s as %s", (token, expected) => {
    expect(categoryLabel(token)).toBe(expected);
  });

  it("never leaks an underscore token", () => {
    for (const token of ["manual_tools", "power_tools", "grounds_equipment"]) {
      expect(categoryLabel(token)).not.toMatch(/_/);
    }
  });

  // Sentence case, not title case: the authority reads "Power tools".
  it("lifts only the first word", () => {
    expect(categoryLabel("power tools")).toBe("Power tools");
    expect(categoryLabel("power tools")).not.toBe("Power Tools");
  });

  // The authority's Unit column reads "Bags", "Pcs" — same sentence case as
  // the category language, never the stored token.
  it("reads units back as words", () => {
    expect(unitLabel("cubic_metre")).toBe("Cubic metre");
    expect(unitLabel("bags")).toBe("Bags");
    expect(unitLabel("cubic_metre")).not.toMatch(/_/);
  });

  it("returns empty for nothing rather than inventing a label", () => {
    expect(categoryLabel("")).toBe("");
    expect(categoryLabel(null)).toBe("");
  });
});
