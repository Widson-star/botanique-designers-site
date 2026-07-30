import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import AdminProjectForm from "./AdminProjectForm";

// Isolate the create-routing decision: the owner creates a live project
// directly (ProjectForm); a manager is routed to the restricted intake proposal
// (ProjectIntakeForm). No self-approval / owner-intake path exists.
vi.mock("../components/ProjectForm", () => ({
  default: () => <div>DIRECT_PROJECT_FORM</div>,
}));
vi.mock("../components/ProjectIntakeForm", () => ({
  default: () => <div>INTAKE_PROPOSAL_FORM</div>,
}));

function renderCreate(role) {
  return render(
    <MemoryRouter>
      <AdminDataContext.Provider value={{ role, projects: [], dataStatus: "ready" }}>
        <AdminProjectForm mode="create" />
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
}

describe("AdminProjectForm create routing", () => {
  it("gives the owner the direct project form (never an intake)", () => {
    renderCreate("owner");
    expect(screen.getByText("DIRECT_PROJECT_FORM")).toBeInTheDocument();
    expect(screen.queryByText("INTAKE_PROPOSAL_FORM")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "New project" })).toBeInTheDocument();
  });

  it("routes a manager to the restricted intake proposal", () => {
    renderCreate("manager");
    expect(screen.getByText("INTAKE_PROPOSAL_FORM")).toBeInTheDocument();
    expect(screen.queryByText("DIRECT_PROJECT_FORM")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Propose new project" })).toBeInTheDocument();
  });
});
