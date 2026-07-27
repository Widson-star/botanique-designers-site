import { describe, it, expect } from "vitest";
import {
  calculateDashboardMetrics,
  applyProjectView,
  overdueActionProjects,
  projectsByStatus,
  todayIsoDate,
  upcomingStartProjects,
} from "./dashboardMetrics";

const TODAY = "2026-07-27";

const projects = [
  { status: "Ongoing", archived: false, nextAction: "Do thing", nextActionDate: "2026-07-01", startDate: "" },
  { status: "Paused", archived: false, nextAction: "", nextActionDate: "", startDate: "" },
  { status: "Pending", archived: false, nextAction: "Plan", nextActionDate: "2026-06-01", startDate: "2026-08-01" },
  { status: "Pending", archived: false, nextAction: "", nextActionDate: "", startDate: "2026-07-10" },
  { status: "Completed", archived: false, nextAction: "Old", nextActionDate: "2026-01-01", startDate: "" },
  { status: "Ongoing", archived: true, nextAction: "Archived overdue", nextActionDate: "2026-01-01", startDate: "" },
];

describe("todayIsoDate", () => {
  it("formats a local date as YYYY-MM-DD without UTC shift", () => {
    // A local date near midnight must reflect the LOCAL calendar day.
    const d = new Date(2026, 6, 27, 1, 0, 0); // 27 Jul 2026, 01:00 local
    expect(todayIsoDate(d)).toBe("2026-07-27");
  });
});

describe("calculateDashboardMetrics", () => {
  it("computes the KPI definitions correctly", () => {
    const m = calculateDashboardMetrics(projects, TODAY);
    expect(m.total).toBe(6);
    // Active = non-archived Ongoing/Paused = rows 0 and 1.
    expect(m.active).toBe(2);
    // Pending (non-archived) = rows 2 and 3.
    expect(m.pending).toBe(2);
    expect(m.completed).toBe(1);
    // Overdue = non-archived, has next action, date < today, not Completed/Cancelled.
    // Row 0 (2026-07-01) and row 2 (2026-06-01). Row 4 is Completed; row 5 archived.
    expect(m.overdueActions).toBe(2);
    // Upcoming starts = non-archived Pending with start >= today = row 2 only.
    expect(m.upcomingStarts).toBe(1);
    expect(m.pendingActivation).toBe(2);
  });

  it("excludes archived and completed/cancelled from overdue actions", () => {
    const overdue = overdueActionProjects(projects, TODAY);
    expect(overdue.every((p) => !p.archived)).toBe(true);
    expect(overdue.some((p) => p.status === "Completed")).toBe(false);
  });

  it("does not count Pending as active", () => {
    const m = calculateDashboardMetrics(projects, TODAY);
    expect(m.active).toBe(2);
  });

  it("upcoming starts includes today", () => {
    const rows = upcomingStartProjects(
      [{ status: "Pending", archived: false, startDate: TODAY }],
      TODAY
    );
    expect(rows).toHaveLength(1);
  });

  it("uses the exact Active predicate for the active drill-down", () => {
    expect(applyProjectView(projects, "active", TODAY)).toHaveLength(
      calculateDashboardMetrics(projects, TODAY).active
    );
    expect(applyProjectView(projects, "active", TODAY).map((p) => p.status)).toEqual([
      "Ongoing",
      "Paused",
    ]);
  });

  it("uses the exact overdue-actions predicate for its drill-down", () => {
    expect(applyProjectView(projects, "overdue-actions", TODAY)).toEqual(
      overdueActionProjects(projects, TODAY)
    );
  });

  it("uses the exact upcoming-starts predicate for its drill-down", () => {
    expect(applyProjectView(projects, "upcoming-starts", TODAY)).toEqual(
      upcomingStartProjects(projects, TODAY)
    );
  });
});

describe("chart aggregations", () => {
  it("returns empty array for no data (renders 'No data yet')", () => {
    expect(projectsByStatus([])).toEqual([]);
  });

  it("counts by status in canonical order", () => {
    const rows = projectsByStatus(projects);
    const ongoing = rows.find((r) => r.label === "Ongoing");
    expect(ongoing.value).toBe(2);
  });
});
