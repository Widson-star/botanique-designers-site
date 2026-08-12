import { describe, expect, it } from "vitest";
import {
  costPaymentTruth, costTotal, PAYMENT_KNOWLEDGE, summarisePaymentTruth,
} from "./costPaymentTruth";
import { costReference } from "./costReference";

const claim = (overrides = {}) => ({
  id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  projectId: "p1",
  lifecycle: "approved",
  approvedTotal: 5950,
  submittedTotal: 5950,
  ...overrides,
});

describe("Project Cost payment truth", () => {
  it("keeps a historical approved cost unknown until its payment history is confirmed", () => {
    const truth = costPaymentTruth(claim(), null);
    expect(truth.knowledge).toBe(PAYMENT_KNOWLEDGE.unrecorded);
    expect(truth.paid).toBeNull();
    expect(truth.balance).toBeNull();
  });

  it("never infers payment from approval", () => {
    const truth = costPaymentTruth(claim(), {
      claimId: claim().id,
      historyComplete: false,
      paymentCount: 0,
      paidAmount: null,
      balanceAmount: null,
    });
    expect(truth.paid).toBeNull();
    expect(truth.balance).toBeNull();
  });

  it("shows zero paid only when complete history is genuinely known", () => {
    const truth = costPaymentTruth(claim(), {
      claimId: claim().id,
      historyComplete: true,
      paymentCount: 0,
      paidAmount: 0,
      balanceAmount: 5950,
    });
    expect(truth.knowledge).toBe(PAYMENT_KNOWLEDGE.known);
    expect(truth.paid).toBe(0);
    expect(truth.balance).toBe(5950);
  });

  it("shows a partial payment directly against the cost", () => {
    const truth = costPaymentTruth(claim(), {
      claimId: claim().id,
      historyComplete: true,
      paymentCount: 1,
      paidAmount: 3000,
      balanceAmount: 2950,
    });
    expect(truth.paid).toBe(3000);
    expect(truth.balance).toBe(2950);
    expect(truth.note).toMatch(/Part paid/);
  });

  it("shows a fully paid cost with zero balance", () => {
    const truth = costPaymentTruth(claim(), {
      claimId: claim().id,
      historyComplete: true,
      paymentCount: 2,
      paidAmount: 5950,
      balanceAmount: 0,
    });
    expect(truth.paid).toBe(5950);
    expect(truth.balance).toBe(0);
    expect(truth.note).toMatch(/Paid in full/);
  });

  it("treats an unapproved cost as not payable rather than unpaid", () => {
    const truth = costPaymentTruth(claim({ lifecycle: "awaiting_review", approvedTotal: null }), null);
    expect(truth.knowledge).toBe(PAYMENT_KNOWLEDGE.not_payable);
    expect(truth.paid).toBeNull();
  });

  it("does not fold unknown historical costs into portfolio unpaid totals", () => {
    const claims = [claim({ id: "a", approvedTotal: 5000 }), claim({ id: "b", approvedTotal: 700 })];
    const summary = summarisePaymentTruth(claims, () => null);
    expect(summary.total).toBe(5700);
    expect(summary.paid).toBeNull();
    expect(summary.balance).toBeNull();
    expect(summary.unrecordedCount).toBe(2);
  });

  it("aggregates known payments without pretending unknown history is unpaid", () => {
    const claims = [claim({ id: "a", approvedTotal: 5000 }), claim({ id: "b", approvedTotal: 700 })];
    const positions = new Map([["a", {
      claimId: "a",
      historyComplete: true,
      paymentCount: 1,
      paidAmount: 5000,
      balanceAmount: 0,
    }]]);
    const summary = summarisePaymentTruth(claims, (id) => positions.get(id) || null);
    expect(summary.total).toBe(5700);
    expect(summary.paid).toBe(5000);
    expect(summary.balance).toBe(0);
    expect(summary.unrecordedCount).toBe(1);
  });
});

describe("cost reference", () => {
  it("uses the ICC- convention already used by the cost model", () => {
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
