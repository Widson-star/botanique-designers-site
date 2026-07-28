import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { AdminApprovalsContext } from "../context/adminApprovals";
import AdminApprovals from "./AdminApprovals";

const project = { id: "project-1", projectName: "Karen Residence" };
const profile = {
  id: "manager-1",
  role: "manager",
  full_name: "Martine Lotom",
  email: "martine@botaniquedesigners.com",
};

function renderQueue(approvalValue) {
  return render(
    <MemoryRouter>
      <AdminDataContext.Provider value={{
        role: "owner",
        projects: [project],
        profilesById: { "manager-1": profile },
      }}>
        <AdminApprovalsContext.Provider value={approvalValue}>
          <AdminApprovals />
        </AdminApprovalsContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
}

describe("Admin approvals queue", () => {
  it("renders a useful empty state", () => {
    renderQueue({ requests: [], status: "ready", error: "", refreshRequests: vi.fn() });
    expect(screen.getByRole("heading", { name: "No approval requests" })).toBeInTheDocument();
  });

  it("renders readable project, requester, state and request type", () => {
    renderQueue({
      status: "ready",
      error: "",
      requests: [{
        id: "request-1",
        approvalType: "project_activation",
        projectId: "project-1",
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

  it("surfaces API loading and error states", () => {
    const { rerender } = renderQueue({ requests: [], status: "loading", error: "" });
    expect(screen.getByText("Loading approvals…")).toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <AdminDataContext.Provider value={{ role: "owner", projects: [], profilesById: {} }}>
          <AdminApprovalsContext.Provider value={{ requests: [], status: "error", error: "Approval API unavailable" }}>
            <AdminApprovals />
          </AdminApprovalsContext.Provider>
        </AdminDataContext.Provider>
      </MemoryRouter>
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Approval API unavailable");
  });
});
