import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import AdminDashboard from "./AdminDashboard";

function renderDashboard({ role, projects = [] }) {
  const value = {
    role,
    projects,
    profilesById: {},
    dataStatus: "ready",
    dataError: "",
    fetchActivities: vi.fn(),
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
  { id: "1", status: "Pending", stage: "Inquiry", projectType: "Residential", archived: false, projectName: "P1", targetCompletionDate: "", leadPersonName: "Not assigned", portfolioPermissionStatus: "Not Reviewed", nextAction: "", nextActionDate: "", startDate: "" },
];

describe("AdminDashboard pending activation", () => {
  it("shows the Pending activation section to the owner", () => {
    renderDashboard({ role: "owner", projects });
    expect(screen.getByRole("region", { name: "Pending activation" })).toBeInTheDocument();
  });

  it("hides the Pending activation section from the manager", () => {
    renderDashboard({ role: "manager", projects });
    expect(screen.queryByRole("region", { name: "Pending activation" })).not.toBeInTheDocument();
  });

  it("renders empty charts as 'No data yet'", () => {
    renderDashboard({ role: "owner", projects: [] });
    expect(screen.getAllByText("No data yet").length).toBeGreaterThan(0);
  });
});
