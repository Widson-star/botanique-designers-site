import { describe, expect, it } from "vitest";
import {
  canAcceptDailyEntry,
  canCorrectDailyEntry,
  canEditDailyDraft,
  canRecordDailySiteEntry,
  canReturnDailyEntry,
  canReviewDailySiteEntry,
  canSeeDailySiteOperations,
  canSupersedeDailyEntry,
  canVoidDailyEntry,
  canWaiveCompliance,
  computeLabourCost,
  summarizeCompliance,
  validateEntryPlan,
} from "./dailySiteCapabilities";

describe("daily site role capabilities", () => {
  it("shows the module only to owner and manager", () => {
    expect(canSeeDailySiteOperations("owner")).toBe(true);
    expect(canSeeDailySiteOperations("manager")).toBe(true);
    expect(canSeeDailySiteOperations("staff")).toBe(false);
    expect(canSeeDailySiteOperations("viewer")).toBe(false);
  });

  it("lets owner and manager record entries", () => {
    expect(canRecordDailySiteEntry("owner")).toBe(true);
    expect(canRecordDailySiteEntry("manager")).toBe(true);
    expect(canRecordDailySiteEntry("staff")).toBe(false);
  });

  it("restricts review, void, supersede and waive to the owner", () => {
    const submitted = { state: "submitted" };
    const accepted = { state: "accepted" };
    expect(canReviewDailySiteEntry("owner")).toBe(true);
    expect(canReviewDailySiteEntry("manager")).toBe(false);
    expect(canReturnDailyEntry("owner", submitted)).toBe(true);
    expect(canReturnDailyEntry("manager", submitted)).toBe(false);
    expect(canAcceptDailyEntry("owner", submitted)).toBe(true);
    expect(canAcceptDailyEntry("manager", submitted)).toBe(false);
    expect(canVoidDailyEntry("owner", submitted)).toBe(true);
    expect(canVoidDailyEntry("manager", submitted)).toBe(false);
    expect(canSupersedeDailyEntry("owner", accepted)).toBe(true);
    expect(canSupersedeDailyEntry("manager", accepted)).toBe(false);
    expect(canWaiveCompliance("owner")).toBe(true);
    expect(canWaiveCompliance("manager")).toBe(false);
  });

  it("only supersedes accepted entries and only voids non-terminal ones", () => {
    expect(canSupersedeDailyEntry("owner", { state: "submitted" })).toBe(false);
    expect(canVoidDailyEntry("owner", { state: "accepted" })).toBe(false);
    expect(canVoidDailyEntry("owner", { state: "voided" })).toBe(false);
  });

  it("limits draft edit/submit to the author (manager) or owner", () => {
    const draft = { state: "draft", createdBy: "m1" };
    expect(canEditDailyDraft("manager", draft, "m1")).toBe(true);
    expect(canEditDailyDraft("manager", draft, "m2")).toBe(false);
    expect(canEditDailyDraft("owner", draft, "someone")).toBe(true);
    expect(canEditDailyDraft("manager", { state: "submitted", createdBy: "m1" }, "m1")).toBe(false);
  });

  it("limits correction to a returned entry's author", () => {
    const returned = { state: "returned_for_correction", createdBy: "m1" };
    expect(canCorrectDailyEntry("manager", returned, "m1")).toBe(true);
    expect(canCorrectDailyEntry("manager", returned, "m2")).toBe(false);
    expect(canCorrectDailyEntry("manager", { state: "submitted", createdBy: "m1" }, "m1")).toBe(false);
  });
});

describe("labour calculation", () => {
  it("computes rate × worker count", () => {
    expect(computeLabourCost({ disposition: "working", expectedWorkerCount: 8, ratePerWorker: 500 })).toBe(4000);
  });
  it("uses the agreed total when provided", () => {
    expect(computeLabourCost({ disposition: "working", expectedWorkerCount: 3, agreedLabourTotal: 4500 })).toBe(4500);
  });
  it("is zero for a no-work entry", () => {
    expect(computeLabourCost({ disposition: "no_work", expectedWorkerCount: 0 })).toBe(0);
  });
});

describe("client-side validation mirror", () => {
  it("accepts a valid working entry", () => {
    expect(validateEntryPlan({
      disposition: "working", expectedWorkerCount: 5, ratePerWorker: 400, workPlanned: "Turf",
    })).toEqual({});
  });
  it("rejects both labour inputs at once", () => {
    const errors = validateEntryPlan({
      disposition: "working", expectedWorkerCount: 5, ratePerWorker: 400, agreedLabourTotal: 2000, workPlanned: "Turf",
    });
    expect(errors.labour).toBeTruthy();
  });
  it("requires at least one worker and planned work", () => {
    const errors = validateEntryPlan({ disposition: "working", expectedWorkerCount: 0, ratePerWorker: 400 });
    expect(errors.expectedWorkerCount).toBeTruthy();
    expect(errors.workPlanned).toBeTruthy();
  });
  it("requires a reason for no-work and detail for other", () => {
    expect(validateEntryPlan({ disposition: "no_work" }).noWorkReason).toBeTruthy();
    expect(validateEntryPlan({ disposition: "no_work", noWorkReason: "other" }).reasonDetail).toBeTruthy();
    expect(validateEntryPlan({ disposition: "no_work", noWorkReason: "rain" })).toEqual({});
  });
  it("rejects negative planning amounts", () => {
    const errors = validateEntryPlan({
      disposition: "no_work", noWorkReason: "rain", fundsAvailable: -1,
    });
    expect(errors.fundsAvailable).toBeTruthy();
  });
});

describe("compliance summary", () => {
  const rows = [
    { due: true, complianceStatus: "missing", projectId: "a", projectName: "A" },
    { due: true, complianceStatus: "entry_late", projectId: "b", projectName: "B" },
    { due: true, complianceStatus: "entry_present", projectId: "c", projectName: "C" },
    { due: true, complianceStatus: "waived", projectId: "d", projectName: "D" },
    { due: false, complianceStatus: "entry_present", projectId: "e", projectName: "E" },
    { due: false, complianceStatus: "not_due", projectId: "f", projectName: "F" },
  ];
  it("counts due, missing, late, waived and voluntary", () => {
    const summary = summarizeCompliance(rows);
    expect(summary.due).toBe(4);
    expect(summary.missing).toBe(1);
    expect(summary.late).toBe(1);
    expect(summary.waived).toBe(1);
    expect(summary.voluntary).toBe(1);
    expect(summary.missingProjects.map((row) => row.projectId)).toEqual(["a"]);
    expect(summary.allComplete).toBe(false);
  });
  it("reports all-complete when nothing is missing", () => {
    const summary = summarizeCompliance([
      { due: true, complianceStatus: "entry_present" },
      { due: true, complianceStatus: "waived" },
    ]);
    expect(summary.allComplete).toBe(true);
  });
});
