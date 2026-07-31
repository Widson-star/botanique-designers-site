import { useCallback, useMemo, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { AdminIntakeContext } from "../context/adminIntake";
import AdminProjectIntakeDetail from "./AdminProjectIntakeDetail";

const terminalIntake = {
  id: "intake-terminal-1",
  requesterId: "manager-1",
  state: "approved",
  requestRound: 2,
  proposedValues: {
    project_name: "PR44 Terminal Intake Test",
    project_type: "Other",
  },
  reason: "Controlled terminal access test.",
  requesterNotes: "",
  decision: "approved",
  decisionNotes: "",
  createdProjectId: "project-created-1",
  requestedAt: "2026-07-31T08:00:00Z",
  reviewedAt: "2026-07-31T09:00:00Z",
  decidedAt: "2026-07-31T09:00:00Z",
  withdrawnAt: "",
};

function IntakeHarness({ visibleIntake, role, currentUserId }) {
  const [intakes, setIntakes] = useState([]);
  const loadIntake = useCallback(async () => {
    if (!visibleIntake) return null;
    setIntakes([visibleIntake]);
    return visibleIntake;
  }, [visibleIntake]);
  const value = useMemo(() => ({
    intakes,
    status: "ready",
    loadIntake,
    loadEvents: vi.fn().mockResolvedValue([{
      id: "intake-event-1",
      eventType: "project_created",
      actorId: "owner-1",
      occurredAt: "2026-07-31T09:00:00Z",
      eventNotes: "",
    }]),
    decide: vi.fn(),
    requestAmendment: vi.fn(),
    amendAndResubmit: vi.fn(),
    withdraw: vi.fn(),
  }), [intakes, loadIntake]);

  return (
    <AdminDataContext.Provider value={{
      role,
      currentUserId,
      profilesById: {
        "manager-1": { id: "manager-1", full_name: "Martine Lotom", role: "manager" },
      },
    }}>
      <AdminIntakeContext.Provider value={value}>
        <Routes>
          <Route path="/admin/project-intakes/:intakeId" element={<AdminProjectIntakeDetail />} />
        </Routes>
      </AdminIntakeContext.Provider>
    </AdminDataContext.Provider>
  );
}

function renderDetail({ intake = terminalIntake, role = "owner", currentUserId = "owner-1" } = {}) {
  render(
    <MemoryRouter initialEntries={["/admin/project-intakes/intake-terminal-1"]}>
      <IntakeHarness visibleIntake={intake} role={role} currentUserId={currentUserId} />
    </MemoryRouter>
  );
}

describe("Admin project intake terminal detail", () => {
  it.each([
    ["owner", "owner-1"],
    ["manager", "manager-1"],
  ])("reloads an approved intake for the authorised %s", async (role, currentUserId) => {
    renderDetail({ role, currentUserId });
    expect(await screen.findByRole("heading", { name: "PR44 Terminal Intake Test" })).toBeInTheDocument();
    expect(await screen.findByText("Live project created")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open project" })).toHaveAttribute(
      "href",
      "/admin/projects/project-created-1"
    );
    expect(screen.queryByText("Intake unavailable")).not.toBeInTheDocument();
  });

  it.each([
    ["rejected", "owner", "owner-1"],
    ["rejected", "manager", "manager-1"],
    ["withdrawn", "owner", "owner-1"],
    ["withdrawn", "manager", "manager-1"],
  ])(
    "keeps %s intake history available to the authorised %s",
    async (state, role, currentUserId) => {
      const row = {
        ...terminalIntake,
        state,
        decision: state === "rejected" ? "rejected" : "",
        createdProjectId: "",
      };
      renderDetail({ intake: row, role, currentUserId });
      expect(await screen.findByRole("heading", { name: "PR44 Terminal Intake Test" })).toBeInTheDocument();
      expect(screen.getByText(state === "rejected" ? "Rejected" : "Withdrawn")).toBeInTheDocument();
    }
  );

  it("does not expose an unrelated manager intake", async () => {
    renderDetail({ intake: null, role: "manager", currentUserId: "manager-2" });
    await waitFor(() => expect(screen.getByRole("heading", { name: "Intake unavailable" })).toBeInTheDocument());
    expect(screen.queryByText("PR44 Terminal Intake Test")).not.toBeInTheDocument();
  });
});
