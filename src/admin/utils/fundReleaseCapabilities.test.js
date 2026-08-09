import { describe, expect, it } from "vitest";
import {
  acceptanceRequiresReason, acquittalOutcome, calculateAcquittalSpend,
  canConfirmFundReleaseReceipt, canDecideFundAcquittal, canRecordFundRelease,
  canReverseFundRelease, canSubmitFundAcquittal, deriveFinancialPosition,
  releasedTotal, remainingReleasable, requiresReconciliation,
} from "./fundReleaseCapabilities";

// These are the same scenarios the database matrix in
// supabase/tests/fund_release_and_reconciliation_test.sql asserts. They exist twice on
// purpose: the SQL proves the hosted truth, and this proves the demo surface derives the same
// position from the same rows.

const request = {
  id: "fr1", status: "approved", totalRequestedAmount: 10000,
  intendedCustodyType: "operations_manager_accountable_advance",
};

const advance = (over = {}) => ({
  id: "rel1", fundRequestId: "fr1", status: "recorded",
  custodyDisposition: "operations_manager_accountable_advance",
  recipientProfileId: "m1", recipientLabel: null, releasedAmount: 10000,
  releasedAt: "2026-08-09T08:00:00Z", paymentChannel: "mpesa", version: 1, ...over,
});

const direct = (over = {}) => ({
  id: "rel2", fundRequestId: "fr1", status: "recorded",
  custodyDisposition: "direct_recipient_funding",
  recipientProfileId: null, recipientLabel: "Siaya Hardware", releasedAmount: 10000,
  releasedAt: "2026-08-09T08:00:00Z", paymentChannel: "bank_transfer", version: 1, ...over,
});

const acquittal = (over = {}) => ({
  id: "acq1", fundReleaseId: "rel1", state: "submitted",
  releasedAmountSnapshot: 10000, actualSpendTotal: 10000, returnedAmount: 0,
  submittedBy: "m1", version: 1, ...over,
});

describe("derived financial position", () => {
  it("scenario 1 and 12: an approved request with no release is approved and unpaid", () => {
    const position = deriveFinancialPosition(request, [], []);
    expect(position.releasedAmount).toBe(0);
    expect(position.remainingReleasableAmount).toBe(10000);
    expect(position.releaseState).toBe("none");
    expect(position.reconciliationState).toBe("not_required");
    expect(position.financialPosition).toBe("approved_unpaid");
  });

  it("scenario 2: one partial release is partly funded", () => {
    const position = deriveFinancialPosition(request, [advance({ releasedAmount: 4000 })], []);
    expect(position.releasedAmount).toBe(4000);
    expect(position.remainingReleasableAmount).toBe(6000);
    expect(position.releaseState).toBe("partially_released");
    // An advance nobody has accounted for is what the reader must act on next.
    expect(position.financialPosition).toBe("reconciliation_outstanding");
  });

  it("scenario 3: multiple releases aggregate, and reversed ones hold no money", () => {
    const releases = [
      advance({ id: "a", releasedAmount: 4000 }),
      advance({ id: "b", releasedAmount: 6000 }),
      advance({ id: "c", releasedAmount: 5000, status: "reversed" }),
    ];
    expect(releasedTotal(releases)).toBe(10000);
    const position = deriveFinancialPosition(request, releases, []);
    expect(position.releaseCount).toBe(2);
    expect(position.reversedReleaseCount).toBe(1);
    expect(position.releaseState).toBe("fully_released");
    expect(position.remainingReleasableAmount).toBe(0);
  });

  it("scenario 8: a fully paid direct settlement is settled with no acquittal at all", () => {
    const position = deriveFinancialPosition(request, [direct()], []);
    expect(position.directPaidAmount).toBe(10000);
    expect(position.advanceReleasedAmount).toBe(0);
    expect(position.reconciliationState).toBe("not_required");
    expect(position.financialPosition).toBe("financially_settled");
  });

  it("scenario 5: an advance fully spent and accepted is financially settled", () => {
    const position = deriveFinancialPosition(request, [advance()], [acquittal({ state: "accepted" })]);
    expect(position.actualSpendAmount).toBe(10000);
    expect(position.varianceAmount).toBe(0);
    expect(position.financialPosition).toBe("financially_settled");
  });

  it("scenario 6: unspent money returned closes the position exactly", () => {
    const outcome = acquittalOutcome(acquittal({ actualSpendTotal: 6500, returnedAmount: 3500 }));
    expect(outcome.spent).toBe(6500);
    expect(outcome.returned).toBe(3500);
    expect(outcome.unspent).toBe(3500);
    expect(outcome.variance).toBe(0);
    expect(outcome.balances).toBe(true);
    const position = deriveFinancialPosition(request, [advance()],
      [acquittal({ state: "accepted", actualSpendTotal: 6500, returnedAmount: 3500 })]);
    // Actual project expenditure is what was spent, never what was released.
    expect(position.actualSpendAmount).toBe(6500);
    expect(position.returnedAmount).toBe(3500);
    expect(position.financialPosition).toBe("financially_settled");
  });

  it("scenario 7: an advance with unresolved variance is not financially settled", () => {
    const outcome = acquittalOutcome(acquittal({ actualSpendTotal: 7000 }));
    expect(outcome.variance).toBe(3000);
    expect(outcome.unaccounted).toBe(3000);
    expect(outcome.balances).toBe(false);
    const position = deriveFinancialPosition(request, [advance()],
      [acquittal({ actualSpendTotal: 7000 })]);
    expect(position.varianceAmount).toBe(3000);
    expect(position.financialPosition).not.toBe("financially_settled");
    expect(position.financialPosition).toBe("reconciliation_submitted");
  });

  it("represents spending beyond the advance as an additional amount required", () => {
    const outcome = acquittalOutcome(acquittal({ actualSpendTotal: 11200 }));
    expect(outcome.variance).toBe(-1200);
    expect(outcome.additionalRequired).toBe(1200);
    expect(outcome.unaccounted).toBe(0);
  });

  it("keeps a mixed authority outstanding while any one advance is unreconciled", () => {
    const releases = [
      direct({ id: "d", releasedAmount: 5000 }),
      advance({ id: "a", releasedAmount: 5000 }),
    ];
    const position = deriveFinancialPosition(request, releases, []);
    expect(position.releaseState).toBe("fully_released");
    expect(position.reconciliationState).toBe("outstanding");
    expect(position.financialPosition).toBe("reconciliation_outstanding");
  });

  it("gives an unapproved authority no financial position at all", () => {
    const position = deriveFinancialPosition({ ...request, status: "submitted" }, [], []);
    expect(position.financialPosition).toBe("not_applicable");
    expect(position.authorisedAmount).toBe(0);
  });

  it("ignores releases belonging to another fund request", () => {
    const position = deriveFinancialPosition(request, [advance({ fundRequestId: "other" })], []);
    expect(position.releasedAmount).toBe(0);
    expect(position.financialPosition).toBe("approved_unpaid");
  });
});

describe("release and reconciliation authority", () => {
  it("scenarios 9 and 10: only the Principal records a release, and only while headroom remains", () => {
    expect(canRecordFundRelease(request, "owner", [])).toBe(true);
    expect(canRecordFundRelease(request, "manager", [])).toBe(false);
    expect(canRecordFundRelease(request, "staff", [])).toBe(false);
    expect(canRecordFundRelease({ ...request, status: "submitted" }, "owner", [])).toBe(false);
    expect(canRecordFundRelease(request, "owner", [advance()])).toBe(false);
    expect(remainingReleasable(request, [advance()])).toBe(0);
  });

  it("scenario 4: remaining releasable never goes negative", () => {
    expect(remainingReleasable(request, [advance({ releasedAmount: 12000 })])).toBe(0);
  });

  it("scenario 13: a release with a reconciliation against it cannot be reversed", () => {
    expect(canReverseFundRelease(advance(), "owner", null)).toBe(true);
    expect(canReverseFundRelease(advance(), "owner", acquittal())).toBe(false);
    expect(canReverseFundRelease(advance(), "manager", null)).toBe(false);
    expect(canReverseFundRelease(advance({ status: "reversed" }), "owner", null)).toBe(false);
  });

  it("asks nobody to acknowledge a direct payment they never received", () => {
    expect(canConfirmFundReleaseReceipt(advance(), "m1")).toBe(true);
    expect(canConfirmFundReleaseReceipt(advance(), "o1")).toBe(false);
    expect(canConfirmFundReleaseReceipt(direct(), "m1")).toBe(false);
    expect(canConfirmFundReleaseReceipt(advance({ receiptConfirmedAt: "now" }), "m1")).toBe(false);
  });

  it("scenario 8: reconciliation follows custody, not every payment", () => {
    expect(requiresReconciliation(advance())).toBe(true);
    expect(requiresReconciliation(direct())).toBe(false);
    expect(canSubmitFundAcquittal(direct(), null, "m1")).toBe(false);
    expect(canSubmitFundAcquittal(advance(), null, "m1")).toBe(true);
    // Only the person who actually held the money.
    expect(canSubmitFundAcquittal(advance(), null, "m2")).toBe(false);
    expect(canSubmitFundAcquittal(advance(), acquittal(), "m1")).toBe(false);
    expect(canSubmitFundAcquittal(advance(), acquittal({ state: "amendment_requested" }), "m1")).toBe(true);
    expect(canSubmitFundAcquittal(advance(), acquittal({ state: "accepted" }), "m1")).toBe(false);
  });

  it("does not let the person who spent the money certify their own spending", () => {
    expect(canDecideFundAcquittal(acquittal(), "owner", "o1")).toBe(true);
    expect(canDecideFundAcquittal(acquittal(), "manager", "m1")).toBe(false);
    expect(canDecideFundAcquittal(acquittal({ submittedBy: "o1" }), "owner", "o1")).toBe(false);
    expect(canDecideFundAcquittal(acquittal({ state: "accepted" }), "owner", "o1")).toBe(false);
  });

  it("makes a reason mandatory before an abnormal position can be closed", () => {
    expect(acceptanceRequiresReason(acquittal())).toBe(false);
    expect(acceptanceRequiresReason(acquittal({ actualSpendTotal: 7000 }))).toBe(true);
    expect(acceptanceRequiresReason(acquittal({ actualSpendTotal: 12000 }))).toBe(true);
  });

  it("totals expenditure lines and ignores unusable ones", () => {
    expect(calculateAcquittalSpend([{ amount: 1200 }, { amount: "800" }])).toBe(2000);
    expect(calculateAcquittalSpend([{ amount: -5 }, { amount: "abc" }, { amount: 10 }])).toBe(10);
    expect(calculateAcquittalSpend()).toBe(0);
  });
});
