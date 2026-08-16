import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { AdminApprovalsContext } from "../context/adminApprovals";
import { PeopleContext } from "../context/people";
import AdminApprovalDetail from "./AdminApprovalDetail";
import { STALE_APPROVAL_MESSAGE } from "../utils/approvalErrors";

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
  source: "project",
  sourceId: "request-1",
  approvalType: "project_activation",
  projectId: "project-1",
  personId: "",
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
const staffRequest = {
  id: "staff-compensation-comp-1",
  source: "staff_compensation",
  sourceId: "comp-1",
  approvalType: "staff_compensation",
  projectId: "",
  personId: "person-1",
  requesterId: "manager-1",
  state: "awaiting_review",
  requestRound: 1,
  version: 4,
  compensationType: "compensation",
  serviceDate: "2026-08-15",
  submittedAmount: 60000,
  description: "Operations management compensation.",
  requestedAt: "2026-08-16T18:00:00Z",
};

function renderDetail(role = "owner", requestRow = request, overrides = {}, projectRow = project) {
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
    ...overrides,
  };
  render(
    <MemoryRouter initialEntries={[`/admin/approvals/${requestRow.id}`]}>
      <AdminDataContext.Provider value={{
        role,
        currentUserId: role === "manager" ? "manager-1" : "owner-1",
        projects: projectRow ? [projectRow] : [],
        profilesById: {
          "manager-1": { id: "manager-1", full_name: "Martine Lotom", role: "manager" },
        },
      }}>
        <PeopleContext.Provider value={{
          peopleById: new Map([["person-1", { id: "person-1", fullName: "Martine Lotom", isActive: true }]]),
        }}>
          <AdminApprovalsContext.Provider value={methods}>
            <Routes>
              <Route path="/admin/approvals/:approvalId" element={<AdminApprovalDetail />} />
            </Routes>
          </AdminApprovalsContext.Provider>
        </PeopleContext.Provider>
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

  it("shows Staff Compensation without requiring a Project and keeps approval separate from payment", async () => {
    const user = userEvent.setup();
    const methods = renderDetail("owner", staffRequest, {
      loadEvents: vi.fn().mockResolvedValue([{
        id: "sc-event-1",
        actorId: "manager-1",
        eventType: "submitted",
        occurredAt: "2026-08-16T18:00:00Z",
        roundNumber: 1,
        eventNotes: "",
      }]),
    }, null);

    expect(screen.getByRole("heading", { name: "Staff compensation" })).toBeInTheDocument();
    expect(screen.getAllByText("Martine Lotom").length).toBeGreaterThan(0);
    expect(screen.getByText("KES 60,000.00")).toBeInTheDocument();
    expect(screen.getByText("No project context")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Withdraw request" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Amend and resubmit" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Approve" }));
    expect(screen.getByText("This approves the Staff Compensation obligation. It does not record payment.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Approve compensation" }));

    expect(methods.decide).toHaveBeenCalledWith(
      "staff-compensation-comp-1",
      "approved",
      ""
    );
  });

  it("requires a reason when rejecting Staff Compensation", async () => {
    const user = userEvent.setup();
    renderDetail("owner", staffRequest, {}, null);
    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(screen.getByRole("button", { name: "Reject" })).toBeDisabled();
    await user.type(screen.getByRole("textbox"), "Amount needs correction.");
    expect(screen.getByRole("button", { name: "Reject" })).toBeEnabled();
  });

  it("surfaces a clear stale error and always restores usable controls", async () => {
    const user = userEvent.setup();
    renderDetail("owner", request, {
      decide: vi.fn().mockResolvedValue({
        ok: false,
        stale: true,
        error: "stale project snapshot",
      }),
    });

    await user.click(screen.getByRole("button", { name: "Approve" }));
    await user.click(screen.getByRole("button", { name: "Approve and apply" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(STALE_APPROVAL_MESSAGE);
    expect(screen.getByRole("button", { name: "Approve and apply" })).toBeEnabled();
    expect(screen.queryByText("Working…")).not.toBeInTheDocument();
  });

  it.each([
    ["undefined response", vi.fn().mockResolvedValue(undefined), "invalid response"],
    ["network rejection", vi.fn().mockRejectedValue(new Error("Network unavailable")), "Network unavailable"],
    [
      "Supabase error object",
      vi.fn().mockResolvedValue({ ok: false, error: { message: "Supabase rejected the decision" } }),
      "Supabase rejected the decision",
    ],
  ])("handles %s without a false success state", async (_label, decide, message) => {
    const user = userEvent.setup();
    renderDetail("owner", request, { decide });

    await user.click(screen.getByRole("button", { name: "Approve" }));
    await user.click(screen.getByRole("button", { name: "Approve and apply" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("alertdialog", { name: "Approve request" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve and apply" })).toBeEnabled();
  });

  it("prevents duplicate decision submission while one request is in flight", async () => {
    let finish;
    const decide = vi.fn(() => new Promise((resolve) => { finish = resolve; }));
    renderDetail("owner", request, { decide });

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    const confirm = screen.getByRole("button", { name: "Approve and apply" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(decide).toHaveBeenCalledTimes(1);
    finish({ ok: false, error: "Controlled failure" });
    expect(await screen.findByRole("alert")).toHaveTextContent("Controlled failure");
    expect(confirm).toBeEnabled();
  });

  it.each(["approved", "rejected", "amendment_requested", "withdrawn"])(
    "does not retain a stale warning for terminal state %s",
    async (state) => {
      renderDetail("owner", {
        ...request,
        state,
        decision: state,
      }, {}, { ...project, status: "Ongoing" });
      await waitFor(() => expect(screen.getByText("Request submitted")).toBeInTheDocument());
      expect(screen.queryByText(/Approving now is blocked as stale/)).not.toBeInTheDocument();
      expect(screen.queryByText("(changed)")).not.toBeInTheDocument();
    }
  );
});
