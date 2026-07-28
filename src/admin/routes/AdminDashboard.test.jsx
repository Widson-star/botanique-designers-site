import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import AdminDashboard from "./AdminDashboard";

function renderDashboard({
  role,
  projects = [],
  fetchActivities = vi.fn(() => new Promise(() => {})),
}) {
  const value = {
    role,
    projects,
    profilesById: {},
    dataStatus: "ready",
    dataError: "",
    fetchActivities,
  };
  return render(
    <MemoryRouter>
      <AdminDataContext.Provider value={value}>
        <AdminDashboard />
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

  it("generates the operational summary from visible projects", () => {
    renderDashboard({ role: "owner", projects });
    const summary = screen.getByText(/1 project in the portfolio/);
    expect(summary).toHaveTextContent("1 is pending activation");
    expect(summary).toHaveTextContent("1 is awaiting activation");
    expect(summary).not.toHaveTextContent(/0 active|0 completed|0 upcoming/i);
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

  it("fully exposes a Concept Design chart label", () => {
    renderDashboard({
      role: "owner",
      projects: [{ ...projects[0], stage: "Concept Design" }],
    });
    expect(
      screen.getByRole("link", { name: /Concept Design: 1 projects/i })
    ).toHaveAttribute("href", "/admin/projects?stage=Concept%20Design");
    expect(screen.getByText("Concept Design")).toBeInTheDocument();
  });

  it("does not use attention styling for a zero metric", () => {
    renderDashboard({ role: "owner", projects });
    const overdueCard = screen.getByText("Overdue actions").closest("a");
    expect(overdueCard).not.toHaveClass("border-amber-300");
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
    expect(screen.getByText("No projects need attention.")).toHaveClass("py-3");
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
    expect(within(indicators).getByText("Overdue actions").closest("a")).toHaveAttribute(
      "href",
      "/admin/projects?view=overdue-actions"
    );
    expect(within(indicators).getByText("Upcoming starts").closest("a")).toHaveAttribute(
      "href",
      "/admin/projects?view=upcoming-starts"
    );
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
