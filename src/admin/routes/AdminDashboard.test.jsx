import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { DailySiteOperationsContext } from "../context/dailySiteOperations";
import { ATTENTION_PREVIEW_LIMIT } from "../components/ProjectAttentionList";
import { DUE_TODAY_PREVIEW_LIMIT } from "../components/dailysite/MorningComplianceCard";
import AdminDashboard from "./AdminDashboard";

function renderDashboard({
  role,
  projects = [],
  fetchActivities = vi.fn(() => new Promise(() => {})),
  compliance = [],
}) {
  const value = {
    role,
    projects,
    profilesById: {},
    dataStatus: "ready",
    dataError: "",
    fetchActivities,
  };
  const dailySite = {
    compliance,
    status: "ready",
    createWaiver: vi.fn(() => Promise.resolve({ ok: true })),
    refresh: vi.fn(() => Promise.resolve({ ok: true })),
  };
  return render(
    <MemoryRouter>
      <AdminDataContext.Provider value={value}>
        <DailySiteOperationsContext.Provider value={dailySite}>
          <AdminDashboard />
        </DailySiteOperationsContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
}

const projects = [
  {
    id: "1",
    status: "Pending",
    stage: "Inquiry",
    projectType: "Residential",
    archived: false,
    projectName: "P1",
    targetCompletionDate: "",
    leadPersonId: "",
    leadPersonName: "Not assigned",
    portfolioPermissionStatus: "Not Reviewed",
    nextAction: "",
    nextActionDate: "",
    startDate: "",
    blocker: "",
  },
];

describe("AdminDashboard composition", () => {
  it("shows pending activation control to the owner", () => {
    renderDashboard({ role: "owner", projects });
    expect(screen.getByRole("link", { name: "Open to activate" })).toBeInTheDocument();
  });

  it("keeps owner activation authority hidden from the manager", () => {
    renderDashboard({ role: "manager", projects });
    expect(screen.queryByRole("link", { name: "Open to activate" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit" })).toBeInTheDocument();
  });

  it("renders empty summaries without fabricated project figures", () => {
    renderDashboard({ role: "owner", projects: [] });
    expect(
      screen.getByText("No project data is available yet.")
    ).toBeInTheDocument();
    expect(screen.getAllByText("No data yet").length).toBeGreaterThan(0);
  });

  // BD-DASHBOARD-01: the header used to carry a generated paragraph that
  // restated, in prose, the KPI strip printed directly beneath it. The
  // authority screen allows the page one SHORT supporting line, so the
  // paragraph is gone and the KPI card is the single place a count is stated.
  it("keeps the header to one short line instead of restating the KPI counts in prose", () => {
    renderDashboard({ role: "owner", projects });
    expect(
      screen.getByText("Here's what's happening across the projects you can see.")
    ).toBeInTheDocument();
    expect(screen.queryByText(/project in the portfolio/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/is awaiting activation/i)).not.toBeInTheDocument();
  });

  // The explanatory card that only said "filters filter" is not on the
  // authority screen and carried no user value. It must not come back.
  it("does not render the Portfolio notes explainer card", () => {
    renderDashboard({ role: "owner", projects });
    expect(screen.queryByRole("heading", { name: "Portfolio notes" })).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Metrics and charts use only the project records/i)
    ).not.toBeInTheDocument();
  });

  it("uses ordinary Pending-project language for the manager summary", () => {
    renderDashboard({ role: "manager", projects });
    expect(screen.getAllByText(/Pending projects/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/activation/i)).not.toBeInTheDocument();
  });

  it("renders real accessible status, stage and type visualisations with filter links", () => {
    renderDashboard({ role: "owner", projects });
    expect(
      screen.getByRole("img", { name: /Project status doughnut chart/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Project stage column chart/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Project types" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^Pending 1$/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /Inquiry: 1 projects/i })).toHaveAttribute(
      "href",
      "/admin/projects?stage=Inquiry"
    );
  });

  // A two-word stage label now WRAPS onto a second line rather than being
  // truncated or overprinting its neighbour. The whole label must still be
  // present — wrapping is a layout change, never a loss of text.
  it("fully exposes a Concept Design chart label across its wrapped lines", () => {
    const { container } = renderDashboard({
      role: "owner",
      projects: [{ ...projects[0], stage: "Concept Design" }],
    });
    expect(
      screen.getByRole("link", { name: /Concept Design: 1 projects/i })
    ).toHaveAttribute("href", "/admin/projects?stage=Concept%20Design");

    const stageSvg = container.querySelector("#stage-column-title").closest("svg");
    const labelText = [...stageSvg.querySelectorAll("text")]
      .map((node) => node.textContent)
      .join(" ");
    expect(labelText).toContain("Concept Design");
    expect(labelText).not.toMatch(/…|\.\.\./);
  });

  it("renders one integrated management metrics rail without card ribbons", () => {
    renderDashboard({ role: "owner", projects });
    const rail = screen.getByRole("group", { name: "Management metrics" });
    const regions = rail.querySelectorAll("[data-metric-region]");

    expect(regions).toHaveLength(4);
    expect(rail).toHaveClass("grid-cols-2", "lg:grid-cols-4");
    expect(rail).toHaveClass("border", "border-stone-200");
    regions.forEach((region) => {
      expect(region).not.toHaveClass("border-l-4");
      expect(region).not.toHaveClass("shadow");
    });
  });

  it("keeps zero metrics neutral and gives non-zero activation restrained emphasis", () => {
    renderDashboard({ role: "owner", projects });
    const overdueRegion = screen.getByText("Overdue actions").closest("[data-metric-region]");
    const pendingRegion = screen.getByText("Pending activation").closest("[data-metric-region]");

    expect(overdueRegion).toHaveAttribute("data-attention", "false");
    expect(overdueRegion.querySelector("[data-attention-indicator]")).toBeNull();
    expect(pendingRegion).toHaveAttribute("data-attention", "true");
    expect(pendingRegion.querySelector("[data-attention-indicator]")).toBeInTheDocument();
    expect(pendingRegion).not.toHaveClass("border-amber-300", "bg-amber-50");
  });

  it("preserves visible keyboard focus on every metrics drill-down", () => {
    renderDashboard({ role: "owner", projects });
    const rail = screen.getByRole("group", { name: "Management metrics" });
    within(rail).getAllByRole("link").forEach((link) => {
      expect(link).toHaveClass("focus-visible:ring-2");
    });
  });

  it("uses a compact row for an empty attention queue", () => {
    renderDashboard({
      role: "owner",
      projects: [
        {
          ...projects[0],
          status: "Completed",
          stage: "Completed",
          leadPersonId: "",
          nextAction: "",
        },
      ],
    });
    expect(screen.getByText("No projects need attention.")).toHaveClass("pb-4");
  });

  it("links each derived KPI to its exact named project view", () => {
    renderDashboard({ role: "owner", projects });
    const indicators = screen.getByRole("region", {
      name: "Primary project indicators",
    });
    expect(within(indicators).getByText("Active projects").closest("a")).toHaveAttribute(
      "href",
      "/admin/projects?view=active"
    );
    expect(within(indicators).getByText("Pending activation").closest("a")).toHaveAttribute(
      "href",
      "/admin/projects?view=pending-activation"
    );
    expect(within(indicators).getByText("Overdue actions").closest("a")).toHaveAttribute(
      "href",
      "/admin/projects?view=overdue-actions"
    );
    expect(within(indicators).getByText("Upcoming starts").closest("a")).toHaveAttribute(
      "href",
      "/admin/projects?view=upcoming-starts"
    );
  });

  it("retains one four-region semantic group for the mobile 2-by-2 layout", () => {
    renderDashboard({ role: "owner", projects });
    const rail = screen.getByRole("group", { name: "Management metrics" });
    expect(within(rail).getAllByRole("link")).toHaveLength(4);
    expect(rail).toHaveClass("grid-cols-2");
    expect(rail.querySelectorAll("[data-metric-region]")).toHaveLength(4);
  });

  it("shows the exact recent-activity empty state", async () => {
    renderDashboard({
      role: "owner",
      projects,
      fetchActivities: vi.fn().mockResolvedValue([]),
    });
    expect(
      await screen.findByText("No activity recorded yet.")
    ).toBeInTheDocument();
  });

  it("renders recent activity with readable actor, project and changes", async () => {
    const fetchActivities = vi.fn().mockResolvedValue([
      {
        id: "activity-1",
        action: "updated",
        actor_id: null,
        occurred_at: "2026-07-27T10:00:00Z",
        changed_fields: ["next_action"],
        previous_values: { next_action: "Survey" },
        new_values: { next_action: "Mobilise" },
        reason: null,
      },
    ]);
    renderDashboard({ role: "owner", projects, fetchActivities });
    expect(await screen.findByText("Project updated")).toBeInTheDocument();
    expect(screen.getByText(/System/)).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: "P1" })
        .some((link) => link.getAttribute("href") === "/admin/projects/1?tab=activity")
    ).toBe(true);
    expect(screen.getByText(/Next action: Survey → Mobilise/)).toBeInTheDocument();
    expect(screen.queryByText("activity-1")).not.toBeInTheDocument();
  });

  it("removes the dominant Simple Invoice dashboard card and finance detail", async () => {
    renderDashboard({
      role: "owner",
      projects,
      fetchActivities: vi.fn().mockResolvedValue([]),
    });
    await waitFor(() =>
      expect(screen.getByText("No activity recorded yet.")).toBeInTheDocument()
    );
    expect(screen.queryByText("Simple Invoice boundary")).not.toBeInTheDocument();
    expect(screen.queryByText(/estimate|invoice number|payment/i)).not.toBeInTheDocument();
  });

  it("hides New project from staff and viewer roles", () => {
    const { rerender } = renderDashboard({ role: "staff", projects });
    expect(screen.queryByRole("link", { name: "New project" })).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <AdminDataContext.Provider
          value={{
            role: "viewer",
            projects,
            profilesById: {},
            dataStatus: "ready",
            dataError: "",
            fetchActivities: vi.fn(() => new Promise(() => {})),
          }}
        >
          <AdminDashboard />
        </AdminDataContext.Provider>
      </MemoryRouter>
    );
    expect(screen.queryByRole("link", { name: "New project" })).not.toBeInTheDocument();
  });
});

// BD-DASHBOARD-01 — alignment with
// `docs/ui-authority/operations-hub/01-dashboard-authority.png`.
//
// The production defect these guard against: `StageColumnChart` carried a hard
// 620px floor that its `overflow-x-auto` wrapper could not contain, because a
// grid item defaults to `min-width: auto`. The floor escaped into the shared
// grid and pushed the whole page to 657px inside a 400px viewport — dragging
// the Project status card out with it. jsdom does not lay out, so these tests
// assert the CAUSE (no fixed width may re-enter the markup) rather than a
// measured width; the measured proof is recorded in the authority record.
describe("AdminDashboard authority composition", () => {
  const denseProjects = [
    "Inquiry",
    "Concept Design",
    "Awaiting Approval",
    "Implementation",
    "Completed",
  ].map((stage, index) => ({
    ...projects[0],
    id: `dense-${index}`,
    projectName: `Dense project ${index}`,
    stage,
  }));

  function stageSvg(container) {
    return container.querySelector("#stage-column-title").closest("svg");
  }

  it("gives the stage chart no fixed pixel width, so it resizes instead of clipping", () => {
    const { container } = renderDashboard({ role: "owner", projects: denseProjects });
    const svg = stageSvg(container);

    expect(svg.getAttribute("class")).not.toMatch(/min-w-\[|w-\[\d/);
    expect(svg.getAttribute("width")).toBeNull();
    expect(svg.getAttribute("viewBox")).toBe("0 0 360 196");
    expect(svg.getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");
    expect(svg.getAttribute("class")).toContain("w-full");
  });

  it("leaves no horizontal scroll container or fixed-width element in the visual row", () => {
    const { container } = renderDashboard({ role: "owner", projects: denseProjects });
    const visualRow = container.querySelector("[data-dashboard-visual-cards]");

    expect(visualRow.querySelector(".overflow-x-auto")).toBeNull();
    visualRow.querySelectorAll("*").forEach((node) => {
      const className = node.getAttribute("class") || "";
      expect(className).not.toMatch(/(^|\s)(min-)?w-\[\d+px\]/);
    });
  });

  it("lets every visual card shrink below its content width", () => {
    const { container } = renderDashboard({ role: "owner", projects: denseProjects });
    const cards = container.querySelectorAll("[data-dashboard-visual-cards] > *");

    expect(cards).toHaveLength(3);
    cards.forEach((card) => expect(card.getAttribute("class")).toContain("min-w-0"));
  });

  it("wraps a long stage label onto its own lines rather than clipping it", () => {
    const { container } = renderDashboard({ role: "owner", projects: denseProjects });
    const lines = [...stageSvg(container).querySelectorAll("text")].map(
      (node) => node.textContent
    );

    expect(lines).toEqual(expect.arrayContaining(["Awaiting", "Approval"]));
    expect(lines).toEqual(expect.arrayContaining(["Concept", "Design"]));
    lines.forEach((line) => expect(line).not.toMatch(/…/));
  });

  it("keeps every status legend row on one line with its count reachable", () => {
    const { container } = renderDashboard({ role: "owner", projects: denseProjects });
    const legend = container.querySelector("#status-chart-title").closest("section");

    legend.querySelectorAll("li a").forEach((link) => {
      expect(link.getAttribute("class")).toContain("min-w-0");
      expect(link.querySelector("strong").getAttribute("class")).toContain("shrink-0");
    });
  });

  it("keeps the project types strip wrapping rather than forcing one wide row", () => {
    const { container } = renderDashboard({ role: "owner", projects: denseProjects });
    const strip = container.querySelector("#type-summary-title").closest("section");

    expect(strip.getAttribute("class")).toContain("flex-wrap");
    expect(strip.querySelector("ul").getAttribute("class")).toContain("flex-wrap");
  });

  it("pairs the two action panels in one row and keeps each concise", () => {
    const many = Array.from({ length: 9 }, (_, index) => ({
      ...projects[0],
      id: `attention-${index}`,
      projectName: `Attention project ${index}`,
    }));
    const { container } = renderDashboard({
      role: "owner",
      projects: many,
      compliance: [{ due: true, complianceStatus: "entry_present" }],
    });

    const panels = container.querySelector("[data-dashboard-action-panels]");
    expect(panels.getAttribute("class")).toContain("lg:grid-cols-2");
    expect(panels.children).toHaveLength(2);

    // Nine flagged projects, but the panel stays a short queue with a way out.
    const attention = screen.getByRole("region", { name: "Projects needing attention" });
    expect(within(attention).getAllByRole("listitem")).toHaveLength(
      ATTENTION_PREVIEW_LIMIT
    );
    expect(within(attention).getByRole("link", { name: "View all" })).toHaveAttribute(
      "href",
      "/admin/projects"
    );
    expect(within(attention).getByText("9")).toBeInTheDocument();
  });

  it("keeps Due today short and pointing at the real Daily site destination", () => {
    const compliance = Array.from({ length: 7 }, (_, index) => ({
      projectId: `p${index}`,
      projectName: `Missing project ${index}`,
      due: true,
      complianceStatus: "missing",
    }));
    renderDashboard({ role: "owner", projects, compliance });

    const dueToday = screen.getByRole("region", { name: "Due today" });
    expect(within(dueToday).getAllByRole("listitem")).toHaveLength(DUE_TODAY_PREVIEW_LIMIT);
    expect(within(dueToday).getByRole("link", { name: "View all" })).toHaveAttribute(
      "href",
      "/admin/daily-site-operations"
    );
  });

  it("keeps the portfolio totals inside the metrics card", () => {
    const { container } = renderDashboard({ role: "owner", projects });
    const indicators = screen.getByRole("region", { name: "Primary project indicators" });

    expect(within(indicators).getByLabelText("Portfolio totals")).toBeInTheDocument();
    // One continuous surface: the rail's bottom corners meet the totals strip.
    expect(
      container.querySelector('[role="group"][aria-label="Management metrics"]')
        .getAttribute("class")
    ).toContain("rounded-t-lg");
  });

  it("introduces no metric or destination the system cannot deliver", () => {
    const { container } = renderDashboard({ role: "owner", projects });

    // Every link resolves to a route that exists today. In particular the
    // authority screen's "View full report" links are NOT reproduced, because
    // the Reports Centre they imply is not built.
    expect(screen.queryByText(/View full report|View stage report/i)).not.toBeInTheDocument();
    container.querySelectorAll("a[href]").forEach((link) => {
      expect(link.getAttribute("href")).toMatch(
        /^\/admin\/(projects|daily-site-operations)/
      );
    });
  });

  it("shows only zero-safe counts when the role can see nothing", () => {
    renderDashboard({ role: "viewer", projects: [] });

    expect(screen.getByText("No project data is available yet.")).toBeInTheDocument();
    const indicators = screen.getByRole("region", { name: "Primary project indicators" });
    expect(within(indicators).getAllByText("0").length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "New project" })).not.toBeInTheDocument();
  });
});
