import { describe, expect, it } from "vitest";
import {
  calculateSiteCostTotal, canCancelSiteCost, canCopyDailySiteToCost,
  canDecideSiteCost, canEditSiteCost, canSeeSiteCosts, canSubmitSiteCost,
} from "./siteCostCapabilities";

describe("site cost capabilities", () => {
  it("limits module visibility to Principal and Operations Manager", () => {
    expect(canSeeSiteCosts("owner")).toBe(true);
    expect(canSeeSiteCosts("manager")).toBe(true);
    expect(canSeeSiteCosts("staff")).toBe(false);
    expect(canSeeSiteCosts("viewer")).toBe(false);
  });

  it("derives totals from structured lines without trusting a supplied total", () => {
    expect(calculateSiteCostTotal([
      { quantity: 6, unitRate: 500, lineTotal: 2 },
      { quantity: 1, unitRate: 350, lineTotal: 999999 },
    ])).toBe(3350);
  });

  it("enforces whole-claim lifecycle controls", () => {
    const draft = { lifecycle: "draft", requesterId: "m1" };
    const awaiting = { lifecycle: "awaiting_review", requesterId: "m1" };
    const approved = { lifecycle: "approved", requesterId: "m1" };
    expect(canEditSiteCost(draft, "manager", "m1")).toBe(true);
    expect(canSubmitSiteCost(draft, "manager", "m1")).toBe(true);
    expect(canEditSiteCost(awaiting, "manager", "m1")).toBe(false);
    expect(canDecideSiteCost(awaiting, "owner")).toBe(true);
    expect(canDecideSiteCost(awaiting, "manager")).toBe(false);
    expect(canCancelSiteCost(approved, "owner")).toBe(true);
  });

  it("allows explicit Daily Site copy only from eligible working states", () => {
    for (const state of ["submitted", "resubmitted", "accepted"]) {
      expect(canCopyDailySiteToCost({ state, disposition: "working" }, "manager")).toBe(true);
    }
    for (const state of ["draft", "returned_for_correction", "voided", "superseded"]) {
      expect(canCopyDailySiteToCost({ state, disposition: "working" }, "manager")).toBe(false);
    }
    expect(canCopyDailySiteToCost({ state: "accepted", disposition: "no_work" }, "owner")).toBe(false);
  });
});
