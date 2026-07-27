import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import AdminProjects from "./AdminProjects";

const projects = [
  {
    id: "active",
    projectName: "Active Project",
    status: "Paused",
    stage: "Implementation",
    projectType: "Residential",
    archived: false,
    nextAction: "",
    nextActionDate: "",
    startDate: "",
    leadPersonId: "",
    leadPersonName: "Not assigned",
    portfolioPermissionStatus: "Not Reviewed",
  },
  {
    id: "upcoming",
    projectName: "Upcoming Project",
    status: "Pending",
    stage: "Inquiry",
    projectType: "Commercial",
    archived: false,
    nextAction: "Mobilise",
    nextActionDate: "2000-01-01",
    startDate: "2999-01-01",
    leadPersonId: "",
    leadPersonName: "Not assigned",
    portfolioPermissionStatus: "Not Reviewed",
  },
  {
    id: "archived",
    projectName: "Archived Pending",
    status: "Pending",
    stage: "Inquiry",
    projectType: "Residential",
    archived: true,
    nextAction: "",
    nextActionDate: "",
    startDate: "2999-01-01",
    leadPersonId: "",
    leadPersonName: "Not assigned",
    portfolioPermissionStatus: "Not Reviewed",
  },
];

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="location">{location.search}</output>;
}

function renderProjects(role, initialEntry = "/admin/projects", projectRows = projects) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AdminDataContext.Provider
        value={{
          role,
          projects: projectRows,
          profiles: [],
          currentUserId: "",
          dataStatus: "ready",
          dataError: "",
          fetchActivities: vi.fn(),
        }}
      >
        <AdminProjects />
        <LocationProbe />
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
}

describe("AdminProjects", () => {
  it("applies an exact derived view and can reset all URL filter state", () => {
    renderProjects(
      "owner",
      "/admin/projects?view=active&projectType=Residential"
    );
    expect(screen.getByText("Active Project")).toBeInTheDocument();
    expect(screen.queryByText("Upcoming Project")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(screen.getByLabelText("location")).toHaveTextContent("");
    expect(screen.getByText("Upcoming Project")).toBeInTheDocument();
  });

  it("keeps normal status, stage and type filters working", () => {
    renderProjects(
      "owner",
      "/admin/projects?status=Pending&stage=Inquiry&projectType=Commercial"
    );
    expect(screen.getByText("Upcoming Project")).toBeInTheDocument();
    expect(screen.queryByText("Active Project")).not.toBeInTheDocument();
    expect(screen.queryByText("Archived Pending")).not.toBeInTheDocument();
  });

  it.each(["staff", "viewer"])(
    "hides New project and Edit from %s",
    (role) => {
      renderProjects(role);
      expect(screen.queryByRole("link", { name: "New project" })).not.toBeInTheDocument();
      const row = screen.getByText("Active Project").closest("tr");
      expect(within(row).queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
    }
  );

  it("shows no Attention reasons for a completed non-operational project", () => {
    renderProjects("owner", "/admin/projects", [
      {
        id: "completed",
        projectName: "Completed Project",
        status: "Completed",
        stage: "Completed",
        projectType: "Residential",
        archived: false,
        nextAction: "",
        nextActionDate: "",
        startDate: "",
        leadPersonId: "",
        leadPersonName: "Not assigned",
        blocker: "Historical blocker",
        portfolioPermissionStatus: "Not Reviewed",
      },
    ]);

    const row = screen.getByText("Completed Project").closest("tr");
    expect(within(row).getByText("None")).toBeInTheDocument();
    expect(within(row).queryByText(/missing|blocker/i)).not.toBeInTheDocument();
  });
});
