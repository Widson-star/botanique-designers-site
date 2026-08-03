import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { DailySiteOperationsContext } from "../context/dailySiteOperations";
import {
  ATTENTION_PREVIEW_LIMIT,
  ATTENTION_TAG_LIMIT,
} from "../components/ProjectAttentionList";
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
  // The control is now labelled "Activate" rather than "Open to activate": the
  // row already opens the project, so the longer label repeated that and made
  // the button the heaviest element in a panel meant to be scanned.
  it("shows pending activation control to the owner", () => {
    renderDashboard({ role: "owner", projects });
    expect(screen.getByRole("link", { name: "Activate" })).toBeInTheDocument();
  });

  it("keeps owner activation authority hidden from the manager", () => {
    renderDashboard({ role: "manager", projects });
    expect(screen.queryByRole("link", { name: "Activate" })).not.toBeInTheDocument();
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

  // Emphasis is carried by the icon tile ALONE. Previously a flagged metric
  // coloured the tile, the figure and a dot — three signals for one fact, which
  // made a count of 1 shout as loudly as a blocked project.
  it("keeps zero metrics neutral and gives non-zero activation restrained emphasis", () => {
    renderDashboard({ role: "owner", projects });
    // Scoped: "Pending activation" is also a legitimate attention tag.
    const indicators = screen.getByRole("region", { name: "Primary project indicators" });
    const overdueRegion = within(indicators)
      .getByText(/Overdue actions/)
      .closest("[data-metric-region]");
    const pendingRegion = within(indicators)
      .getByText(/Pending activation/)
      .closest("[data-metric-region]");

    expect(overdueRegion).toHaveAttribute("data-attention", "false");
    expect(overdueRegion.querySelector("[data-attention-indicator]")).toBeNull();
    expect(pendingRegion).toHaveAttribute("data-attention", "true");
    expect(pendingRegion.querySelector("[data-attention-indicator]")).toBeInTheDocument();
    expect(pendingRegion).not.toHaveClass("border-amber-300", "bg-amber-50");
  });

  it("carries metric emphasis on the icon tile only, never on the figure", () => {
    renderDashboard({ role: "owner", projects });
    const indicators = screen.getByRole("region", { name: "Primary project indicators" });
    const pendingRegion = within(indicators)
      .getByText(/Pending activation/)
      .closest("[data-metric-region]");
    const figure = pendingRegion.querySelectorAll("p")[1];

    // The number stays charcoal at every tone.
    expect(figure.getAttribute("class")).toContain("text-botanique-charcoal");
    expect(figure.getAttribute("class")).not.toMatch(/text-(red|amber)-/);
    // Exactly one marker, and it is the tile.
    expect(pendingRegion.querySelectorAll("[data-attention-indicator]")).toHaveLength(1);
    expect(
      pendingRegion.querySelector("[data-attention-indicator]").getAttribute("class")
    ).toContain("h-9");
  });

  // The tile is the only visual marker, so hiding it below `sm` would conceal
  // status on a phone — the device this Dashboard is reviewed on.
  it("never hides the attention tile at small widths", () => {
    renderDashboard({ role: "owner", projects });
    const indicators = screen.getByRole("region", { name: "Primary project indicators" });
    const pendingRegion = within(indicators)
      .getByText(/Pending activation/)
      .closest("[data-metric-region]");
    const tile = pendingRegion.querySelector("[data-attention-indicator]");

    expect(tile.getAttribute("class")).not.toMatch(/(^|\s)hidden(\s|$)/);
  });

  it("states an attention metric in text, not colour alone", () => {
    renderDashboard({ role: "owner", projects });
    expect(screen.getByText("— needs attention")).toBeInTheDocument();
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

// BD-DASHBOARD-01 refinement pass — visual authority, second review.
//
// The Founder accepted the structure and rejected the presentation: attention
// rows read as a long red paragraph of raw system state, and red was doing too
// many jobs at once. These pin the corrected treatment.
describe("AdminDashboard attention-row restraint", () => {
  // A project carrying every condition at once. This is the row that used to
  // render as one joined red sentence. The demo seed adapter hard-codes
  // `blocker: ""`, so the blocker path CANNOT be exercised in the local
  // preview — it is only ever proven here.
  const loadedProject = {
    ...projects[0],
    id: "loaded",
    projectName: "Lugulu Residential Home",
    status: "Pending",
    stage: "Awaiting Approval",
    leadPersonId: "",
    leadPersonName: "Not assigned",
    nextAction: "Confirm murram delivery",
    nextActionDate: "2020-01-01",
    startDate: "2099-01-01",
    blocker: "Sourcing of murram for the parking area",
  };

  function attentionRow() {
    const panel = screen.getByRole("region", { name: "Projects needing attention" });
    return within(panel).getAllByRole("listitem")[0];
  }

  it("speaks only the most severe condition in colour", () => {
    renderDashboard({ role: "owner", projects: [loadedProject] });
    const row = attentionRow();
    const primaries = row.querySelectorAll("[data-attention-primary]");

    expect(primaries).toHaveLength(1);
    // A blocker outranks an overdue action, a missing lead and an activation.
    expect(primaries[0].textContent).toMatch(/^Blocker: Sourcing of murram/);
    expect(primaries[0].getAttribute("class")).toContain("text-red-700");
  });

  it("demotes every other condition to a neutral tag or a count", () => {
    renderDashboard({ role: "owner", projects: [loadedProject] });
    const row = attentionRow();

    row.querySelectorAll("[data-attention-tag]").forEach((tag) => {
      expect(tag.getAttribute("class")).toContain("text-gray-500");
      expect(tag.getAttribute("class")).not.toMatch(/text-(red|amber)-/);
    });
    // Nothing beyond the primary is allowed to be red or amber.
    expect(row.querySelectorAll(".text-red-700")).toHaveLength(1);
  });

  it("caps the tags and counts the remainder rather than wrapping a third line", () => {
    renderDashboard({ role: "owner", projects: [loadedProject] });
    const row = attentionRow();

    expect(row.querySelectorAll("[data-attention-tag]").length).toBeLessThanOrEqual(
      ATTENTION_TAG_LIMIT
    );
    // Blocker + overdue + no lead + activation + upcoming start = 5 conditions,
    // so one primary, two tags and a "+2".
    expect(row.querySelector("[data-attention-overflow]").textContent).toBe("+2");
  });

  it("never renders the whole condition set as one long coloured sentence", () => {
    renderDashboard({ role: "owner", projects: [loadedProject] });
    const primary = attentionRow().querySelector("[data-attention-primary]");

    expect(primary.textContent.length).toBeLessThanOrEqual(64);
    expect(primary.textContent).not.toContain("Accountable lead missing");
    expect(primary.textContent).not.toContain("Pending activation");
  });

  it("still exposes every condition to assistive technology", () => {
    renderDashboard({ role: "owner", projects: [loadedProject] });
    const row = attentionRow();
    const spoken = row.querySelector(".sr-only").textContent;

    ["Pending activation", "Overdue next action", "Blocker: Sourcing of murram for the parking area", "Accountable lead missing"].forEach(
      (condition) => expect(spoken).toContain(condition)
    );
  });

  it("tones the row dot down to amber when nothing urgent is true", () => {
    renderDashboard({
      role: "owner",
      projects: [
        {
          ...projects[0],
          id: "calm",
          nextAction: "Draft the concept",
          nextActionDate: "2099-01-01",
          blocker: "",
        },
      ],
    });
    const dot = attentionRow().querySelector("span[aria-hidden]");

    expect(dot.getAttribute("class")).toContain("bg-amber-500");
    expect(dot.getAttribute("class")).not.toContain("bg-red-500");
  });

  it("keeps the row action quiet rather than a filled button", () => {
    renderDashboard({ role: "owner", projects: [loadedProject] });
    const action = within(attentionRow()).getByRole("link", { name: "Activate" });

    expect(action.getAttribute("class")).toContain("border-stone-200");
    expect(action.getAttribute("class")).not.toContain("bg-botanique-green");
  });
});

describe("AdminDashboard Due today restraint", () => {
  const missing = [
    { projectId: "p1", projectName: "Lugulu", due: true, complianceStatus: "missing" },
  ];

  it("leaves Record as the single primary action and demotes Waive to a link", () => {
    renderDashboard({ role: "owner", projects, compliance: missing });
    const panel = screen.getByRole("region", { name: "Due today" });

    const record = within(panel).getByRole("link", { name: "Record" });
    const waive = within(panel).getByRole("button", { name: "Waive" });
    expect(record.getAttribute("class")).toContain("border-stone-200");
    // A quiet text control: no border, no fill.
    expect(waive.getAttribute("class")).not.toMatch(/border|bg-/);
  });

  // Waive was DEMOTED, never removed. This card is the only waive entry point
  // in the application, so losing it would remove an owner capability.
  it("keeps the owner waive route present, and still withholds it from the manager", () => {
    const { unmount } = renderDashboard({ role: "owner", projects, compliance: missing });
    expect(screen.getByRole("button", { name: "Waive" })).toBeInTheDocument();
    unmount();

    renderDashboard({ role: "manager", projects, compliance: missing });
    expect(screen.queryByRole("button", { name: "Waive" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Record" })).toBeInTheDocument();
  });

  it("uses a neutral heading count, leaving red to the rows themselves", () => {
    renderDashboard({ role: "owner", projects, compliance: missing });
    const badge = screen
      .getByRole("region", { name: "Due today" })
      .querySelector("[data-due-today-count]");

    expect(badge.getAttribute("class")).toContain("text-gray-600");
    expect(badge.getAttribute("class")).not.toMatch(/text-red-|bg-red-/);
  });
});

describe("AdminDashboard snapshot limits", () => {
  it("keeps Recent activity to a three-event snapshot with no invented destination", async () => {
    const fetchActivities = vi.fn().mockResolvedValue(
      Array.from({ length: 8 }, (_, index) => ({
        id: `activity-${index}`,
        action: "updated",
        actor_id: null,
        occurred_at: `2026-07-${String(20 + index).padStart(2, "0")}T10:00:00Z`,
        changed_fields: ["next_action"],
        previous_values: { next_action: "A" },
        new_values: { next_action: "B" },
        reason: null,
      }))
    );
    renderDashboard({ role: "owner", projects, fetchActivities });

    const panel = screen.getByRole("region", { name: "Recent activity" });
    await waitFor(() => expect(within(panel).getAllByRole("listitem")).toHaveLength(3));
    expect(within(panel).queryByRole("link", { name: /view all/i })).not.toBeInTheDocument();
  });

  it("rolls the project-type tail into one Other total that still reconciles", () => {
    const many = [
      "Residential",
      "Residential",
      "Residential",
      "Hospitality",
      "Hospitality",
      "Estate",
      "Institutional",
      "Design Concept",
      "Commercial",
      "Public Realm",
    ].map((projectType, index) => ({
      ...projects[0],
      id: `type-${index}`,
      projectName: `Type project ${index}`,
      projectType,
    }));
    const { container } = renderDashboard({ role: "owner", projects: many });
    const strip = container.querySelector("#type-summary-title").closest("section");
    const entries = [...strip.querySelectorAll("li")];

    // Four leading types plus one Other.
    expect(entries).toHaveLength(5);
    expect(entries.at(-1).textContent).toContain("Other");
    const total = entries.reduce(
      (sum, li) => sum + Number(li.querySelector("strong").textContent),
      0
    );
    expect(total).toBe(many.length);
  });

  it("leaves a short project-type list untouched", () => {
    const { container } = renderDashboard({ role: "owner", projects });
    const strip = container.querySelector("#type-summary-title").closest("section");

    expect(strip.textContent).not.toContain("Other");
  });
});
