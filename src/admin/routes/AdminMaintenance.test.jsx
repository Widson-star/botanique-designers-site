import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { MaintenanceContext } from "../context/maintenance";
import { PeopleContext } from "../context/people";
import AdminMaintenance from "./AdminMaintenance";
import AdminMaintenanceDetail from "./AdminMaintenanceDetail";

const register = [
  {
    id: "rel-1", projectId: "p1", projectName: "Lugulu Residential Home", clientSiteName: "Eugen Awori",
    projectStatus: "Completed", status: "active", scope: "Fortnightly lawn and border upkeep",
    frequency: "fortnightly", startDate: "2026-08-01", version: 2,
    lastVisitDate: "2026-08-05", nextVisitDate: "2026-08-20",
    assignedTeam: [{ person_id: "person-1", full_name: "Lincoln Waweru", role: "maintenance_lead" }],
  },
  {
    id: "rel-2", projectId: "p2", projectName: "Kitusuru Residence", clientSiteName: "Priya Shah",
    projectStatus: "Ongoing", status: "paused", scope: "Quarterly inspection",
    frequency: "quarterly", startDate: "2026-05-01", version: 1,
    lastVisitDate: "", nextVisitDate: "",
    assignedTeam: [],
  },
  {
    id: "rel-3", projectId: "p4", projectName: "Malava Retreat", clientSiteName: "Malava Retreat",
    projectStatus: "Completed", status: "ended", scope: "Discontinued maintenance",
    frequency: "monthly", startDate: "2026-01-01", version: 3,
    lastVisitDate: "2026-02-01", nextVisitDate: "",
    assignedTeam: [],
  },
];

const visits = [
  { id: "visit-1", relationshipId: "rel-1", scheduledDate: "2026-08-05", status: "completed", purpose: "Routine upkeep", completedAt: "2026-08-05T09:00:00Z", completionNote: "Lawn mowed, borders trimmed.", cancellationReason: "", version: 2 },
  { id: "visit-2", relationshipId: "rel-1", scheduledDate: "2026-08-20", status: "scheduled", purpose: "Next scheduled visit", completedAt: "", completionNote: "", cancellationReason: "", version: 1 },
  { id: "visit-3", relationshipId: "rel-3", scheduledDate: "2026-02-01", status: "completed", purpose: "Final visit", completedAt: "2026-02-01T09:00:00Z", completionNote: "Last visit before the relationship ended.", cancellationReason: "", version: 2 },
];

const assignments = [
  { id: "assign-1", relationshipId: "rel-1", personId: "person-1", personName: "Lincoln Waweru", role: "maintenance_lead", startDate: "2026-08-01", endDate: "", version: 1 },
  { id: "assign-2", relationshipId: "rel-3", personId: "person-1", personName: "Lincoln Waweru", role: "maintenance_lead", startDate: "2026-01-01", endDate: "2026-02-15", version: 2 },
];

const people = [
  { id: "person-1", fullName: "Lincoln Waweru", isActive: true },
  { id: "person-2", fullName: "Grace Njeri", isActive: true },
];

const eligibleProjects = [
  { id: "p1", projectName: "Lugulu Residential Home", clientSiteName: "Eugen Awori", status: "Completed" },
  { id: "p3", projectName: "Alego Usonga", clientSiteName: "Allan Ouma", status: "Ongoing" },
];

function contexts(overrides = {}) {
  const { role = "owner", ...rest } = overrides;
  return {
    admin: { role },
    maintenance: {
      register, visits, assignments, eligibleProjects, status: "ready", error: "",
      refresh: vi.fn(() => Promise.resolve({ ok: true })),
      addRelationship: vi.fn(() => Promise.resolve({ ok: true })),
      pauseRelationship: vi.fn(() => Promise.resolve({ ok: true })),
      resumeRelationship: vi.fn(() => Promise.resolve({ ok: true })),
      endRelationship: vi.fn(() => Promise.resolve({ ok: true })),
      addVisit: vi.fn(() => Promise.resolve({ ok: true })),
      rescheduleVisit: vi.fn(() => Promise.resolve({ ok: true })),
      completeVisit: vi.fn(() => Promise.resolve({ ok: true })),
      cancelVisit: vi.fn(() => Promise.resolve({ ok: true })),
      addAssignment: vi.fn(() => Promise.resolve({ ok: true })),
      endAssignment: vi.fn(() => Promise.resolve({ ok: true })),
      editRelationship: vi.fn(() => Promise.resolve({ ok: true })),
      correctAssignment: vi.fn(() => Promise.resolve({ ok: true })),
      summaryForProject: (projectId) => {
        const relationship = register.find((row) => row.projectId === projectId && row.status !== "ended");
        return relationship ? { id: relationship.id, status: relationship.status, nextVisitDate: relationship.nextVisitDate } : null;
      },
      visitsForRelationship: (relationshipId) => visits.filter((visit) => visit.relationshipId === relationshipId),
      assignmentsForRelationship: (relationshipId) => assignments.filter((assignment) => assignment.relationshipId === relationshipId),
      ...rest,
    },
    people: { people },
  };
}

function wrap(values, initial = "/admin/maintenance") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <AdminDataContext.Provider value={values.admin}>
        <PeopleContext.Provider value={values.people}>
          <MaintenanceContext.Provider value={values.maintenance}>
            <Routes>
              <Route path="/admin/maintenance" element={<AdminMaintenance />} />
              <Route path="/admin/maintenance/:relationshipId" element={<AdminMaintenanceDetail />} />
            </Routes>
          </MaintenanceContext.Provider>
        </PeopleContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
}

describe("Maintenance register", () => {
  it("lists active relationships by default with derived last/next visit and team", () => {
    wrap(contexts());
    expect(screen.getByRole("heading", { level: 1, name: "Maintenance" })).toBeInTheDocument();
    expect(screen.getByText("Lugulu Residential Home")).toBeInTheDocument();
    // Paused rel-2 is excluded from the default "active" filter.
    expect(screen.queryByText("Kitusuru Residence")).not.toBeInTheDocument();
    expect(screen.getByText(/Lincoln Waweru/)).toBeInTheDocument();
  });

  it("shows the truthful empty state for last/next visit rather than an invented date", () => {
    wrap(contexts(), "/admin/maintenance?status=all");
    expect(screen.getAllByText(/Not scheduled/).length).toBeGreaterThan(0);
    expect(screen.getByText(/None yet/)).toBeInTheDocument();
    expect(screen.getAllByText(/Unassigned/).length).toBeGreaterThan(0);
  });

  it("computes KPI tiles from real loaded records, not illustrative figures", () => {
    wrap(contexts(), "/admin/maintenance?status=all");
    // rel-1 is active; rel-2 is paused — exactly one active relationship.
    expect(screen.getByText("Active relationships").parentElement).toHaveTextContent("1");
  });

  it("starts a Maintenance relationship and calls addRelationship with the trimmed scope", async () => {
    const values = contexts();
    wrap(values);
    fireEvent.click(screen.getByRole("button", { name: "Start Maintenance" }));
    fireEvent.change(screen.getByLabelText(/Site \/ Project/), { target: { value: "p3" } });
    fireEvent.change(screen.getByLabelText(/Maintenance scope/), { target: { value: "  Weekly upkeep  " } });
    fireEvent.click(screen.getByRole("button", { name: "Start Maintenance" }));
    await waitFor(() => expect(values.maintenance.addRelationship).toHaveBeenCalled());
    expect(values.maintenance.addRelationship.mock.calls[0][0]).toMatchObject({
      projectId: "p3", scope: "Weekly upkeep",
    });
  });

  it("refuses to submit without a chosen site", async () => {
    const values = contexts();
    wrap(values);
    fireEvent.click(screen.getByRole("button", { name: "Start Maintenance" }));
    fireEvent.change(screen.getByLabelText(/Maintenance scope/), { target: { value: "Weekly upkeep" } });
    // fireEvent.submit dispatches the submit event directly, bypassing the
    // browser's own required-field constraint validation, so the component's
    // own JS guard is what is under test here.
    fireEvent.submit(screen.getByRole("button", { name: "Start Maintenance" }).closest("form"));
    expect(screen.getByText("Choose a site or project.")).toBeInTheDocument();
    expect(values.maintenance.addRelationship).not.toHaveBeenCalled();
  });

  it("states the empty register plainly", () => {
    wrap(contexts({ register: [] }));
    expect(screen.getByText(/No site is under Maintenance yet/)).toBeInTheDocument();
  });

  it("denies the register to a staff reader", () => {
    wrap(contexts({}), "/admin/maintenance");
    wrap(contexts({ role: "staff" }));
    expect(screen.getAllByRole("heading", { name: "Maintenance unavailable" }).length).toBeGreaterThan(0);
  });
});

describe("Maintenance relationship detail", () => {
  it("shows the linked project, status, scope, frequency and next visit without reopening a Completed project", () => {
    wrap(contexts(), "/admin/maintenance/rel-1");
    expect(screen.getByRole("heading", { level: 1, name: "Lugulu Residential Home" })).toBeInTheDocument();
    expect(screen.getByText(/Project status: Completed/)).toBeInTheDocument();
    expect(screen.getByText("Fortnightly lawn and border upkeep")).toBeInTheDocument();
    expect(screen.getByText("Fortnightly")).toBeInTheDocument();
  });

  it("separates scheduled visits from visit history, with no cost or payment content", () => {
    wrap(contexts(), "/admin/maintenance/rel-1");
    expect(screen.getByText("Scheduled visits")).toBeInTheDocument();
    expect(screen.getByText("Visit history")).toBeInTheDocument();
    expect(screen.getByText(/Lawn mowed, borders trimmed/)).toBeInTheDocument();
    expect(screen.queryByText(/KES/)).not.toBeInTheDocument();
    expect(screen.queryByText(/[Cc]ost/)).not.toBeInTheDocument();
    expect(screen.queryByText(/[Pp]ayment/)).not.toBeInTheDocument();
  });

  it("schedules a visit and calls addVisit with the relationship, date and purpose", async () => {
    const values = contexts();
    wrap(values, "/admin/maintenance/rel-1");
    fireEvent.click(screen.getByRole("button", { name: "Schedule visit" }));
    fireEvent.change(screen.getByLabelText(/Planned work \/ purpose/), { target: { value: "Irrigation check" } });
    fireEvent.click(screen.getByRole("button", { name: "Schedule visit" }));
    await waitFor(() => expect(values.maintenance.addVisit).toHaveBeenCalled());
    expect(values.maintenance.addVisit.mock.calls[0][0]).toMatchObject({
      relationshipId: "rel-1", purpose: "Irrigation check",
    });
  });

  it("completes a visit with a required completion note", async () => {
    const values = contexts();
    wrap(values, "/admin/maintenance/rel-1");
    fireEvent.click(screen.getByRole("button", { name: "Complete" }));
    fireEvent.change(screen.getByLabelText("Completed-work note"), { target: { value: "Irrigation checked, no issues." } });
    fireEvent.click(screen.getByRole("button", { name: "Mark completed" }));
    await waitFor(() => expect(values.maintenance.completeVisit).toHaveBeenCalledWith("visit-2", 1, "Irrigation checked, no issues."));
  });

  it("cancels a visit with a required reason", async () => {
    const values = contexts();
    wrap(values, "/admin/maintenance/rel-1");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.change(screen.getByLabelText("Cancellation reason"), { target: { value: "Client rescheduled" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel visit" }));
    await waitFor(() => expect(values.maintenance.cancelVisit).toHaveBeenCalledWith("visit-2", 1, "Client rescheduled"));
  });

  it("reschedules a visit to a new date", async () => {
    const values = contexts();
    wrap(values, "/admin/maintenance/rel-1");
    fireEvent.click(screen.getByRole("button", { name: "Reschedule" }));
    fireEvent.change(screen.getByLabelText("New scheduled date"), { target: { value: "2026-09-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Save new date" }));
    await waitFor(() => expect(values.maintenance.rescheduleVisit).toHaveBeenCalledWith("visit-2", 1, "2026-09-01"));
  });

  it("pauses a Maintenance relationship with an optional reason, never touching the Project", async () => {
    const values = contexts();
    wrap(values, "/admin/maintenance/rel-1");
    fireEvent.click(screen.getByRole("button", { name: "Pause Maintenance" }));
    fireEvent.change(screen.getByLabelText(/^Reason/), { target: { value: "Off-season" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(values.maintenance.pauseRelationship).toHaveBeenCalledWith("rel-1", 2, "Off-season"));
  });

  it("requires a reason before ending a Maintenance relationship", async () => {
    const values = contexts();
    wrap(values, "/admin/maintenance/rel-1");
    fireEvent.click(screen.getByRole("button", { name: "End Maintenance" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(values.maintenance.endRelationship).not.toHaveBeenCalled();
  });

  it("ends a Maintenance relationship with a reason, never touching the Project", async () => {
    const values = contexts();
    wrap(values, "/admin/maintenance/rel-1");
    fireEvent.click(screen.getByRole("button", { name: "End Maintenance" }));
    fireEvent.change(screen.getByLabelText(/^Reason/), { target: { value: "Client discontinued service" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(values.maintenance.endRelationship).toHaveBeenCalledWith("rel-1", 2, "Client discontinued service"));
  });

  it("surfaces the database's scheduled-visit gate as a plain error, not a silent failure", async () => {
    const values = contexts({
      endRelationship: vi.fn(() => Promise.resolve({
        ok: false,
        error: "Resolve all scheduled Maintenance visits before ending this relationship.",
      })),
    });
    wrap(values, "/admin/maintenance/rel-1");
    fireEvent.click(screen.getByRole("button", { name: "End Maintenance" }));
    fireEvent.change(screen.getByLabelText(/^Reason/), { target: { value: "Client discontinued service" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByText(/Resolve all scheduled Maintenance visits/)).toBeInTheDocument();
  });

  it("resumes a Paused relationship directly", async () => {
    const values = contexts();
    wrap(values, "/admin/maintenance/rel-2");
    fireEvent.click(screen.getByRole("button", { name: "Resume Maintenance" }));
    await waitFor(() => expect(values.maintenance.resumeRelationship).toHaveBeenCalledWith("rel-2", 1));
  });

  it("assigns an active person without duplicating their identity from People", async () => {
    const values = contexts();
    wrap(values, "/admin/maintenance/rel-1");
    fireEvent.click(screen.getByRole("button", { name: "Assign person" }));
    // Lincoln is already on the current team, so only Grace is offered.
    const options = [...screen.getByLabelText(/^Person$/).options].map((option) => option.textContent);
    expect(options).toContain("Grace Njeri");
    expect(options).not.toContain("Lincoln Waweru");
    fireEvent.change(screen.getByLabelText(/^Person$/), { target: { value: "person-2" } });
    fireEvent.click(screen.getByRole("button", { name: "Assign" }));
    await waitFor(() => expect(values.maintenance.addAssignment).toHaveBeenCalled());
    const [payload, personName] = values.maintenance.addAssignment.mock.calls[0];
    expect(payload).toMatchObject({ relationshipId: "rel-1", personId: "person-2" });
    expect(personName).toBe("Grace Njeri");
  });

  it("ends an assignment, keeping the row as history", async () => {
    const values = contexts();
    wrap(values, "/admin/maintenance/rel-1");
    fireEvent.click(screen.getByRole("button", { name: "End" }));
    await waitFor(() => expect(values.maintenance.endAssignment).toHaveBeenCalled());
    expect(values.maintenance.endAssignment.mock.calls[0][0]).toBe("assign-1");
    expect(values.maintenance.endAssignment.mock.calls[0][1]).toBe(1);
  });

  it("reports a Maintenance relationship that does not exist", () => {
    wrap(contexts(), "/admin/maintenance/missing");
    expect(screen.getByRole("heading", { name: "Maintenance relationship not found" })).toBeInTheDocument();
  });

  it("shows an Ended relationship as historical: no operational controls, history stays visible", () => {
    wrap(contexts(), "/admin/maintenance/rel-3");
    expect(screen.getByRole("heading", { level: 1, name: "Malava Retreat" })).toBeInTheDocument();

    // No path to create new operational state.
    expect(screen.queryByRole("button", { name: "Schedule visit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Assign person" })).not.toBeInTheDocument();
    // No Pause/Resume/End — the relationship is already closed.
    expect(screen.queryByRole("button", { name: "Pause Maintenance" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resume Maintenance" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "End Maintenance" })).not.toBeInTheDocument();
    // No per-visit action controls (this relationship has none Scheduled,
    // matching the database rule, but the check is explicit and fail-safe).
    expect(screen.queryByRole("button", { name: "Complete" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reschedule" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();

    // History remains fully readable.
    expect(screen.getByText("Visit history")).toBeInTheDocument();
    expect(screen.getByText(/Last visit before the relationship ended/)).toBeInTheDocument();
    expect(screen.getByText("Lincoln Waweru")).toBeInTheDocument();
    expect(screen.getByText(/maintenance lead/i)).toBeInTheDocument();
    // The historical assignment has no "End" action — it already ended.
    expect(screen.queryByRole("button", { name: "End" })).not.toBeInTheDocument();
  });

  // ---- Relationship details edit -------------------------------------------

  it("edits scope, start date and frequency with the loaded version", async () => {
    const values = contexts();
    wrap(values, "/admin/maintenance/rel-1");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText(/Maintenance scope/), { target: { value: "Weeding, watering and pruning" } });
    fireEvent.change(screen.getByLabelText(/^Start date/), { target: { value: "2026-08-05" } });
    fireEvent.change(screen.getByLabelText(/^Frequency/), { target: { value: "fortnightly" } });
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));

    await waitFor(() => expect(values.maintenance.editRelationship).toHaveBeenCalled());
    const [id, version, payload] = values.maintenance.editRelationship.mock.calls[0];
    expect(id).toBe("rel-1");
    expect(version).toBe(2);
    expect(payload).toEqual({
      scope: "Weeding, watering and pruning",
      startDate: "2026-08-05",
      frequency: "fortnightly",
    });
    // An ordinary edit never carries lifecycle or project identity.
    expect(payload).not.toHaveProperty("status");
    expect(payload).not.toHaveProperty("projectId");
  });

  it("offers no details edit on an Ended relationship", () => {
    wrap(contexts(), "/admin/maintenance/rel-3");
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("states plainly that a details edit leaves the Project untouched", () => {
    wrap(contexts(), "/admin/maintenance/rel-1");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByText(/linked Project and its status are unchanged/i)).toBeInTheDocument();
    expect(screen.getByText(/moves only through Pause, Resume or End/i)).toBeInTheDocument();
  });

  it("surfaces a stale details edit instead of a false success", async () => {
    const values = contexts({
      editRelationship: vi.fn(() => Promise.resolve({
        ok: false, stale: true,
        error: "This Maintenance relationship was changed elsewhere. Reload and try again.",
      })),
    });
    wrap(values, "/admin/maintenance/rel-1");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    expect(await screen.findByText(/changed elsewhere/i)).toBeInTheDocument();
    expect(screen.queryByText("Maintenance details updated.")).not.toBeInTheDocument();
  });

  // ---- Principal-only assignment correction ---------------------------------

  it("corrects an open assignment's role and start date, with a reason", async () => {
    const values = contexts();
    wrap(values, "/admin/maintenance/rel-1");
    fireEvent.click(screen.getByRole("button", { name: "Correct assignment" }));

    // The person is shown but is not editable — identity never moves.
    expect(screen.getByText("Person")).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Person$/)).not.toBeInTheDocument();
    expect(screen.getByText("Current responsibility")).toBeInTheDocument();
    expect(screen.getByText("Current start date")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Corrected responsibility/), { target: { value: "site_technician" } });
    fireEvent.change(screen.getByLabelText(/Corrected start date/), { target: { value: "2026-08-05" } });
    fireEvent.change(screen.getByLabelText(/Why is this assignment being corrected\?/), {
      target: { value: "Work began 5 Aug; he is the technician, not the lead" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save correction" }));

    await waitFor(() => expect(values.maintenance.correctAssignment).toHaveBeenCalledWith({
      assignmentId: "assign-1",
      expectedVersion: 1,
      role: "site_technician",
      startDate: "2026-08-05",
      correctionReason: "Work began 5 Aug; he is the technician, not the lead",
    }));
  });

  it("requires a correction reason before calling the controlled action", () => {
    const values = contexts();
    wrap(values, "/admin/maintenance/rel-1");
    fireEvent.click(screen.getByRole("button", { name: "Correct assignment" }));
    fireEvent.submit(screen.getByRole("button", { name: "Save correction" }).closest("form"));
    expect(screen.getByText("Explain why this Maintenance assignment is being corrected.")).toBeInTheDocument();
    expect(values.maintenance.correctAssignment).toHaveBeenCalledTimes(0);
  });

  it("keeps correction visually separate from ordinary End", () => {
    wrap(contexts(), "/admin/maintenance/rel-1");
    // Both exist, but they are distinct controls — correction is not the
    // ordinary next step for an assignment.
    expect(screen.getByRole("button", { name: "End" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Correct assignment" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Correct assignment" }));
    expect(screen.getByText(/Correcting a recorded assignment/i)).toBeInTheDocument();
    expect(screen.getByText(/original values and your reason are kept/i)).toBeInTheDocument();
  });

  it("does not offer correction to an Operations Manager", () => {
    wrap(contexts({ role: "manager" }), "/admin/maintenance/rel-1");
    expect(screen.queryByRole("button", { name: "Correct assignment" })).not.toBeInTheDocument();
    // Ordinary resourcing authority is untouched.
    expect(screen.getByRole("button", { name: "End" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Assign person" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("offers no correction on an Ended relationship's historical assignments", () => {
    wrap(contexts(), "/admin/maintenance/rel-3");
    expect(screen.queryByRole("button", { name: "Correct assignment" })).not.toBeInTheDocument();
  });

  it("surfaces the database refusal to correct an ended assignment", async () => {
    const values = contexts({
      correctAssignment: vi.fn(() => Promise.resolve({
        ok: false,
        error: "This Maintenance assignment has ended and is historical; it cannot be corrected.",
      })),
    });
    wrap(values, "/admin/maintenance/rel-1");
    fireEvent.click(screen.getByRole("button", { name: "Correct assignment" }));
    fireEvent.change(screen.getByLabelText(/Why is this assignment being corrected\?/), {
      target: { value: "Recording error" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save correction" }));
    expect(await screen.findByText(/ended and is historical/i)).toBeInTheDocument();
  });

  // ---- Non-scope ------------------------------------------------------------

  it("introduces no Finance, visit-backfill or Tools & Equipment surface", () => {
    wrap(contexts(), "/admin/maintenance/rel-1");
    expect(screen.queryByText(/KES/)).not.toBeInTheDocument();
    expect(screen.queryByText(/[Cc]ost/)).not.toBeInTheDocument();
    expect(screen.queryByText(/[Pp]ayment/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tools|Equipment/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /[Bb]ackfill|[Ii]mport/ })).not.toBeInTheDocument();
  });

  it("denies the detail view to a staff reader", () => {
    wrap(contexts({ role: "staff" }), "/admin/maintenance/rel-1");
    expect(screen.getByRole("heading", { name: "Maintenance unavailable" })).toBeInTheDocument();
  });
});
