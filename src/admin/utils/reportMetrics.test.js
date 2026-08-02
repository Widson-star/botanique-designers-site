import { describe, expect, it } from "vitest";
import {
  claimTotals,
  countsAsPlannedLabour,
  fundRequestTotals,
  plannedLabourTotals,
  singleCurrency,
  summariseRangeCompliance,
  sumAmounts,
  supersededEntryIds,
} from "./reportMetrics";
import { formatReportMoney, NOT_RECORDED } from "./reportFormat";

const AUGUST = { startDate: "2026-08-01", endDate: "2026-08-31" };
const JULY = { startDate: "2026-07-01", endDate: "2026-07-31" };

function claim(overrides) {
  return {
    id: "c1",
    lifecycle: "awaiting_review",
    currency: "KES",
    submittedTotal: 1000,
    approvedTotal: null,
    submittedAt: "2026-08-05T09:00:00Z",
    decidedAt: "",
    ...overrides,
  };
}

function fundRequest(overrides) {
  return {
    id: "f1",
    status: "submitted",
    currency: "KES",
    totalRequestedAmount: 2000,
    submittedAt: "2026-08-05T09:00:00Z",
    decidedAt: "",
    ...overrides,
  };
}

function entry(overrides) {
  return {
    id: "e1",
    disposition: "working",
    state: "accepted",
    workDate: "2026-08-05",
    expectedWorkerCount: 6,
    plannedLabourCost: 3000,
    supersedesEntryId: "",
    ...overrides,
  };
}

describe("internal cost claim inclusion", () => {
  it("counts only awaiting-review claims in the submitted total and approved claims in the approved total", () => {
    const totals = claimTotals(
      [
        claim({ id: "a", lifecycle: "awaiting_review", submittedTotal: 1000 }),
        claim({
          id: "b",
          lifecycle: "approved",
          submittedTotal: 5000,
          approvedTotal: 4000,
          decidedAt: "2026-08-10T09:00:00Z",
        }),
      ],
      AUGUST
    );
    expect(totals.submittedTotal).toBe(1000);
    expect(totals.approvedTotal).toBe(4000);
    expect(totals.submittedCount).toBe(1);
    expect(totals.approvedCount).toBe(1);
  });

  it("excludes draft, returned, rejected, withdrawn and cancelled claims from both totals", () => {
    const excluded = ["draft", "amendment_requested", "rejected", "withdrawn", "cancelled"].map(
      (lifecycle, index) =>
        claim({
          id: `x${index}`,
          lifecycle,
          submittedTotal: 900,
          approvedTotal: 900,
          decidedAt: "2026-08-10T09:00:00Z",
        })
    );
    const totals = claimTotals(excluded, AUGUST);
    expect(totals.submittedTotal).toBeNull();
    expect(totals.approvedTotal).toBeNull();
  });

  it("does not double-count a claim submitted in one period and decided in another", () => {
    const straddling = claim({
      lifecycle: "approved",
      submittedTotal: 1000,
      approvedTotal: 800,
      submittedAt: "2026-07-28T09:00:00Z",
      decidedAt: "2026-08-03T09:00:00Z",
    });
    const july = claimTotals([straddling], JULY);
    const august = claimTotals([straddling], AUGUST);
    // In July it is neither: it was not awaiting review at the reporting time,
    // and it was not decided in July.
    expect(july.submittedTotal).toBeNull();
    expect(july.approvedTotal).toBeNull();
    // In August it contributes once, to the approved figure only.
    expect(august.approvedTotal).toBe(800);
    expect(august.submittedTotal).toBeNull();
  });
});

describe("fund request inclusion", () => {
  it("counts submitted requests as requested and approved requests as authorised, both at the requested amount", () => {
    const totals = fundRequestTotals(
      [
        fundRequest({ id: "a", status: "submitted", totalRequestedAmount: 2000 }),
        fundRequest({
          id: "b",
          status: "approved",
          totalRequestedAmount: 7500,
          decidedAt: "2026-08-12T09:00:00Z",
        }),
      ],
      AUGUST
    );
    expect(totals.requestedTotal).toBe(2000);
    expect(totals.authorisedTotal).toBe(7500);
  });

  it("excludes draft, returned, rejected, withdrawn and cancelled requests from both totals", () => {
    const excluded = ["draft", "amendment_requested", "rejected", "withdrawn", "cancelled"].map(
      (status, index) =>
        fundRequest({ id: `x${index}`, status, decidedAt: "2026-08-12T09:00:00Z" })
    );
    const totals = fundRequestTotals(excluded, AUGUST);
    expect(totals.requestedTotal).toBeNull();
    expect(totals.authorisedTotal).toBeNull();
  });
});

describe("Daily Site planned labour inclusion", () => {
  it("includes only working entries in submitted, resubmitted or accepted state", () => {
    expect(countsAsPlannedLabour(entry({ state: "submitted" }), AUGUST)).toBe(true);
    expect(countsAsPlannedLabour(entry({ state: "resubmitted" }), AUGUST)).toBe(true);
    expect(countsAsPlannedLabour(entry({ state: "accepted" }), AUGUST)).toBe(true);
    expect(countsAsPlannedLabour(entry({ state: "draft" }), AUGUST)).toBe(false);
    expect(countsAsPlannedLabour(entry({ state: "voided" }), AUGUST)).toBe(false);
    expect(countsAsPlannedLabour(entry({ state: "superseded" }), AUGUST)).toBe(false);
    expect(countsAsPlannedLabour(entry({ disposition: "no_work" }), AUGUST)).toBe(false);
  });

  it("excludes a returned entry from every planned figure", () => {
    const returned = entry({ id: "r", state: "returned_for_correction" });
    expect(countsAsPlannedLabour(returned, AUGUST)).toBe(false);
    expect(plannedLabourTotals([returned], AUGUST).plannedLabourTotal).toBeNull();
  });

  it("excludes a superseded predecessor and counts only the current version", () => {
    const original = entry({ id: "old", state: "superseded", plannedLabourCost: 3000 });
    const replacement = entry({
      id: "new",
      state: "accepted",
      plannedLabourCost: 3500,
      supersedesEntryId: "old",
    });
    expect(supersededEntryIds([original, replacement]).has("old")).toBe(true);
    const totals = plannedLabourTotals([original, replacement], AUGUST);
    expect(totals.entryCount).toBe(1);
    expect(totals.plannedLabourTotal).toBe(3500);
  });

  it("excludes entries whose work date is outside the period", () => {
    expect(countsAsPlannedLabour(entry({ workDate: "2026-07-31" }), AUGUST)).toBe(false);
    expect(countsAsPlannedLabour(entry({ workDate: "2026-09-01" }), AUGUST)).toBe(false);
  });

  it("sums expected workers as a plan, never as attendance", () => {
    const totals = plannedLabourTotals(
      [entry({ id: "a", expectedWorkerCount: 6 }), entry({ id: "b", expectedWorkerCount: 4, workDate: "2026-08-06" })],
      AUGUST
    );
    expect(totals.expectedWorkerTotal).toBe(10);
  });
});

describe("genuine zero versus absent value", () => {
  it("returns null when nothing contributed and a number when something did", () => {
    expect(sumAmounts([], (record) => record.amount)).toBeNull();
    expect(sumAmounts([{ amount: null }], (record) => record.amount)).toBeNull();
    expect(sumAmounts([{ amount: 0 }], (record) => record.amount)).toBe(0);
    expect(sumAmounts([{ amount: 0 }, { amount: null }], (record) => record.amount)).toBe(0);
  });

  it("formats a genuine stored zero as zero and an absent amount as Not recorded", () => {
    expect(formatReportMoney(0)).toBe("KES 0");
    expect(formatReportMoney(null)).toBe(NOT_RECORDED);
    expect(formatReportMoney(undefined)).toBe(NOT_RECORDED);
    expect(formatReportMoney("")).toBe(NOT_RECORDED);
    expect(formatReportMoney(1234.5)).toBe("KES 1,234.50");
  });

  it("never asserts a single currency over an empty or mixed set", () => {
    expect(singleCurrency([])).toBeNull();
    expect(singleCurrency([{ currency: "KES" }, { currency: "USD" }])).toBeNull();
    expect(singleCurrency([{ currency: "KES" }, { currency: "KES" }])).toBe("KES");
  });
});

describe("Daily Site period compliance summary", () => {
  it("counts submitted, late, waived, missing and not-due days apart", () => {
    const summary = summariseRangeCompliance([
      { due: true, complianceStatus: "entry_present" },
      { due: true, complianceStatus: "entry_late" },
      { due: true, complianceStatus: "waived" },
      { due: true, complianceStatus: "missing", workDate: "2026-08-06" },
      { due: false, complianceStatus: "not_due" },
    ]);
    expect(summary.due).toBe(4);
    expect(summary.submitted).toBe(2);
    expect(summary.submittedLate).toBe(1);
    expect(summary.waived).toBe(1);
    expect(summary.missing).toBe(1);
    expect(summary.notDue).toBe(1);
    expect(summary.missingDays).toHaveLength(1);
  });
});
