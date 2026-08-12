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
    expect(position.label).toBe("No Project Cost yet");
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
    expect(position.label).toBe("No Project Cost expected");
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
    expect(position.label).toBe("2 related Project Costs");
    expect(position.claims).toHaveLength(2);
  });

  it("still offers a further claim when one already exists", () => {
    const position = summariseFinancialFollowUp(entry, [claim({ lifecycle: "approved" })], "manager");
    expect(position.canCreate).toBe(true);
  });
});

describe("financialFollowUpSummary", () => {
  it("is a single short phrase per state", () => {
    expect(financialFollowUpSummary(entry, [], "manager")).toBe("No Project Cost yet");
    expect(financialFollowUpSummary(entry, [claim()], "manager")).toBe("Project Cost: Awaiting review");
    expect(financialFollowUpSummary(entry, [claim(), claim({ id: "c2" })], "manager"))
      .toBe("2 Project Costs");
  });

  it("is silent where no hand-off is possible", () => {
    expect(financialFollowUpSummary({ ...entry, disposition: "no_work" }, [], "manager")).toBe("");
    expect(financialFollowUpSummary(entry, [], "staff")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// BD-FIN-01C read integration. The Daily Site Record now reaches through the
// claim to the fund request behind it and reports what actually happened to the
// money — without becoming the place where any of it is recorded.
// ---------------------------------------------------------------------------

const ADVANCE = "operations_manager_accountable_advance";
const DIRECT = "direct_recipient_funding";

const approved = () => claim({ lifecycle: "approved", approvedTotal: 20000 });

const finance = ({ status = "approved", releases = [], acquittals = [], total = 20000 } = {}) => ({
  requests: [{
    id: "r1", requestNumber: "BDFR-2026-0001", projectId: "p1", status,
    intendedCustodyType: ADVANCE, totalRequestedAmount: total, version: 1,
  }],
  allocations: [{ id: "a1", fundRequestId: "r1", claimId: "c1", allocationOrder: 1, requestedAmount: total }],
  releases, acquittals,
});

const rel = (overrides = {}) => ({
  id: "rel1", fundRequestId: "r1", status: "recorded", custodyDisposition: ADVANCE,
  releasedAmount: 10000, releasedAt: "2026-08-05T09:00:00Z", version: 1, ...overrides,
});

describe("summariseFinancialFollowUp — downstream financial position", () => {
  it("asserts nothing financial when there is no claim at all", () => {
    const position = summariseFinancialFollowUp(entry, [], "manager", finance());
    expect(position.funding).toBeNull();
    expect(position.needsAttention).toBe(false);
  });

  it("stays silent about money when the claim is on no fund request", () => {
    const position = summariseFinancialFollowUp(
      entry, [approved()], "manager", { requests: [], allocations: [], releases: [], acquittals: [] }
    );
    expect(position.funding).toBeNull();
  });

  it("says nothing downstream when no fund-request context is supplied", () => {
    expect(summariseFinancialFollowUp(entry, [approved()], "manager").funding).toBeNull();
  });

  it("surfaces approved but unpaid", () => {
    const { funding } = summariseFinancialFollowUp(entry, [approved()], "manager", finance());
    expect(funding.fundingPosition).toBe("unpaid");
    expect(funding.authorisedAmount).toBe(20000);
    expect(funding.releasedAmount).toBe(0);
    expect(funding.remainingUnreleasedAmount).toBe(20000);
  });

  it("surfaces the mixed partly-funded and unreconciled position", () => {
    const { funding, needsAttention } = summariseFinancialFollowUp(
      entry, [approved()], "manager", finance({ releases: [rel()] })
    );
    expect(funding.fundingPosition).toBe("partially_funded");
    expect(funding.reconciliationPosition).toBe("outstanding");
    expect(needsAttention).toBe(true);
  });

  it("surfaces a fully funded direct payment with no reconciliation debt", () => {
    const { funding } = summariseFinancialFollowUp(entry, [approved()], "manager", finance({
      releases: [rel({ custodyDisposition: DIRECT, releasedAmount: 20000, recipientLabel: "Supplier" })],
    }));
    expect(funding.fundingPosition).toBe("fully_funded");
    expect(funding.reconciliationApplies).toBe(false);
    expect(funding.settled).toBe(true);
  });

  it("surfaces multiple releases against one authority", () => {
    const { funding } = summariseFinancialFollowUp(entry, [approved()], "manager", finance({
      releases: [
        rel({ id: "rel1", custodyDisposition: DIRECT, releasedAmount: 6000, recipientLabel: "Supplier" }),
        rel({ id: "rel2", custodyDisposition: DIRECT, releasedAmount: 4000, recipientLabel: "Supplier" }),
      ],
    }));
    expect(funding.releaseCount).toBe(2);
    expect(funding.releasedAmount).toBe(10000);
    expect(funding.fundingPosition).toBe("partially_funded");
  });

  it("surfaces reconciliation submitted, sent back and settled", () => {
    const advance = { releases: [rel({ releasedAmount: 20000 })] };
    const acq = (state) => [{
      id: "acq1", fundReleaseId: "rel1", state, releasedAmountSnapshot: 20000,
      actualSpendTotal: 20000, returnedAmount: 0, varianceAmount: 0, version: 1,
    }];
    expect(summariseFinancialFollowUp(entry, [approved()], "manager",
      finance({ ...advance, acquittals: acq("submitted") })).funding.reconciliationPosition).toBe("submitted");
    expect(summariseFinancialFollowUp(entry, [approved()], "manager",
      finance({ ...advance, acquittals: acq("amendment_requested") })).funding.reconciliationPosition)
      .toBe("amendment_requested");
    const settled = summariseFinancialFollowUp(entry, [approved()], "manager",
      finance({ ...advance, acquittals: acq("accepted") })).funding;
    expect(settled.settled).toBe(true);
    expect(settled.needsAttention).toBe(false);
  });

  it("does not treat an unapproved fund request as funding", () => {
    const { funding } = summariseFinancialFollowUp(entry, [approved()], "manager",
      finance({ status: "submitted" }));
    expect(funding.fundingPosition).toBe("awaiting_authority");
    expect(funding.authorisedAmount).toBe(0);
  });

  it("keeps the claim lifecycle visible alongside the financial position", () => {
    // A rejected claim never reaches a fund request, and is not reported as unpaid.
    const position = summariseFinancialFollowUp(
      entry, [claim({ lifecycle: "rejected" })], "manager",
      { requests: [], allocations: [], releases: [], acquittals: [] }
    );
    expect(position.code).toBe("rejected");
    expect(position.funding).toBeNull();
  });
});

describe("financialFollowUpSummary — one line, both dimensions", () => {
  it("spends the line on the financial position once money is involved", () => {
    expect(financialFollowUpSummary(entry, [approved()], "manager", finance({ releases: [rel()] })))
      .toBe("Partly funded · Reconciliation outstanding");
    expect(financialFollowUpSummary(entry, [approved()], "manager", finance()))
      .toBe("Approved — not yet funded");
  });

  it("falls back to the claim position when no money has been authorised", () => {
    expect(financialFollowUpSummary(entry, [claim()], "manager",
      { requests: [], allocations: [], releases: [], acquittals: [] }))
      .toBe("Project Cost: Awaiting review");
  });
});
