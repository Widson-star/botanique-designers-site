import { describe, expect, it } from "vitest";
import { activityGlyphFor, paginationSlots } from "./inventoryPresentation";

// Rendered shorthand, so each expectation reads like the footer itself.
const shape = (page, pages) => paginationSlots(page, pages).map((slot) => (slot.gap ? "…" : String(slot.page + 1))).join(" ");

describe("authority pagination shape", () => {
  // The approved screen shows exactly this on page 1 of 5.
  it("renders 1 2 3 … 5 on the first of five pages", () => {
    expect(shape(0, 5)).toBe("1 2 3 … 5");
  });

  it("slides the run and clamps it at the end", () => {
    expect(shape(2, 5)).toBe("1 2 3 4 5");
    expect(shape(4, 5)).toBe("1 … 3 4 5");
  });

  it("gaps on both sides when the current page is in the middle of many", () => {
    expect(shape(4, 9)).toBe("1 … 4 5 6 … 9");
  });

  // Truth, not a fixed shape: few pages means no ellipsis at all.
  it("never invents an ellipsis it does not need", () => {
    expect(shape(0, 2)).toBe("1 2");
    expect(shape(0, 3)).toBe("1 2 3");
    expect(shape(0, 4)).toBe("1 2 3 4");
  });

  it("offers nothing at all for a single page", () => {
    expect(paginationSlots(0, 1)).toEqual([]);
    expect(paginationSlots(0, 0)).toEqual([]);
  });

  it("always includes the current page", () => {
    for (let pages = 1; pages <= 12; pages += 1) {
      for (let page = 0; page < pages; page += 1) {
        const slots = paginationSlots(page, pages);
        if (pages > 1) expect(slots.some((slot) => slot.page === page)).toBe(true);
      }
    }
  });

  it("always includes the first and last page", () => {
    for (let pages = 2; pages <= 12; pages += 1) {
      for (let page = 0; page < pages; page += 1) {
        const numbers = paginationSlots(page, pages).filter((slot) => !slot.gap).map((slot) => slot.page);
        expect(numbers).toContain(0);
        expect(numbers).toContain(pages - 1);
      }
    }
  });
});

describe("activity pictogram semantics", () => {
  // Keyed on the event, not the table it came from.
  it.each([
    [{ kind: "stock", movementType: "issued" }, "out"],
    [{ kind: "stock", movementType: "transferred" }, "cube"],
    [{ kind: "stock", movementType: "consumed" }, "in"],
    [{ kind: "stock", movementType: "received" }, "in"],
    [{ kind: "equipment", eventType: "sent_for_repair" }, "repair"],
    [{ kind: "equipment", eventType: "issued" }, "out"],
    [{ kind: "equipment", eventType: "registered" }, "cube"],
    [{ kind: "catalogue", eventType: "created" }, "cube"],
  ])("maps %o to the %s glyph", (entry, glyph) => {
    expect(activityGlyphFor(entry)).toBe(glyph);
  });

  // The same asset issued and transferred must not draw the same glyph.
  it("distinguishes issuing from transferring", () => {
    expect(activityGlyphFor({ kind: "equipment", eventType: "issued" }))
      .not.toBe(activityGlyphFor({ kind: "equipment", eventType: "transferred" }));
  });

  // An event the authority never showed still gets one of its four forms,
  // never a fifth invented drawing.
  it("falls back to an authority form for an unrecognised event", () => {
    const glyph = activityGlyphFor({ kind: "equipment", eventType: "some_future_event" });
    expect(["out", "cube", "repair", "in"]).toContain(glyph);
  });
});
