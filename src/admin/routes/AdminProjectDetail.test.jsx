import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { AdminApprovalsContext } from "../context/adminApprovals";
import AdminProjectDetail from "./AdminProjectDetail";
import AdminProjectForm from "./AdminProjectForm";

const project = {
  id: "p1",
  projectName: "Karen Residence",
  clientSiteName: "Karen",
  status: "Ongoing",
  stage: "Implementation",
  projectType: "Residential",
  archived: false,
  leadPersonName: "Widson Omutelema Ambaisi",
  location: "Karen",
  county: "Nairobi",
  startDate: "",
  actualStartDate: "",
  targetCompletionDate: "",
  actualCompletionDate: "",
  updatedAt: "2026-07-27T10:00:00Z",
  notes: "",
  nextAction: "",
  nextActionDate: "",
  blocker: "",
  portfolioEligible: true,
  portfolioPermissionStatus: "Approved For Portfolio",
  accessGranted: true,
};

function renderRoute(role, entry, element, projectRows = [project]) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AdminDataContext.Provider
        value={{
          role,
          projects: projectRows,
          profiles: [],
          currentUserId: "",
          dataStatus: "ready",
          dataError: "",
          updateProject: vi.fn(),
          fetchActivities: vi.fn().mockResolvedValue([]),
        }}
      >
        <AdminApprovalsContext.Provider
          value={{ requests: [], submit: vi.fn() }}
        >
          <Routes>
            <Route path="/admin/projects/:id" element={element} />
            <Route path="/admin/projects/:id/edit" element={element} />
            <Route path="/admin/projects/new" element={element} />
          </Routes>
        </AdminApprovalsContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
}

describe("project detail role visibility", () => {
  it("shows Portfolio Overview and Edit to the owner", () => {
    renderRoute("owner", "/admin/projects/p1", <AdminProjectDetail />);
    expect(screen.getByRole("heading", { name: "Portfolio Overview" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit project" })).toBeInTheDocument();
    expect(screen.getByText("Widson O. Ambaisi")).toBeInTheDocument();
    expect(
      screen.queryByText(/Commercial references|Estimate number|Payment status/i)
    ).not.toBeInTheDocument();
  });

  it("hides Portfolio Overview from the Operations Manager", () => {
    renderRoute("manager", "/admin/projects/p1", <AdminProjectDetail />);
    expect(screen.queryByRole("heading", { name: "Portfolio Overview" })).not.toBeInTheDocument();
    expect(screen.queryByText("Approved For Portfolio")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit project" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Protected project changes" })).toBeInTheDocument();
  });

  it.each(["staff", "viewer"])("hides Edit from %s", (role) => {
    renderRoute(role, "/admin/projects/p1", <AdminProjectDetail />);
    expect(screen.queryByRole("link", { name: "Edit project" })).not.toBeInTheDocument();
  });

  it("renders the returned false / Not Reviewed portfolio values without substitution", () => {
    renderRoute("owner", "/admin/projects/p1", <AdminProjectDetail />, [
      {
        ...project,
        portfolioEligible: false,
        portfolioPermissionStatus: "Not Reviewed",
      },
    ]);
    const portfolio = screen.getByRole("heading", { name: "Portfolio Overview" }).closest("aside");
    expect(portfolio).toHaveTextContent("EligibleNo");
    expect(portfolio).toHaveTextContent("Permission statusNot Reviewed");
    expect(portfolio).not.toHaveTextContent("Permission statusEligible");
  });
});

describe("project form route guard", () => {
  it.each(["staff", "viewer"])(
    "does not expose a functional create form to %s",
    (role) => {
      renderRoute(
        role,
        "/admin/projects/new",
        <AdminProjectForm mode="create" />
      );
      expect(screen.getByRole("heading", { name: "Not available" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Create project" })).not.toBeInTheDocument();
    }
  );

  it.each(["staff", "viewer"])(
    "does not expose a functional edit form to %s",
    (role) => {
      renderRoute(
        role,
        "/admin/projects/p1/edit",
        <AdminProjectForm mode="edit" />
      );
      expect(screen.getByRole("heading", { name: "Not available" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
    }
  );
});
