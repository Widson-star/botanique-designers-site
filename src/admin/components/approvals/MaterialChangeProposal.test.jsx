import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminDataContext } from "../../context/adminData";
import { AdminApprovalsContext } from "../../context/adminApprovals";
import MaterialChangeProposal from "./MaterialChangeProposal";

const project = {
  id: "p1",
  projectName: "Karen Residence",
  clientSiteName: "Karen",
  location: "Karen",
  county: "Nairobi",
  projectType: "Residential",
  stage: "Implementation",
  leadPersonId: "owner-1",
  startDate: "",
  actualStartDate: "",
};

const profiles = [
  { id: "owner-1", role: "owner", is_active: true, full_name: "Widson Ambaisi", email: "" },
  { id: "manager-1", role: "manager", is_active: true, full_name: "Martine Lotom", email: "" },
];

function renderProposal(requests) {
  const data = {
    role: "manager",
    profiles,
    profilesById: Object.fromEntries(profiles.map((p) => [p.id, p])),
    currentUserId: "manager-1",
  };
  const approvals = { requests, submit: vi.fn(), withdraw: vi.fn() };
  return render(
    <MemoryRouter>
      <AdminDataContext.Provider value={data}>
        <AdminApprovalsContext.Provider value={approvals}>
          <MaterialChangeProposal project={project} />
        </AdminApprovalsContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
}

describe("MaterialChangeProposal", () => {
  it("offers the proposal form and states approval is required", () => {
    renderProposal([]);
    expect(
      screen.getByRole("heading", { name: "Propose a material change" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Changing any of them requires Principal approval/)
    ).toBeInTheDocument();
  });

  it("shows a pending banner (not the form) while a material change awaits review", () => {
    renderProposal([
      {
        id: "req-1",
        projectId: "p1",
        approvalType: "project_material_change",
        state: "awaiting_review",
        originalValues: { location: "Karen" },
        proposedValues: { location: "Kilimani" },
        reason: "Address correction.",
      },
    ]);
    expect(
      screen.getByText("Material change awaiting Principal approval")
    ).toBeInTheDocument();
    expect(screen.getByText("Withdraw proposal")).toBeInTheDocument();
    // The editable proposal form is hidden while one is pending.
    expect(
      screen.queryByRole("heading", { name: "Propose a material change" })
    ).not.toBeInTheDocument();
  });
});
