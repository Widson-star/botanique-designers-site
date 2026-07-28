import { describe, it, expect } from "vitest";
import {
  calculateDashboardMetrics,
  calculateAttentionSummary,
  applyProjectView,
  isOpenOperationalProject,
  operationalSummary,
  overdueActionProjects,
  projectAttentionReasons,
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
    expect(m.designOnly).toBe(0);
    // Overdue = open operational, has next action, date < today.
    // Row 0 (2026-07-01) and row 2 (2026-06-01). Row 4 is Completed; row 5 archived.
    expect(m.overdueActions).toBe(2);
    // Upcoming starts = non-archived Pending with start >= today = row 2 only.
    expect(m.upcomingStarts).toBe(1);
    expect(m.pendingActivation).toBe(2);
  });

  it("excludes archived, closed and design-only projects from overdue actions", () => {
    const overdue = overdueActionProjects(
      [
        ...projects,
        {
          status: "Cancelled",
          archived: false,
          nextAction: "Old",
          nextActionDate: "2026-01-01",
        },
        {
          status: "Design-only",
          archived: false,
          nextAction: "Old",
          nextActionDate: "2026-01-01",
        },
      ],
      TODAY
    );
    expect(overdue.every((p) => !p.archived)).toBe(true);
    expect(overdue.some((p) => p.status === "Completed")).toBe(false);
    expect(overdue.some((p) => p.status === "Cancelled")).toBe(false);
    expect(overdue.some((p) => p.status === "Design-only")).toBe(false);
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

describe("operational summary and attention", () => {
  it("generates a live operational narrative from exact metrics", () => {
    const summary = operationalSummary(projects, { today: TODAY });
    expect(summary.overview).toBe(
      "6 projects in the portfolio. 2 are active, 2 are pending activation and 1 is completed."
    );
    expect(summary.attention).toContain("2 are awaiting activation");
    expect(summary.attention).toContain("2 have an overdue action");
  });

  it("does not fabricate a summary when no project data exists", () => {
    expect(operationalSummary([], { today: TODAY })).toBeNull();
    expect(calculateAttentionSummary([], TODAY)).toEqual({
      pendingProjects: 0,
      withoutLead: 0,
      withoutNextAction: 0,
      withBlockers: 0,
      overdueActions: 0,
      upcomingStarts: 0,
    });
  });

  it("classifies attention only from explicit project fields", () => {
    const reasons = projectAttentionReasons(
      {
        status: "Pending",
        archived: false,
        leadPersonId: "",
        nextAction: "Confirm mobilisation",
        nextActionDate: "2026-07-01",
        startDate: "2026-08-01",
        blocker: "Client brief missing",
      },
      TODAY
    );
    expect(reasons).toEqual([
      "Pending activation",
      "Overdue next action",
      "Blocker: Client brief missing",
      "Accountable lead missing",
      "Upcoming start: 2026-08-01",
    ]);
  });

  it.each(["Completed", "Cancelled", "Design-only"])(
    "gives a non-operational %s project zero attention reasons",
    (status) => {
      expect(
        projectAttentionReasons(
          {
            status,
            archived: false,
            leadPersonId: "",
            nextAction: "",
            blocker: "Historical blocker",
          },
          TODAY
        )
      ).toEqual([]);
    }
  );

  it("gives an archived project zero attention reasons", () => {
    expect(
      projectAttentionReasons(
        {
          status: "Ongoing",
          archived: true,
          leadPersonId: "",
          nextAction: "",
          blocker: "Archived blocker",
        },
        TODAY
      )
    ).toEqual([]);
  });

  it("keeps deterministic owner reasons for an open Pending project", () => {
    const pending = {
      status: "Pending",
      archived: false,
      leadPersonId: "",
      nextAction: "",
      blocker: "",
    };
    expect(projectAttentionReasons(pending, TODAY)).toEqual([
      "Pending activation",
      "Accountable lead missing",
      "Next action missing",
    ]);
    expect(isOpenOperationalProject(pending)).toBe(true);
  });

  it("omits Pending activation from manager attention reasons", () => {
    expect(
      projectAttentionReasons(
        {
          status: "Pending",
          archived: false,
          leadPersonId: "",
          nextAction: "",
          blocker: "",
        },
        TODAY,
        { includePendingActivation: false }
      )
    ).toEqual(["Accountable lead missing", "Next action missing"]);
  });

  it("uses role-aware Pending wording in operational summaries", () => {
    const owner = operationalSummary(projects, {
      today: TODAY,
      includePendingActivation: true,
    });
    const manager = operationalSummary(projects, {
      today: TODAY,
      includePendingActivation: false,
    });

    expect(owner.overview).toContain("2 are pending activation");
    expect(owner.attention).toContain("2 are awaiting activation");
    expect(manager.overview).toContain("2 are pending");
    expect(`${manager.overview} ${manager.attention}`).not.toMatch(/activation/i);
  });

  it("omits zero-value categories and uses the calm no-attention sentence", () => {
    const summary = operationalSummary(
      [
        {
          status: "Completed",
          archived: false,
          leadPersonId: "",
          nextAction: "",
          blocker: "",
        },
      ],
      { today: TODAY }
    );
    expect(summary.overview).toBe(
      "1 project in the portfolio. 1 is completed."
    );
    expect(summary.overview).not.toContain("0");
    expect(summary.attention).toBe(
      "There are currently no overdue actions or upcoming starts."
    );
  });

  it("excludes closed, design-only and archived records from attention counts", () => {
    const rows = [
      {
        status: "Pending",
        archived: false,
        leadPersonId: "",
        nextAction: "",
        blocker: "Open blocker",
      },
      {
        status: "Completed",
        archived: false,
        leadPersonId: "",
        nextAction: "",
        blocker: "Closed blocker",
      },
      {
        status: "Cancelled",
        archived: false,
        leadPersonId: "",
        nextAction: "",
        blocker: "Cancelled blocker",
      },
      {
        status: "Design-only",
        archived: false,
        leadPersonId: "",
        nextAction: "",
        blocker: "Design blocker",
      },
      {
        status: "Ongoing",
        archived: true,
        leadPersonId: "",
        nextAction: "",
        blocker: "Archived blocker",
      },
    ];

    expect(calculateAttentionSummary(rows, TODAY)).toEqual({
      pendingProjects: 1,
      withoutLead: 1,
      withoutNextAction: 1,
      withBlockers: 1,
      overdueActions: 0,
      upcomingStarts: 0,
    });
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
