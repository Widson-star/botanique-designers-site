import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { AdminApprovalsContext } from "../context/adminApprovals";
import { PeopleContext } from "../context/people";
import AdminApprovals from "./AdminApprovals";

const project = { id: "project-1", projectName: "Karen Residence" };
const profile = {
  id: "manager-1",
  role: "manager",
  full_name: "Martine Lotom",
  email: "martine@botaniquedesigners.com",
};
const person = {
  id: "person-1",
  fullName: "Martine Lotom",
};

function renderQueue(approvalValue) {
  return render(
    <MemoryRouter>
      <AdminDataContext.Provider value={{
        role: "owner",
        projects: [project],
        profilesById: { "manager-1": profile },
      }}>
        <PeopleContext.Provider value={{ peopleById: new Map([[person.id, person]]) }}>
          <AdminApprovalsContext.Provider value={approvalValue}>
            <AdminApprovals />
          </AdminApprovalsContext.Provider>
        </PeopleContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
}

describe("Admin approvals queue", () => {
  it("renders a useful empty state", () => {
    renderQueue({ requests: [], status: "ready", error: "", refreshRequests: vi.fn() });
    expect(screen.getByRole("heading", { name: "No approval requests" })).toBeInTheDocument();
    expect(screen.getByText("There are no decision items yet.")).toBeInTheDocument();
  });

  it("renders readable project, requester, state and request type", () => {
    renderQueue({
      status: "ready",
      error: "",
      requests: [{
        id: "request-1",
        source: "project",
        approvalType: "project_activation",
        projectId: "project-1",
        personId: "",
        requesterId: "manager-1",
        state: "awaiting_review",
        requestedAt: "2026-07-28T08:00:00Z",
      }],
    });
    expect(screen.getByRole("link", { name: "Project activation" }))
      .toHaveAttribute("href", "/admin/approvals/request-1");
    expect(screen.getByText("Karen Residence")).toBeInTheDocument();
    expect(screen.getByText("Martine Lotom")).toBeInTheDocument();
    expect(screen.getByText("Awaiting review")).toBeInTheDocument();
  });

  it("surfaces Staff Compensation under the beneficiary without inventing a Project", () => {
    renderQueue({
      status: "ready",
      error: "",
      requests: [{
        id: "staff-compensation-comp-1",
        source: "staff_compensation",
        sourceId: "comp-1",
        approvalType: "staff_compensation",
        projectId: "",
        personId: "person-1",
        requesterId: "manager-1",
        state: "awaiting_review",
        requestedAt: "2026-08-16T18:00:00Z",
      }],
    });

    expect(screen.getByRole("link", { name: "Staff compensation" }))
      .toHaveAttribute("href", "/admin/approvals/staff-compensation-comp-1");
    expect(screen.getAllByText("Martine Lotom").length).toBeGreaterThan(0);
    expect(screen.getByText("Awaiting review")).toBeInTheDocument();
    expect(screen.queryByText("Authorised project")).not.toBeInTheDocument();
  });

  it("surfaces API loading and error states", () => {
    const { rerender } = renderQueue({ requests: [], status: "loading", error: "" });
    expect(screen.getByText("Loading approvals…")).toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <AdminDataContext.Provider value={{ role: "owner", projects: [], profilesById: {} }}>
          <PeopleContext.Provider value={{ peopleById: new Map() }}>
            <AdminApprovalsContext.Provider value={{ requests: [], status: "error", error: "Approval API unavailable" }}>
              <AdminApprovals />
            </AdminApprovalsContext.Provider>
          </PeopleContext.Provider>
        </AdminDataContext.Provider>
      </MemoryRouter>
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Approval API unavailable");
  });
});
