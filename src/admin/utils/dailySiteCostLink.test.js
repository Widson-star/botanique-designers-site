import { describe, expect, it } from "vitest";
import {
  financialFollowUpSummary,
  relatedCostClaims,
  summariseFinancialFollowUp,
} from "./dailySiteCostLink";

const entry = {
  id: "e1", projectId: "p1", workDate: "2026-08-05", disposition: "working", state: "submitted",
};

const claim = (overrides = {}) => ({
  id: "c1", projectId: "p1", serviceDate: "2026-08-05", dailySiteEntryId: "e1",
  lifecycle: "awaiting_review", recipientLabel: "Excavation crew", submittedTotal: 18200,
  approvedTotal: null, createdAt: "2026-08-05T13:00:00Z", ...overrides,
});

describe("relatedCostClaims", () => {
  it("links a claim raised from the record", () => {
    const [related] = relatedCostClaims([claim()], entry);
    expect(related.linkedToEntry).toBe(true);
  });

  it("also surfaces a claim for the same project and day raised elsewhere", () => {
    const [related] = relatedCostClaims([claim({ id: "c2", dailySiteEntryId: "" })], entry);
    expect(related.id).toBe("c2");
    expect(related.linkedToEntry).toBe(false);
  });

  it("excludes another project and another day", () => {
    const others = [
      claim({ id: "cx", projectId: "p2", dailySiteEntryId: "" }),
      claim({ id: "cy", serviceDate: "2026-08-06", dailySiteEntryId: "" }),
    ];
    expect(relatedCostClaims(others, entry)).toEqual([]);
  });

  it("keeps every same-day claim — no one-claim-per-day rule", () => {
    const rows = relatedCostClaims([
      claim({ id: "c1", createdAt: "2026-08-05T13:00:00Z" }),
      claim({ id: "c2", createdAt: "2026-08-05T16:00:00Z", lifecycle: "draft" }),
    ], entry);
    expect(rows.map((row) => row.id)).toEqual(["c1", "c2"]);
  });
});

describe("summariseFinancialFollowUp", () => {
  it("returns nothing for a role without site-cost authority", () => {
    expect(summariseFinancialFollowUp(entry, [claim()], "staff")).toBeNull();
  });

  it("reports no claim yet, and offers the create path, on a submitted record", () => {
    const position = summariseFinancialFollowUp(entry, [], "manager");
    expect(position.code).toBe("none_yet");
    expect(position.label).toBe("No cost claim yet");
    expect(position.canCreate).toBe(true);
    expect(position.claims).toEqual([]);
  });

  it("explains that a draft record cannot raise a claim yet", () => {
    const position = summariseFinancialFollowUp({ ...entry, state: "draft" }, [], "manager");
    expect(position.canCreate).toBe(false);
    expect(position.detail).toMatch(/once this record has been submitted/);
  });

  it("expects no claim at all from a no-work day", () => {
    const noWork = { ...entry, disposition: "no_work" };
    const position = summariseFinancialFollowUp(noWork, [], "manager");
    expect(position.label).toBe("No cost claim expected");
    expect(position.canCreate).toBe(false);
  });

  it.each([
    ["draft", "Draft", true],
    ["awaiting_review", "Awaiting review", true],
    ["amendment_requested", "Amendment requested", true],
    ["approved", "Approved", false],
    ["rejected", "Rejected", false],
    ["withdrawn", "Withdrawn", false],
    ["cancelled", "Cancelled", false],
  ])("reports a %s claim truthfully", (lifecycle, label, needsAttention) => {
    const position = summariseFinancialFollowUp(entry, [claim({ lifecycle })], "manager");
    expect(position.code).toBe(lifecycle);
    expect(position.label).toBe(label);
    expect(position.needsAttention).toBe(needsAttention);
    expect(position.claims).toHaveLength(1);
  });

  it("says approval is not payment, and never claims money moved", () => {
    const position = summariseFinancialFollowUp(entry, [claim({ lifecycle: "approved" })], "owner");
    expect(position.detail).toMatch(/not a payment/);
    expect(position.detail).not.toMatch(/paid|released|reconciled|settled/i);
  });

  it("headlines the claim that needs attention when several exist", () => {
    const position = summariseFinancialFollowUp(entry, [
      claim({ id: "c1", lifecycle: "approved" }),
      claim({ id: "c2", lifecycle: "amendment_requested", createdAt: "2026-08-05T16:00:00Z" }),
    ], "manager");
    expect(position.code).toBe("amendment_requested");
    expect(position.label).toBe("2 related cost claims");
    expect(position.claims).toHaveLength(2);
  });

  it("still offers a further claim when one already exists", () => {
    const position = summariseFinancialFollowUp(entry, [claim({ lifecycle: "approved" })], "manager");
    expect(position.canCreate).toBe(true);
  });
});

describe("financialFollowUpSummary", () => {
  it("is a single short phrase per state", () => {
    expect(financialFollowUpSummary(entry, [], "manager")).toBe("No cost claim yet");
    expect(financialFollowUpSummary(entry, [claim()], "manager")).toBe("Cost claim: Awaiting review");
    expect(financialFollowUpSummary(entry, [claim(), claim({ id: "c2" })], "manager"))
      .toBe("2 cost claims");
  });

  it("is silent where no hand-off is possible", () => {
    expect(financialFollowUpSummary({ ...entry, disposition: "no_work" }, [], "manager")).toBe("");
    expect(financialFollowUpSummary(entry, [], "staff")).toBe("");
  });
});
