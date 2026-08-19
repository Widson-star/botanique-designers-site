import { describe, expect, it } from "vitest";
import {
  approvedCostPosition, costBalanceEmphasis, costPaymentTruth, costTotal,
  PAYMENT_KNOWLEDGE, summarisePaymentTruth,
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

// ---------------------------------------------------------------------------
// Historical settlement ("Mark paid"). Founder ruling, 12 Aug 2026.
// ---------------------------------------------------------------------------
describe("Project Cost historical settlement", () => {
  const settled = (overrides = {}) => ({
    claimId: claim().id,
    historyComplete: true,
    paymentCount: 0,
    paidAmount: 5950,
    balanceAmount: 0,
    historicalSettlementAmount: 5950,
    ...overrides,
  });

  it("reads a historically settled cost as paid in full", () => {
    const truth = costPaymentTruth(claim(), settled());
    expect(truth.knowledge).toBe(PAYMENT_KNOWLEDGE.known);
    expect(truth.paid).toBe(5950);
    expect(truth.balance).toBe(0);
  });

  it("says it was settled historically rather than claiming a transaction", () => {
    expect(costPaymentTruth(claim(), settled()).note)
      .toBe("Settled historically, confirmed by the Principal.");
    // A cost paid by real recorded payments says something different.
    expect(costPaymentTruth(claim(), settled({ historicalSettlementAmount: 0, paymentCount: 1 })).note)
      .toBe("Paid in full.");
  });

  it("adds a genuine part payment to the settled remainder without double counting", () => {
    // KES 2,000 was really paid; Mark paid settled only the KES 3,950 left.
    const truth = costPaymentTruth(claim(), settled({
      paymentCount: 1, paidAmount: 5950, historicalSettlementAmount: 3950,
    }));
    expect(truth.paid).toBe(5950);
    expect(truth.balance).toBe(0);
    expect(truth.historicalSettlement).toBe(3950);
  });

  it("reports no settlement while the payment history is still unknown", () => {
    expect(costPaymentTruth(claim(), null).historicalSettlement).toBe(0);
  });

  it("clears the register footer once every unknown cost is settled", () => {
    const claims = [claim({ id: "c1" }), claim({ id: "c2" })];
    const positions = new Map([
      ["c1", settled({ claimId: "c1" })],
      ["c2", settled({ claimId: "c2" })],
    ]);
    const summary = summarisePaymentTruth(claims, (id) => positions.get(id) || null);
    expect(summary.unrecordedCount).toBe(0);
    expect(summary.paid).toBe(11900);
    expect(summary.balance).toBe(0);
  });
});

// The portfolio position above the register. It is not the register footer:
// the footer reconciles the currently visible rows, whatever their lifecycle,
// while this answers what Botanique has actually accepted as an obligation.
describe("approved Project Cost position", () => {
  const known = (id, paid, total) => ({
    claimId: id, historyComplete: true, paymentCount: paid > 0 ? 1 : 0,
    paidAmount: paid, balanceAmount: Math.max(total - paid, 0),
  });

  const portfolio = [
    claim({ id: "approved-part", approvedTotal: 6000, submittedTotal: 6000 }),
    claim({ id: "approved-settled", approvedTotal: 4000, submittedTotal: 4000 }),
    claim({ id: "approved-unknown", approvedTotal: 5000, submittedTotal: 5000 }),
    claim({ id: "awaiting", lifecycle: "awaiting_review", approvedTotal: null, submittedTotal: 3350 }),
    claim({ id: "withdrawn", lifecycle: "withdrawn", approvedTotal: null, submittedTotal: 8000 }),
    claim({ id: "rejected", lifecycle: "rejected", approvedTotal: null, submittedTotal: 7000 }),
    claim({ id: "cancelled", lifecycle: "cancelled", approvedTotal: 9999, submittedTotal: 9999 }),
    claim({ id: "amendment", lifecycle: "amendment_requested", approvedTotal: null, submittedTotal: 2500 }),
    claim({ id: "draft", lifecycle: "draft", approvedTotal: null, submittedTotal: null }),
  ];
  const positions = new Map([
    ["approved-part", known("approved-part", 2000, 6000)],
    ["approved-settled", known("approved-settled", 4000, 4000)],
  ]);
  const position = () => approvedCostPosition(portfolio, (id) => positions.get(id) || null);

  it("counts only approved costs as obligations", () => {
    expect(position().approvedCount).toBe(3);
    expect(position().approvedTotal).toBe(15000);
  });

  it("adds Paid and Outstanding from confirmed positions only", () => {
    expect(position().paid).toBe(6000);
    expect(position().outstanding).toBe(4000);
    expect(position().knownCount).toBe(2);
  });

  it("counts an unconfirmed history apart rather than as KES 0 paid", () => {
    expect(position().unknownCount).toBe(1);
    // 5,000 of approved obligation is in approvedTotal but in neither answer.
    expect(position().paid).not.toBe(6000 + 5000);
    expect(position().outstanding).not.toBe(4000 + 5000);
  });

  it("leaves Paid and Outstanding unknown when no history is confirmed", () => {
    const unknownOnly = approvedCostPosition([claim({ id: "solo" })], () => null);
    expect(unknownOnly.approvedTotal).toBe(5950);
    expect(unknownOnly.paid).toBeNull();
    expect(unknownOnly.outstanding).toBeNull();
    expect(unknownOnly.unknownCount).toBe(1);
  });

  it("counts only costs awaiting the Principal as awaiting decision", () => {
    expect(position().awaitingDecisionCount).toBe(1);
  });

  it("reads a draft's structured line total exactly as costTotal does", () => {
    const drafts = [claim({ id: "draft", lifecycle: "draft", approvedTotal: null, submittedTotal: null })];
    // A draft is not an obligation, so it contributes nothing either way.
    expect(approvedCostPosition(drafts, () => null, () => [{ lineTotal: 1500 }]).approvedTotal).toBe(0);
  });
});

describe("Project Cost balance emphasis", () => {
  it("gives a balance still owing the stronger weight", () => {
    expect(costBalanceEmphasis({ balance: 4000 })).toBe("strong");
  });

  it("keeps a settled balance quiet", () => {
    expect(costBalanceEmphasis({ balance: 0 })).toBe("quiet");
  });

  it("keeps an unknown balance quiet rather than emphasising a guess", () => {
    expect(costBalanceEmphasis({ balance: null })).toBe("quiet");
    expect(costBalanceEmphasis(null)).toBe("quiet");
  });
});
