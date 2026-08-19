import { describe, expect, it } from "vitest";
import { costPaymentTruth } from "./costPaymentTruth";
import {
  matchesProjectCostPayment, projectCostPaymentKey, projectCostRegisterStatus,
  PROJECT_COST_PAYMENT_FILTERS, PROJECT_COST_PAYMENT_LABELS,
} from "./projectCostStatus";

const claim = (overrides = {}) => ({
  id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  lifecycle: "approved",
  approvedTotal: 10000,
  submittedTotal: 10000,
  ...overrides,
});
const known = (paid, total) => ({
  historyComplete: true, paymentCount: paid > 0 ? 1 : 0,
  paidAmount: paid, balanceAmount: Math.max(total - paid, 0),
});
const statusOf = (item, position = null) =>
  projectCostRegisterStatus(item, costPaymentTruth(item, position));

describe("Project Cost register status", () => {
  it("reads an approved cost with nothing paid as Unpaid", () => {
    expect(statusOf(claim(), known(0, 10000)).label).toBe("Unpaid");
  });

  it("reads a part-paid cost as exactly Partially Paid", () => {
    const status = statusOf(claim(), known(4000, 10000));
    expect(status.label).toBe("Partially Paid");
    expect(status.key).toBe("payment:part_paid");
  });

  it("reads a settled cost as Paid", () => {
    expect(statusOf(claim(), known(10000, 10000)).label).toBe("Paid");
  });

  it("reads an approved cost with no confirmed history as Payment history to confirm", () => {
    expect(statusOf(claim(), null).label).toBe("Payment history to confirm");
  });

  // Approval remains the lifecycle. It is simply no longer the answer to
  // "is this still owed?".
  it("never returns Approved as the working status of an approved cost", () => {
    [known(0, 10000), known(4000, 10000), known(10000, 10000), null].forEach((position) =>
      expect(statusOf(claim(), position).label).not.toBe("Approved"));
  });

  it("keeps the lifecycle label for every record that is not approved", () => {
    expect(statusOf(claim({ lifecycle: "draft" })).label).toBe("Draft");
    expect(statusOf(claim({ lifecycle: "awaiting_review" })).label).toBe("Awaiting review");
    expect(statusOf(claim({ lifecycle: "amendment_requested" })).label).toBe("Amendment requested");
    expect(statusOf(claim({ lifecycle: "rejected" })).label).toBe("Rejected");
    expect(statusOf(claim({ lifecycle: "withdrawn" })).label).toBe("Withdrawn");
    expect(statusOf(claim({ lifecycle: "cancelled" })).label).toBe("Cancelled");
  });

  // A payment answer must never be invented from an absent position object.
  it("falls back to Approved only when payment truth has not arrived at all", () => {
    expect(projectCostRegisterStatus(claim(), null).label).toBe("Approved");
    expect(projectCostPaymentKey(claim(), null)).toBe("");
  });

  it("uses no red or amber for an ordinary unpaid obligation", () => {
    ["unpaid", "part_paid"].forEach((key) => {
      const status = projectCostRegisterStatus(claim(), { knowledge: "known", paid: key === "unpaid" ? 0 : 1, balance: 5 });
      expect(["waiting", "neutral"]).toContain(status.tone);
    });
    expect(statusOf(claim(), known(10000, 10000)).tone).toBe("settled");
    expect(statusOf(claim(), null).tone).toBe("neutral");
  });
});

describe("Project Cost payment filter", () => {
  it("offers exactly the four labels the register displays", () => {
    expect(PROJECT_COST_PAYMENT_FILTERS.map((option) => option.label))
      .toEqual(["Unpaid", "Partially Paid", "Paid", "Payment history to confirm"]);
  });

  // Report drill-through URLs already carry these values; renaming a label must
  // never rename the value behind it.
  it("keeps the existing URL values untouched", () => {
    expect(PROJECT_COST_PAYMENT_FILTERS.map((option) => option.value))
      .toEqual(["unpaid", "part_paid", "paid", "unrecorded"]);
    expect(Object.keys(PROJECT_COST_PAYMENT_LABELS))
      .toEqual(["unpaid", "part_paid", "paid", "unrecorded"]);
  });

  it("selects exactly the rows that display that position", () => {
    const cases = [
      ["unpaid", known(0, 10000)],
      ["part_paid", known(4000, 10000)],
      ["paid", known(10000, 10000)],
      ["unrecorded", null],
    ];
    cases.forEach(([filter, position]) => {
      const truth = costPaymentTruth(claim(), position);
      expect(matchesProjectCostPayment(filter, claim(), truth)).toBe(true);
      cases.filter(([other]) => other !== filter).forEach(([, otherPosition]) =>
        expect(matchesProjectCostPayment(filter, claim(), costPaymentTruth(claim(), otherPosition))).toBe(false));
    });
  });

  it("returns everything when no payment position is selected", () => {
    expect(matchesProjectCostPayment("all", claim({ lifecycle: "draft" }), null)).toBe(true);
    expect(matchesProjectCostPayment("", claim(), null)).toBe(true);
  });

  it("never matches a record that has not been approved", () => {
    ["unpaid", "part_paid", "paid", "unrecorded"].forEach((filter) =>
      expect(matchesProjectCostPayment(filter, claim({ lifecycle: "draft" }), costPaymentTruth(claim({ lifecycle: "draft" }), null))).toBe(false));
  });
});
