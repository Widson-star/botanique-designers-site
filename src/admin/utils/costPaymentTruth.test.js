import { describe, expect, it } from "vitest";
import {
  costPaymentTruth, costTotal, PAYMENT_KNOWLEDGE, summarisePaymentTruth,
} from "./costPaymentTruth";
import { costReference } from "./costReference";

const ADVANCE = "operations_manager_accountable_advance";
const DIRECT = "direct_recipient_funding";

const claim = (o = {}) => ({
  id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", projectId: "p1",
  lifecycle: "approved", approvedTotal: 5950, submittedTotal: 5950, ...o,
});
const finance = (o = {}) => ({
  requests: [{ id: "r1", requestNumber: "BDFR-1", projectId: "p1", status: "approved", totalRequestedAmount: 5950, version: 1 }],
  allocations: [{ id: "a1", fundRequestId: "r1", claimId: claim().id, requestedAmount: 5950 }],
  releases: [], acquittals: [], ...o,
});
const release = (o = {}) => ({
  id: "rel1", fundRequestId: "r1", status: "recorded", custodyDisposition: DIRECT,
  recipientLabel: "Supplier", releasedAmount: 5950, version: 1, ...o,
});

describe("payment truth", () => {
  // The heart of the Founder amendment: unrecorded is not unpaid.
  it("reports UNKNOWN, not zero, when no fund request exists", () => {
    const truth = costPaymentTruth(claim(), finance({ allocations: [], requests: [] }));
    expect(truth.knowledge).toBe(PAYMENT_KNOWLEDGE.unrecorded);
    expect(truth.paid).toBeNull();
    expect(truth.balance).toBeNull();
    expect(truth.note).toMatch(/may have been paid outside/);
  });

  it("never infers payment from approval", () => {
    const truth = costPaymentTruth(claim(), null);
    expect(truth.paid).toBeNull();
  });

  it("states paid and balance once a release genuinely belongs to this one cost", () => {
    const truth = costPaymentTruth(claim(), finance({ releases: [release()] }));
    expect(truth.knowledge).toBe(PAYMENT_KNOWLEDGE.known);
    expect(truth.paid).toBe(5950);
    expect(truth.balance).toBe(0);
  });

  it("reports a part payment as part paid", () => {
    const truth = costPaymentTruth(claim(), finance({ releases: [release({ releasedAmount: 3000 })] }));
    expect(truth.paid).toBe(3000);
    expect(truth.balance).toBe(2950);
  });

  // A release belongs to the authority, never to one claim inside it.
  it("refuses a per-cost figure when the authority also funds other costs", () => {
    const truth = costPaymentTruth(claim(), finance({
      allocations: [
        { id: "a1", fundRequestId: "r1", claimId: claim().id, requestedAmount: 3000 },
        { id: "a2", fundRequestId: "r1", claimId: "other", requestedAmount: 2950 },
      ],
      releases: [release()],
    }));
    expect(truth.knowledge).toBe(PAYMENT_KNOWLEDGE.shared);
    expect(truth.paid).toBeNull();
  });

  it("treats an unapproved cost as not payable rather than unpaid", () => {
    const truth = costPaymentTruth(claim({ lifecycle: "awaiting_review", approvedTotal: null }), finance());
    expect(truth.knowledge).toBe(PAYMENT_KNOWLEDGE.not_payable);
    expect(truth.paid).toBeNull();
  });

  it("counts unknown-payment costs separately instead of folding them into unpaid", () => {
    const summary = summarisePaymentTruth([claim()], finance({ allocations: [], requests: [] }));
    expect(summary.total).toBe(5950);
    // Nothing in view has known payment truth, so a "Paid KES 0" total would be
    // the same lie the row-level rule prevents.
    expect(summary.paid).toBeNull();
    expect(summary.balance).toBeNull();
    expect(summary.unrecordedCount).toBe(1);
  });
});

describe("cost reference", () => {
  it("uses the ICC- convention the schema already stamps into allocations", () => {
    expect(costReference(claim())).toBe("ICC-AAAAAAAA");
  });

  it("never exposes a raw id when no usable reference exists", () => {
    expect(costReference({ id: "demo-cost-123" })).toBe("—");
    expect(costReference(null)).toBe("—");
  });
});

// FOUNDER RULING, 12 Aug 2026. Draft means not yet submitted. It does not mean
// zero cost: a draft already owns structured cost lines.
describe("draft totals", () => {
  const draftLines = [
    { id: "l1", lineTotal: 5000 },
    { id: "l2", lineTotal: 350 },
  ];
  const draft = { id: "c1", lifecycle: "draft", submittedTotal: null, approvedTotal: null };

  it("reads a draft total from its structured cost lines", () => {
    expect(costTotal(draft, draftLines)).toBe(5350);
  });

  it("still shows zero when a draft genuinely holds no lines", () => {
    expect(costTotal(draft, [])).toBe(0);
    expect(costTotal(draft, null)).toBe(0);
  });

  it("never lets a line total override a submitted or approved amount", () => {
    expect(costTotal({ ...draft, submittedTotal: 4000 }, draftLines)).toBe(4000);
    expect(costTotal({ ...draft, submittedTotal: 4000, approvedTotal: 3800 }, draftLines)).toBe(3800);
  });

  it("does not turn a draft total into a payment position", () => {
    const truth = costPaymentTruth(draft, null, draftLines);
    expect(truth.total).toBe(5350);
    // A draft is not payable, so Paid and Balance stay unknown — never KES 0.
    expect(truth.paid).toBeNull();
    expect(truth.balance).toBeNull();
    expect(truth.knowledge).toBe(PAYMENT_KNOWLEDGE.not_payable);
  });
});
