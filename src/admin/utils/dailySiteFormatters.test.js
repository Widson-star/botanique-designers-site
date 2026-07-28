import { describe, expect, it } from "vitest";
import {
  dispositionSummary,
  formatKes,
  mapComplianceRow,
  mapDailySiteEntry,
  todayIso,
} from "./dailySiteFormatters";

describe("KES formatting", () => {
  it("groups thousands and omits decimals for whole amounts", () => {
    expect(formatKes(4000)).toBe("KES 4,000");
    expect(formatKes(1250.5)).toBe("KES 1,250.50");
  });
  it("renders an em dash for empty values", () => {
    expect(formatKes(null)).toBe("—");
    expect(formatKes("")).toBe("—");
  });
});

describe("entry mapping", () => {
  it("maps snake_case rows to a camelCase entry without leaking raw payloads", () => {
    const entry = mapDailySiteEntry({
      id: "e1", project_id: "p1", work_date: "2026-07-28", disposition: "working",
      expected_worker_count: 6, rate_per_worker: 400, planned_labour_cost: 2400,
      state: "submitted", version: 1, is_late: true,
    });
    expect(entry).toMatchObject({
      id: "e1", projectId: "p1", workDate: "2026-07-28", disposition: "working",
      expectedWorkerCount: 6, plannedLabourCost: 2400, state: "submitted", isLate: true,
    });
  });

  it("summarises disposition in plain language", () => {
    expect(dispositionSummary({ disposition: "working", expectedWorkerCount: 1 })).toBe("1 worker planned");
    expect(dispositionSummary({ disposition: "working", expectedWorkerCount: 4 })).toBe("4 workers planned");
    expect(dispositionSummary({ disposition: "no_work", noWorkReason: "rain" })).toBe("Rain");
  });
});

describe("compliance row mapping", () => {
  it("maps a compliance row", () => {
    const row = mapComplianceRow({
      project_id: "p1", project_name: "Karen", work_date: "2026-07-28",
      is_weekend: false, due: true, compliance_status: "missing",
    });
    expect(row).toMatchObject({ projectId: "p1", projectName: "Karen", due: true, complianceStatus: "missing" });
  });
});

describe("todayIso", () => {
  it("returns an ISO date string", () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
