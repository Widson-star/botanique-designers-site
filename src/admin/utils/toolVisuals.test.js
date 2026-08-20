import { describe, expect, it } from "vitest";
import { QUICK_ADD_ITEMS, TOOL_VISUALS, visualTypeForItem } from "./toolVisuals";

describe("tool visual mapping", () => {
  it.each([
    ["Lawn Mower", "mower"],
    ["Brush Cutter", "brush_cutter"],
    ["Wheelbarrow", "wheelbarrow"],
    ["Jembe", "jembe"],
    ["Rake", "rake"],
    ["Spade", "spade"],
    ["Generator", "generator"],
    ["Rotary Hammer Drill", "drill"],
    ["Hose Reel", "hose"],
    ["Secateurs", "shears"],
    ["Irrigation Fittings", "irrigation"],
  ])("maps %s to the %s visual", (name, expected) => {
    expect(visualTypeForItem(name)).toBe(expected);
  });

  // The catalogue name is free text, so matching must survive how people
  // actually type.
  it.each([
    ["lawn mower", "mower"],
    ["  LAWN   MOWER  ", "mower"],
    ["brush-cutter", "brush_cutter"],
    ["brush_cutter", "brush_cutter"],
    ["Petrol Lawn Mower 21in", "mower"],
    ["Shovel", "spade"],
    ["Hoe", "jembe"],
    ["Pruning Shears", "shears"],
    ["Generator 5kVA", "generator"],
    ["Irrigation Pipe 20mm", "irrigation"],
  ])("normalises %s to the %s visual", (name, expected) => {
    expect(visualTypeForItem(name)).toBe(expected);
  });

  // "brush cutter" must not be swallowed by a looser rule, and a mower must
  // not be claimed by the generic fallback.
  it("keeps brush cutter distinct from mower", () => {
    expect(visualTypeForItem("Brush Cutter")).not.toBe("mower");
    expect(visualTypeForItem("Lawn Mower")).not.toBe("brush_cutter");
  });

  it("falls back to a restrained generic visual for an unknown item", () => {
    for (const unknown of ["Site Office Kettle", "Tarpaulin", "", null, undefined, "   "]) {
      expect(visualTypeForItem(unknown)).toBe("generic");
    }
  });

  it("only ever returns a visual the library actually draws", () => {
    const names = ["Lawn Mower", "Nonsense", "Jembe", "", "Hose Reel"];
    for (const name of names) expect(TOOL_VISUALS).toContain(visualTypeForItem(name));
  });
});

describe("quick-add catalogue choices", () => {
  it("covers every common Botanique item the Founder named", () => {
    expect(QUICK_ADD_ITEMS.map((choice) => choice.name)).toEqual([
      "Lawn Mower", "Brush Cutter", "Wheelbarrow", "Jembe", "Rake", "Spade",
      "Generator", "Rotary Hammer Drill", "Hose Reel", "Secateurs", "Irrigation Fittings",
    ]);
  });

  it("gives every choice a drawable visual", () => {
    for (const choice of QUICK_ADD_ITEMS) {
      expect(visualTypeForItem(choice.name)).not.toBe("generic");
    }
  });

  // Asset-tracked items must carry the canonical individual unit the database
  // constraint requires.
  it("keeps asset-tracked choices on the canonical unit", () => {
    for (const choice of QUICK_ADD_ITEMS) {
      if (choice.trackingMethod === "asset") expect(choice.unitOfMeasure).toBe("unit");
    }
  });

  it("uses only normalised canonical category tokens", () => {
    for (const choice of QUICK_ADD_ITEMS) {
      expect(choice.category).toMatch(/^[a-z0-9]+(_[a-z0-9]+)*$/);
    }
  });
});
