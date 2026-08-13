import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MaintenanceContext } from "../../context/maintenance";
import ProjectMaintenanceIndicator from "./ProjectMaintenanceIndicator";

const project = { id: "p1", projectName: "Lugulu Residential Home", status: "Completed" };

function wrap(summaryForProject, role = "owner") {
  return render(
    <MemoryRouter>
      <MaintenanceContext.Provider value={{ summaryForProject }}>
        <ProjectMaintenanceIndicator project={project} role={role} />
      </MaintenanceContext.Provider>
    </MemoryRouter>
  );
}

describe("ProjectMaintenanceIndicator", () => {
  it("renders nothing when the project has no live Maintenance relationship — a truthful absence", () => {
    const { container } = wrap(() => null);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows Active status and the derived next visit for a Completed project without reopening it", () => {
    wrap(() => ({ id: "rel-1", status: "active", nextVisitDate: "2026-08-20" }));
    expect(screen.getByRole("heading", { name: "Maintenance" })).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText(/20 Aug 2026/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View →" })).toHaveAttribute("href", "/admin/maintenance/rel-1");
    // The indicator never claims anything about the Project's own status.
    expect(screen.queryByText("Completed")).not.toBeInTheDocument();
  });

  it("states a truthful empty next-visit rather than inventing a date", () => {
    wrap(() => ({ id: "rel-1", status: "paused", nextVisitDate: "" }));
    expect(screen.getByText("Paused")).toBeInTheDocument();
    expect(screen.getByText(/Not scheduled/)).toBeInTheDocument();
  });

  it("is unavailable to a staff reader, matching Maintenance's own capability", () => {
    wrap(() => ({ id: "rel-1", status: "active", nextVisitDate: "" }), "staff");
    expect(screen.queryByRole("heading", { name: "Maintenance" })).not.toBeInTheDocument();
  });
});
