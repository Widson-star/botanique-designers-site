import { describe, expect, it } from "vitest";
import {
  claimCoversPlanningLine, duplicateRiskForEntry, isLiveClaim,
  planningLineFingerprint, possibleDuplicateClaims,
} from "./duplicateCostClaim";

// The real production shape found in the hosted walkthrough: a Daily Site Record for
// 10 workers at KES 500, an approved claim carrying that planning line plus an extra, and a
// second claim carrying nothing but the same planning line.
const entry = {
  id: "e1", projectId: "p1", workDate: "2026-08-09", disposition: "working",
  expectedWorkerCount: 10, ratePerWorker: 500, agreedLabourTotal: null,
};

const planningLine = {
  id: "l1", claimId: "c1", lineNumber: 1, description: "Planned site labour",
  rateType: "daily", quantity: 10, unit: "worker", unitRate: 500, lineTotal: 5000,
};
const extraLine = {
  id: "l2", claimId: "c1", lineNumber: 2, description: "Mkokoteni",
  rateType: "lump_sum", quantity: 1, unit: "item", unitRate: 350, lineTotal: 350,
};

const claim = (overrides = {}) => ({
  id: "c1", projectId: "p1", dailySiteEntryId: "e1", serviceDate: "2026-08-09",
  category: "labour", lifecycle: "approved", recipientLabel: "Site crew",
  submittedTotal: 5350, approvedTotal: 5350, createdAt: "2026-08-09T06:01:00Z", ...overrides,
});

const linesBy = (map) => (id) => map[id] || [];

describe("planningLineFingerprint", () => {
  it("matches the pre-fill AdminSiteCostForm actually generates", () => {
    expect(planningLineFingerprint(entry)).toEqual({
      description: "Planned site labour", rateType: "daily", quantity: 10, unitRate: 500,
    });
  });

  it("uses the agreed total when the day was agreed as a lump sum", () => {
    expect(planningLineFingerprint({ ...entry, agreedLabourTotal: 7200 })).toEqual({
      description: "Agreed site labour", rateType: "lump_sum", quantity: 1, unitRate: 7200,
    });
  });

  it("has no fingerprint for a no-work day or an incomplete plan", () => {
    expect(planningLineFingerprint({ ...entry, disposition: "no_work" })).toBeNull();
    expect(planningLineFingerprint({ ...entry, ratePerWorker: null })).toBeNull();
    expect(planningLineFingerprint(null)).toBeNull();
  });
});

describe("claimCoversPlanningLine", () => {
  it("recognises the record's own planning cost inside a richer claim", () => {
    expect(claimCoversPlanningLine(claim(), [planningLine, extraLine], entry)).toBe(true);
  });

  it("recognises a claim that is nothing but the planning cost", () => {
    expect(claimCoversPlanningLine(claim({ id: "c2" }), [planningLine], entry)).toBe(true);
  });

  it("does not match a claim from a different record", () => {
    expect(claimCoversPlanningLine(claim({ dailySiteEntryId: "other" }), [planningLine], entry)).toBe(false);
  });

  it("does not match a different category", () => {
    expect(claimCoversPlanningLine(claim({ category: "materials" }), [planningLine], entry)).toBe(false);
  });

  it("does not match a genuinely different cost", () => {
    expect(claimCoversPlanningLine(claim(), [extraLine], entry)).toBe(false);
    // Same description, different rate — a real renegotiation, not a duplicate.
    expect(claimCoversPlanningLine(claim(), [{ ...planningLine, unitRate: 600 }], entry)).toBe(false);
  });
});

describe("duplicateRiskForEntry — the required hand-off behaviour", () => {
  it("CASE A: no claim at all leaves Create cost claim as the primary action", () => {
    const risk = duplicateRiskForEntry(entry, [], linesBy({}));
    expect(risk.primaryAction).toBe("create");
    expect(risk.planningCostAlreadyClaimed).toBe(false);
    expect(risk.additionalRequiresReason).toBe(false);
  });

  it("CASE B: an approved claim covering the day makes Open existing claim primary", () => {
    const risk = duplicateRiskForEntry(entry, [claim()], linesBy({ c1: [planningLine, extraLine] }));
    expect(risk.primaryAction).toBe("open");
    expect(risk.planningCostAlreadyClaimed).toBe(true);
    expect(risk.coveringClaims).toHaveLength(1);
  });

  it("CASE B also applies while the claim is still awaiting a decision", () => {
    const risk = duplicateRiskForEntry(
      entry, [claim({ lifecycle: "awaiting_review", approvedTotal: null })],
      linesBy({ c1: [planningLine] })
    );
    expect(risk.primaryAction).toBe("open");
  });

  it("CASE C: an additional cost is still reachable and always deliberate", () => {
    const risk = duplicateRiskForEntry(entry, [claim()], linesBy({ c1: [planningLine] }));
    // The path is never removed — only demoted.
    expect(risk.additionalRequiresReason).toBe(true);
    expect(risk.primaryAction).toBe("open");
  });

  it("does not flag a different cost category on the same day", () => {
    const materials = claim({ id: "c9", category: "materials" });
    const risk = duplicateRiskForEntry(entry, [materials], linesBy({ c9: [extraLine] }));
    expect(risk.planningCostAlreadyClaimed).toBe(false);
    expect(risk.primaryAction).toBe("create");
  });

  it("does not flag a separate later cost against the same record", () => {
    const transport = claim({ id: "c8", category: "transport" });
    const risk = duplicateRiskForEntry(entry, [transport], linesBy({ c8: [extraLine] }));
    expect(risk.primaryAction).toBe("create");
  });

  it("lets a rejected or withdrawn claim be re-raised normally", () => {
    ["rejected", "withdrawn", "cancelled"].forEach((lifecycle) => {
      const risk = duplicateRiskForEntry(entry, [claim({ lifecycle })], linesBy({ c1: [planningLine] }));
      expect(risk.planningCostAlreadyClaimed).toBe(false);
      expect(risk.primaryAction).toBe("create");
    });
  });

  it("keeps every legitimate multiple claim visible rather than hiding any", () => {
    const risk = duplicateRiskForEntry(
      entry,
      [claim(), claim({ id: "c2", category: "materials" }), claim({ id: "c3", category: "transport" })],
      linesBy({ c1: [planningLine], c2: [extraLine], c3: [extraLine] })
    );
    expect(risk.liveClaims).toHaveLength(3);
    expect(risk.coveringClaims).toHaveLength(1);
  });
});

describe("possibleDuplicateClaims — the Principal review surface", () => {
  const subject = claim({ id: "c2", submittedTotal: 5000, approvedTotal: null, lifecycle: "awaiting_review", createdAt: "2026-08-09T18:42:00Z" });
  const lines = linesBy({ c1: [planningLine, extraLine], c2: [{ ...planningLine, claimId: "c2" }] });

  it("surfaces the overlapping claim without deciding anything", () => {
    const overlaps = possibleDuplicateClaims(subject, [claim(), subject], lines);
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].id).toBe("c1");
    // Nothing about the subject claim is mutated or auto-decided.
    expect(subject.lifecycle).toBe("awaiting_review");
  });

  it("is silent when the other claim is a different category", () => {
    const other = claim({ id: "c1", category: "materials" });
    expect(possibleDuplicateClaims(subject, [other, subject], lines)).toEqual([]);
  });

  it("is silent when the other claim was rejected", () => {
    const other = claim({ lifecycle: "rejected" });
    expect(possibleDuplicateClaims(subject, [other, subject], lines)).toEqual([]);
  });

  it("is silent for a claim not raised from any Daily Site Record", () => {
    const loose = claim({ id: "c5", dailySiteEntryId: "" });
    expect(possibleDuplicateClaims(loose, [claim(), loose], lines)).toEqual([]);
  });

  it("is silent when the lines are genuinely different", () => {
    const different = linesBy({ c1: [extraLine], c2: [{ ...planningLine, claimId: "c2" }] });
    expect(possibleDuplicateClaims(subject, [claim(), subject], different)).toEqual([]);
  });

  it("never reports a claim against itself", () => {
    expect(possibleDuplicateClaims(claim(), [claim()], linesBy({ c1: [planningLine] }))).toEqual([]);
  });
});

describe("isLiveClaim", () => {
  it("counts only lifecycles that still represent an obligation", () => {
    ["draft", "awaiting_review", "amendment_requested", "approved"]
      .forEach((lifecycle) => expect(isLiveClaim({ lifecycle })).toBe(true));
    ["rejected", "withdrawn", "cancelled"]
      .forEach((lifecycle) => expect(isLiveClaim({ lifecycle })).toBe(false));
  });
});
