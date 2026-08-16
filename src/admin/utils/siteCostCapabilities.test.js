import { describe, expect, it } from "vitest";
import {
  calculateSiteCostTotal, canCancelSiteCost, canCopyDailySiteToCost,
  canDecideSiteCost, canEditSiteCost, canSeeSiteCosts, canSubmitSiteCost,
  canSubmitCostFromDailySite, costSubmissionBlockedReason, resolveCurrentDailySiteSource,
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

// FOUNDER ORDERING: a DSR-derived Project Cost may not go for a financial
// decision before the CURRENT authoritative DSR for that project/date has been
// accepted. The original source remains the immutable provenance on the claim.
describe("Project Cost submission follows current Daily Site Record acceptance", () => {
  const draft = { id: "c1", lifecycle: "draft", requesterId: "m1" };
  const superseded = {
    id: "old", projectId: "p1", workDate: "2026-08-15", state: "superseded", disposition: "working",
  };

  it("refuses submission while the source record is still awaiting review", () => {
    expect(canSubmitSiteCost(draft, "manager", "m1")).toBe(true);
    expect(canSubmitCostFromDailySite({ state: "submitted", disposition: "working" })).toBe(false);
    expect(costSubmissionBlockedReason({ state: "submitted", disposition: "working" })).toMatch(/has to be accepted/);
  });

  it("allows the requesting manager to submit once the record is accepted", () => {
    expect(canSubmitSiteCost(draft, "manager", "m1")).toBe(true);
    expect(canSubmitCostFromDailySite({ state: "accepted", disposition: "working" })).toBe(true);
    expect(costSubmissionBlockedReason({ state: "accepted", disposition: "working" })).toBe("");
  });

  it("keeps a superseded row as provenance but follows its accepted current correction", () => {
    const current = {
      id: "current", projectId: "p1", workDate: "2026-08-15", state: "accepted", disposition: "working",
    };
    expect(resolveCurrentDailySiteSource(superseded, [superseded, current])).toEqual(current);
    expect(canSubmitCostFromDailySite(superseded, [superseded, current])).toBe(true);
    expect(costSubmissionBlockedReason(superseded, [superseded, current])).toBe("");
  });

  it("remains blocked when the corrected current row is not yet accepted", () => {
    const current = {
      id: "current", projectId: "p1", workDate: "2026-08-15", state: "submitted", disposition: "working",
    };
    expect(canSubmitCostFromDailySite(superseded, [superseded, current])).toBe(false);
    expect(costSubmissionBlockedReason(superseded, [superseded, current])).toMatch(/current corrected site record.*awaiting review/i);
  });

  it("refuses labour submission if the corrected current row records no work", () => {
    const current = {
      id: "current", projectId: "p1", workDate: "2026-08-15", state: "accepted", disposition: "no_work",
    };
    expect(canSubmitCostFromDailySite(superseded, [superseded, current])).toBe(false);
    expect(costSubmissionBlockedReason(superseded, [superseded, current])).toMatch(/records no work/i);
  });

  it("keeps submission with the requester, not the Principal or another manager", () => {
    expect(canSubmitSiteCost(draft, "owner", "o1")).toBe(false);
    expect(canSubmitSiteCost(draft, "manager", "m2")).toBe(false);
  });
});
