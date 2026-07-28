import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { AdminApprovalsContext } from "../context/adminApprovals";
import AdminApprovalDetail from "./AdminApprovalDetail";

const project = {
  id: "project-1",
  projectName: "Karen Residence",
  status: "Pending",
  archived: false,
  targetCompletionDate: "",
  actualCompletionDate: "",
  startDate: "",
  actualStartDate: "",
};
const request = {
  id: "request-1",
  approvalType: "project_activation",
  projectId: "project-1",
  requesterId: "manager-1",
  state: "awaiting_review",
  requestRound: 1,
  originalValues: { status: "Pending" },
  proposedValues: { status: "Ongoing" },
  reason: "Mobilisation is confirmed.",
  requesterNotes: "",
  decisionNotes: "",
  requestedAt: "2026-07-28T08:00:00Z",
};

function renderDetail(role = "owner", requestRow = request) {
  const loadEvents = vi.fn().mockResolvedValue([
    {
      id: "event-1",
      actorId: "manager-1",
      eventType: "submitted",
      occurredAt: "2026-07-28T08:00:00Z",
      roundNumber: 1,
      eventNotes: "",
    },
    {
      id: "event-2",
      actorId: "manager-1",
      eventType: "queued_for_review",
      occurredAt: "2026-07-28T08:00:01Z",
      roundNumber: 1,
      eventNotes: "",
    },
    {
      id: "event-3",
      actorId: "owner-1",
      eventType: "amendment_requested",
      occurredAt: "2026-07-28T09:00:00Z",
      roundNumber: 1,
      eventNotes: "",
    },
    {
      id: "event-4",
      actorId: "owner-1",
      eventType: "approved",
      occurredAt: "2026-07-28T10:00:00Z",
      roundNumber: 1,
      eventNotes: "",
    },
  ]);
  const methods = {
    requests: [requestRow],
    loadEvents,
    decide: vi.fn().mockResolvedValue({ ok: true }),
    requestAmendment: vi.fn().mockResolvedValue({ ok: true }),
    amendAndResubmit: vi.fn().mockResolvedValue({ ok: true }),
    withdraw: vi.fn().mockResolvedValue({ ok: true }),
  };
  render(
    <MemoryRouter initialEntries={["/admin/approvals/request-1"]}>
      <AdminDataContext.Provider value={{
        role,
        currentUserId: role === "manager" ? "manager-1" : "owner-1",
        projects: [project],
        profilesById: {
          "manager-1": { id: "manager-1", full_name: "Martine Lotom", role: "manager" },
        },
      }}>
        <AdminApprovalsContext.Provider value={methods}>
          <Routes>
            <Route path="/admin/approvals/:approvalId" element={<AdminApprovalDetail />} />
          </Routes>
        </AdminApprovalsContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
  return methods;
}

describe("Admin approval detail", () => {
  it("shows readable values and owner decision controls", async () => {
    renderDetail();
    expect(screen.getByRole("heading", { name: "Project activation" })).toBeInTheDocument();
    expect(screen.getByText("Mobilisation is confirmed.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request amendment" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Request submitted")).toBeInTheDocument());
    expect(screen.getByText("Queued for review")).toBeInTheDocument();
    expect(screen.getByText("Amendment requested", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("Request approved")).toBeInTheDocument();
    expect(screen.queryByText("Review started")).not.toBeInTheDocument();
    expect(screen.queryByText("queued_for_review")).not.toBeInTheDocument();
    expect(screen.queryByText(/request-1|manager-1|project-1/)).not.toBeInTheDocument();
  });

  it("lets the original manager withdraw but not decide", async () => {
    renderDetail("manager");
    expect(screen.getByRole("button", { name: "Withdraw request" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Request submitted")).toBeInTheDocument());
  });

  it("shows amendment flow only to the original requester", async () => {
    renderDetail("manager", {
      ...request,
      state: "amendment_requested",
      decisionNotes: "Please provide the confirmed mobilisation date.",
      reviewedAt: "2026-07-28T09:00:00Z",
    });
    expect(screen.getByRole("button", { name: "Amend and resubmit" })).toBeInTheDocument();
    expect(screen.getByText("Please provide the confirmed mobilisation date.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Request submitted")).toBeInTheDocument());
  });
});
