import { describe, expect, it } from "vitest";
import {
  fundingForClaims, fundingNextAction, fundingSummaryPhrase, fundRequestsForClaims,
} from "./claimFunding";

const ADVANCE = "operations_manager_accountable_advance";
const DIRECT = "direct_recipient_funding";

const request = (overrides = {}) => ({
  id: "r1", requestNumber: "BDFR-2026-0001", projectId: "p1", status: "approved",
  intendedCustodyType: ADVANCE, totalRequestedAmount: 20000, version: 1, ...overrides,
});

const allocation = (overrides = {}) => ({
  id: "a1", fundRequestId: "r1", claimId: "c1", allocationOrder: 1, requestedAmount: 20000,
  ...overrides,
});

const release = (overrides = {}) => ({
  id: "rel1", fundRequestId: "r1", status: "recorded", custodyDisposition: ADVANCE,
  releasedAmount: 10000, releasedAt: "2026-08-05T09:00:00Z", version: 1, ...overrides,
});

const acquittal = (overrides = {}) => ({
  id: "acq1", fundReleaseId: "rel1", state: "submitted", releasedAmountSnapshot: 10000,
  actualSpendTotal: 10000, returnedAmount: 0, varianceAmount: 0, version: 1, ...overrides,
});

const context = ({ requests = [request()], allocations = [allocation()], releases = [], acquittals = [] } = {}) =>
  ({ requests, allocations, releases, acquittals });

describe("fundRequestsForClaims", () => {
  it("finds nothing for a claim that is on no fund request", () => {
    expect(fundRequestsForClaims(["cX"], context())).toEqual([]);
    expect(fundRequestsForClaims([], context())).toEqual([]);
  });

  it("collapses several allocations of one claim onto one request", () => {
    const linked = fundRequestsForClaims(["c1"], context({
      allocations: [allocation(), allocation({ id: "a2", requestedAmount: 5000 })],
    }));
    expect(linked).toHaveLength(1);
    expect(linked[0].allocatedAmount).toBe(25000);
  });

  it("says when the authority also funds claims outside the set", () => {
    const linked = fundRequestsForClaims(["c1"], context({
      allocations: [allocation(), allocation({ id: "a2", claimId: "c2", requestedAmount: 4000 })],
    }));
    expect(linked[0].coversOtherClaims).toBe(true);
    // The other claim's allocation is NOT added to this claim's figure.
    expect(linked[0].allocatedAmount).toBe(20000);
  });
});

describe("fundingForClaims — funding position", () => {
  it("does not invent a position where no fund request exists", () => {
    const funding = fundingForClaims(["c1"], context({ allocations: [] }));
    expect(funding.fundingPosition).toBe("not_requested");
    expect(funding.authorisedAmount).toBe(0);
    expect(funding.releasedAmount).toBe(0);
    expect(fundingSummaryPhrase(funding)).toBe("");
  });

  it("distinguishes a request still awaiting decision from an unpaid approval", () => {
    const awaiting = fundingForClaims(["c1"], context({ requests: [request({ status: "submitted" })] }));
    expect(awaiting.fundingPosition).toBe("awaiting_authority");
    // Nothing is authorised until it is approved, so no amount is claimed.
    expect(awaiting.authorisedAmount).toBe(0);

    const unpaid = fundingForClaims(["c1"], context());
    expect(unpaid.fundingPosition).toBe("unpaid");
    expect(unpaid.authorisedAmount).toBe(20000);
    expect(unpaid.releasedAmount).toBe(0);
    expect(unpaid.remainingUnreleasedAmount).toBe(20000);
    expect(unpaid.reconciliationApplies).toBe(false);
  });

  it("reports partial funding with the unreleased remainder", () => {
    const funding = fundingForClaims(["c1"], context({ releases: [release()] }));
    expect(funding.fundingPosition).toBe("partially_funded");
    expect(funding.releasedAmount).toBe(10000);
    expect(funding.remainingUnreleasedAmount).toBe(10000);
  });

  it("reports full funding through a single direct payment", () => {
    const funding = fundingForClaims(["c1"], context({
      releases: [release({ custodyDisposition: DIRECT, releasedAmount: 20000, recipientLabel: "Kisumu Hardware" })],
    }));
    expect(funding.fundingPosition).toBe("fully_funded");
    expect(funding.remainingUnreleasedAmount).toBe(0);
    // A direct settled payment owes nobody an account.
    expect(funding.reconciliationApplies).toBe(false);
    expect(funding.reconciliationPosition).toBe("not_required");
    expect(funding.settled).toBe(true);
  });

  it("reaches full funding through several partial releases", () => {
    const funding = fundingForClaims(["c1"], context({
      releases: [
        release({ id: "rel1", custodyDisposition: DIRECT, releasedAmount: 12000, recipientLabel: "Supplier" }),
        release({ id: "rel2", custodyDisposition: DIRECT, releasedAmount: 8000, recipientLabel: "Supplier" }),
      ],
    }));
    expect(funding.fundingPosition).toBe("fully_funded");
    expect(funding.releaseCount).toBe(2);
    expect(funding.releasedAmount).toBe(20000);
  });
});

describe("fundingForClaims — reconciliation position", () => {
  it("is outstanding while an advance has no acquittal at all", () => {
    const funding = fundingForClaims(["c1"], context({
      releases: [release({ releasedAmount: 20000 })],
    }));
    expect(funding.fundingPosition).toBe("fully_funded");
    expect(funding.reconciliationPosition).toBe("outstanding");
    expect(funding.reconciliationApplies).toBe(true);
    // Nothing is spent until it is accounted for. A release is not expenditure.
    expect(funding.actualExpenditureAmount).toBe(0);
    expect(funding.needsAttention).toBe(true);
  });

  it("moves to submitted, then amendment requested, then settled", () => {
    const base = { releases: [release({ releasedAmount: 20000 })] };
    const submitted = fundingForClaims(["c1"], context({
      ...base, acquittals: [acquittal({ releasedAmountSnapshot: 20000, actualSpendTotal: 20000 })],
    }));
    expect(submitted.reconciliationPosition).toBe("submitted");
    expect(submitted.actualExpenditureAmount).toBe(20000);
    expect(submitted.settled).toBe(false);

    const sentBack = fundingForClaims(["c1"], context({
      ...base,
      acquittals: [acquittal({ state: "amendment_requested", releasedAmountSnapshot: 20000, actualSpendTotal: 20000 })],
    }));
    expect(sentBack.reconciliationPosition).toBe("amendment_requested");
    expect(sentBack.needsAttention).toBe(true);

    const settled = fundingForClaims(["c1"], context({
      ...base,
      acquittals: [acquittal({ state: "accepted", releasedAmountSnapshot: 20000, actualSpendTotal: 20000 })],
    }));
    expect(settled.reconciliationPosition).toBe("accepted");
    expect(settled.settled).toBe(true);
    expect(fundingSummaryPhrase(settled)).toBe("Financially settled");
  });

  it("carries the variance of an advance that does not balance", () => {
    const funding = fundingForClaims(["c1"], context({
      releases: [release({ releasedAmount: 20000 })],
      acquittals: [acquittal({
        releasedAmountSnapshot: 20000, actualSpendTotal: 14000, returnedAmount: 3000, varianceAmount: 3000,
      })],
    }));
    expect(funding.varianceAmount).toBe(3000);
    expect(funding.returnedAmount).toBe(3000);
    expect(funding.actualExpenditureAmount).toBe(14000);
  });
});

describe("fundingForClaims — the mixed position", () => {
  // The case the brief singles out: one headline label would hide half of this.
  it("is partly funded AND reconciliation outstanding at the same time", () => {
    const funding = fundingForClaims(["c1"], context({ releases: [release()] }));
    expect(funding.fundingPosition).toBe("partially_funded");
    expect(funding.reconciliationPosition).toBe("outstanding");
    expect(funding.releasedAmount).toBe(10000);
    expect(funding.remainingUnreleasedAmount).toBe(10000);
    // Both dimensions reach the one line a list row has.
    expect(fundingSummaryPhrase(funding)).toBe("Partly funded · Reconciliation outstanding");
  });

  it("handles mixed custody on one authority without classifying the whole request", () => {
    // KES 8,000 authority → KES 3,000 direct supplier payment + KES 5,000 advance.
    const funding = fundingForClaims(["c1"], context({
      requests: [request({ totalRequestedAmount: 8000 })],
      allocations: [allocation({ requestedAmount: 8000 })],
      releases: [
        release({ id: "rel1", custodyDisposition: DIRECT, releasedAmount: 3000, recipientLabel: "Supplier" }),
        release({ id: "rel2", custodyDisposition: ADVANCE, releasedAmount: 5000 }),
      ],
    }));
    expect(funding.fundingPosition).toBe("fully_funded");
    expect(funding.directPaidAmount).toBe(3000);
    expect(funding.advanceReleasedAmount).toBe(5000);
    // Only the advance portion owes an account.
    expect(funding.reconciliationPosition).toBe("outstanding");
    // The direct payment is actual expenditure; the unacquitted advance is not.
    expect(funding.actualExpenditureAmount).toBe(3000);
    expect(funding.hasAccountableAdvance).toBe(true);
    expect(funding.hasDirectPayment).toBe(true);
  });

  it("counts only the advance half once its acquittal is accepted", () => {
    const funding = fundingForClaims(["c1"], context({
      requests: [request({ totalRequestedAmount: 8000 })],
      allocations: [allocation({ requestedAmount: 8000 })],
      releases: [
        release({ id: "rel1", custodyDisposition: DIRECT, releasedAmount: 3000, recipientLabel: "Supplier" }),
        release({ id: "rel2", custodyDisposition: ADVANCE, releasedAmount: 5000 }),
      ],
      acquittals: [acquittal({
        id: "acq2", fundReleaseId: "rel2", state: "accepted",
        releasedAmountSnapshot: 5000, actualSpendTotal: 5000,
      })],
    }));
    expect(funding.actualExpenditureAmount).toBe(8000);
    expect(funding.advanceSpendAmount).toBe(5000);
    expect(funding.settled).toBe(true);
  });
});

describe("fundingForClaims — reversal and history", () => {
  it("a reversed release holds no money and restores the unreleased remainder", () => {
    const funding = fundingForClaims(["c1"], context({
      releases: [release({ status: "reversed", reversalReason: "Wrong recipient" })],
    }));
    expect(funding.fundingPosition).toBe("unpaid");
    expect(funding.releasedAmount).toBe(0);
    expect(funding.remainingUnreleasedAmount).toBe(20000);
    expect(funding.reversedReleaseCount).toBe(1);
    // A reversed advance owes nobody an account.
    expect(funding.reconciliationApplies).toBe(false);
  });

  it("reads a historical approved request with no release as unpaid, not settled", () => {
    const funding = fundingForClaims(["c1"], context());
    expect(funding.settled).toBe(false);
    expect(fundingSummaryPhrase(funding)).toBe("Approved — not yet funded");
  });
});

describe("fundingForClaims — several authorities", () => {
  it("takes the position needing most attention across requests", () => {
    const funding = fundingForClaims(["c1"], context({
      requests: [
        request({ id: "r1", requestNumber: "BDFR-2026-0001", totalRequestedAmount: 10000 }),
        request({ id: "r2", requestNumber: "BDFR-2026-0002", totalRequestedAmount: 6000 }),
      ],
      allocations: [
        allocation({ id: "a1", fundRequestId: "r1", requestedAmount: 10000 }),
        allocation({ id: "a2", fundRequestId: "r2", requestedAmount: 6000 }),
      ],
      releases: [
        release({ id: "rel1", fundRequestId: "r1", custodyDisposition: DIRECT, releasedAmount: 10000, recipientLabel: "Supplier" }),
        release({ id: "rel2", fundRequestId: "r2", releasedAmount: 6000 }),
      ],
    }));
    expect(funding.requests).toHaveLength(2);
    expect(funding.authorisedAmount).toBe(16000);
    expect(funding.releasedAmount).toBe(16000);
    expect(funding.fundingPosition).toBe("fully_funded");
    expect(funding.reconciliationPosition).toBe("outstanding");
    expect(funding.settled).toBe(false);
  });
});

describe("fundingNextAction", () => {
  it("names the outstanding obligation and stays silent once settled", () => {
    const outstanding = fundingForClaims(["c1"], context({ releases: [release({ releasedAmount: 20000 })] }));
    expect(fundingNextAction(outstanding)).toMatch(/accounted for/i);

    const settled = fundingForClaims(["c1"], context({
      releases: [release({ custodyDisposition: DIRECT, releasedAmount: 20000, recipientLabel: "Supplier" })],
    }));
    expect(fundingNextAction(settled)).toBeNull();
    expect(fundingNextAction(fundingForClaims(["c1"], context({ allocations: [] })))).toBeNull();
  });

  it("points at the unreleased remainder while money is still owed out", () => {
    const partial = fundingForClaims(["c1"], context({
      releases: [release({ custodyDisposition: DIRECT, releasedAmount: 10000, recipientLabel: "Supplier" })],
    }));
    expect(fundingNextAction(partial)).toMatch(/remains unreleased/i);
  });
});
