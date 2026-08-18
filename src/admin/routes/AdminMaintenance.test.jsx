import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { DailySiteOperationsContext } from "../context/dailySiteOperations";
import { MaintenanceContext } from "../context/maintenance";
import { PeopleContext } from "../context/people";
import AdminMaintenance from "./AdminMaintenance";
import AdminMaintenanceDetail from "./AdminMaintenanceDetail";

const register = [
  { id: "rel-1", projectId: "p1", projectName: "Kitusuru Residence House 0.8A", projectStatus: "Ongoing", status: "active", scope: "Routine garden maintenance", frequency: "weekly", startDate: "2026-08-05", version: 2, lastVisitDate: "", nextVisitDate: "2026-08-17", assignedTeam: [{ person_id: "person-1", full_name: "Kefa Nyamari Ochenge", role: "site_technician" }] },
  { id: "rel-2", projectId: "p2", projectName: "Lugulu Residential Home", projectStatus: "Completed", status: "active", scope: "Attend when requested", frequency: "as_needed", startDate: "2026-08-01", version: 1, lastVisitDate: "", nextVisitDate: "", assignedTeam: [{ person_id: "person-2", full_name: "Martine Lotom", role: "supervisor" }] },
  { id: "rel-3", projectId: "p3", projectName: "Inspection Only Site", projectStatus: "Completed", status: "active", scope: "Inspection and one-off maintenance", frequency: "as_needed", startDate: "2026-08-01", version: 1, lastVisitDate: "", nextVisitDate: "", assignedTeam: [] },
];
const visits = [{ id: "visit-1", relationshipId: "rel-1", scheduledDate: "2026-08-17", status: "scheduled", purpose: "Weeding, removing weeds, trimming and watering", completedAt: "", completionNote: "", cancellationReason: "", dailySiteEntryId: "", completionOutcome: "", followUpRequired: false, followUpNote: "", version: 2 }];
const assignments = [
  { id: "assign-1", relationshipId: "rel-1", personId: "person-1", personName: "Kefa Nyamari Ochenge", role: "site_technician", startDate: "2026-08-05", endDate: "", version: 1 },
  { id: "assign-2", relationshipId: "rel-2", personId: "person-2", personName: "Martine Lotom", role: "supervisor", startDate: "2026-08-01", endDate: "", version: 1 },
];
const entries = [
  { id: "dsr-1", projectId: "p1", workDate: "2026-08-17", disposition: "working", expectedWorkerCount: 1, workPlanned: "Maintenance", evidenceStatus: "none", state: "accepted", updatedAt: "2026-08-17T10:58:00Z" },
];
const people = [
  { id: "person-1", fullName: "Kefa Nyamari Ochenge", isActive: true },
  { id: "person-2", fullName: "Martine Lotom", isActive: true },
  { id: "person-3", fullName: "Lincoln Waweru", isActive: true },
];

function values(overrides = {}) {
  const role = overrides.role || "owner";
  const maintenanceOverrides = overrides.maintenance || {};
  const effectiveRegister = maintenanceOverrides.register || register;
  const effectiveVisits = maintenanceOverrides.visits || visits;
  const effectiveAssignments = maintenanceOverrides.assignments || assignments;
  return {
    admin: { role },
    daily: { entries, status: "ready", error: "", ...overrides.daily },
    people: { people, ...overrides.people },
    maintenance: {
      register: effectiveRegister,
      visits: effectiveVisits,
      assignments: effectiveAssignments,
      eligibleProjects: [{ id: "p4", projectName: "New Maintenance Site", status: "Completed" }],
      status: "ready", error: "",
      addRelationship: vi.fn(() => Promise.resolve({ ok: true })),
      editRelationship: vi.fn(() => Promise.resolve({ ok: true })),
      pauseRelationship: vi.fn(() => Promise.resolve({ ok: true })),
      resumeRelationship: vi.fn(() => Promise.resolve({ ok: true })),
      endRelationship: vi.fn(() => Promise.resolve({ ok: true })),
      addVisit: vi.fn(() => Promise.resolve({ ok: true })),
      rescheduleVisit: vi.fn(() => Promise.resolve({ ok: true })),
      completeVisitCycle: vi.fn(() => Promise.resolve({ ok: true })),
      cancelVisit: vi.fn(() => Promise.resolve({ ok: true })),
      addAssignment: vi.fn(() => Promise.resolve({ ok: true })),
      endAssignment: vi.fn(() => Promise.resolve({ ok: true })),
      correctAssignment: vi.fn(() => Promise.resolve({ ok: true })),
      visitsForRelationship: (id) => effectiveVisits.filter((visit) => visit.relationshipId === id),
      assignmentsForRelationship: (id) => effectiveAssignments.filter((assignment) => assignment.relationshipId === id),
      ...maintenanceOverrides,
    },
  };
}

function wrap(context, initial = "/admin/maintenance") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <AdminDataContext.Provider value={context.admin}>
        <DailySiteOperationsContext.Provider value={context.daily}>
          <PeopleContext.Provider value={context.people}>
            <MaintenanceContext.Provider value={context.maintenance}>
              <Routes>
                <Route path="/admin/maintenance" element={<AdminMaintenance />} />
                <Route path="/admin/maintenance/:relationshipId" element={<AdminMaintenanceDetail />} />
                <Route path="/admin/daily-site-operations/:entryId" element={<div>Daily Site Detail</div>} />
                <Route path="/admin/daily-site-operations/new" element={<div>New Daily Site Record</div>} />
                <Route path="/admin/projects/:projectId" element={<div>Project Detail</div>} />
              </Routes>
            </MaintenanceContext.Provider>
          </PeopleContext.Provider>
        </DailySiteOperationsContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>,
  );
}

describe("Maintenance workboard", () => {
  it("turns accepted same-day execution into Needs closure", () => {
    wrap(values());
    expect(screen.getByRole("heading", { level: 1, name: "Maintenance" })).toBeInTheDocument();
    expect(screen.getAllByText("Needs closure").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Kitusuru Residence House 0.8A").length).toBeGreaterThan(0);
  });

  it("keeps as-needed and unassigned sites visible and schedulable", () => {
    wrap(values());
    expect(screen.getAllByText("Lugulu Residential Home").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Inspection Only Site").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Schedule visit").length).toBeGreaterThanOrEqual(2);
  });

  it("counts only real outstanding follow-up", () => {
    const followUpVisit = { id: "visit-follow", relationshipId: "rel-3", scheduledDate: "2026-08-16", status: "completed", purpose: "Inspection", completedAt: "2026-08-16T09:00:00Z", completionNote: "Inspection completed", cancellationReason: "", dailySiteEntryId: "dsr-follow", completionOutcome: "partial", followUpRequired: true, followUpNote: "Return to repair irrigation leak", version: 2 };
    wrap(values({ maintenance: { visits: [...visits, followUpVisit] } }));
    expect(screen.getByText("Follow-up").parentElement).toHaveTextContent("1");
    expect(screen.getByText("Follow-up outstanding")).toBeInTheDocument();
    expect(screen.getByText(/Return to repair irrigation leak/)).toBeInTheDocument();
  });

  it("treats a later non-cancelled visit as covering the follow-up", () => {
    const followUpVisit = { id: "visit-follow", relationshipId: "rel-3", scheduledDate: "2026-08-16", status: "completed", purpose: "Inspection", completedAt: "2026-08-16T09:00:00Z", completionNote: "Inspection completed", cancellationReason: "", dailySiteEntryId: "dsr-follow", completionOutcome: "partial", followUpRequired: true, followUpNote: "Return to repair irrigation leak", version: 2 };
    const laterVisit = { id: "visit-later", relationshipId: "rel-3", scheduledDate: "2026-08-21", status: "scheduled", purpose: "Repair irrigation leak", completedAt: "", completionNote: "", cancellationReason: "", dailySiteEntryId: "", completionOutcome: "", followUpRequired: false, followUpNote: "", version: 1 };
    wrap(values({ maintenance: { visits: [...visits, followUpVisit, laterVisit] } }));
    expect(screen.getByText("Follow-up").parentElement).toHaveTextContent("0");
    expect(screen.queryByText("Follow-up outstanding")).not.toBeInTheDocument();
  });

  it("keeps the permanent register collapsed by default", () => {
    wrap(values());
    expect(screen.queryByRole("columnheader", { name: "Arrangement" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View register" }));
    expect(screen.getByRole("columnheader", { name: "Arrangement" })).toBeInTheDocument();
  });

  it("starts Maintenance without changing Project lifecycle", async () => {
    const context = values();
    wrap(context);
    fireEvent.click(screen.getByRole("button", { name: "Start Maintenance" }));
    fireEvent.change(screen.getByLabelText("Project / site"), { target: { value: "p4" } });
    fireEvent.change(screen.getByLabelText("Scope"), { target: { value: "  Weekly lawn care  " } });
    fireEvent.click(screen.getByRole("button", { name: "Start Maintenance" }));
    await waitFor(() => expect(context.maintenance.addRelationship).toHaveBeenCalledWith(expect.objectContaining({ projectId: "p4", scope: "Weekly lawn care" })));
  });
});

describe("Maintenance detail scheduling and RBAC", () => {
  it("does not offer duplicate field entry when scheduled date already has a DSR", () => {
    wrap(values(), "/admin/maintenance/rel-1");
    expect(screen.getByText("Current cycle")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Record field work" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /DSR: Accepted/ }).length).toBeGreaterThan(0);
  });

  it("never preselects the next visit when closing an accepted visit", async () => {
    const context = values();
    wrap(context, "/admin/maintenance/rel-1");
    fireEvent.click(screen.getByRole("button", { name: "Complete visit" }));
    expect(screen.getByRole("heading", { name: "Close visit" })).toBeInTheDocument();
    const scheduleAnother = screen.getByLabelText("Schedule another visit");
    expect(scheduleAnother).not.toBeChecked();
    expect(screen.queryByLabelText("Date")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save completion" }));
    await waitFor(() => expect(context.maintenance.completeVisitCycle).toHaveBeenCalledWith(expect.objectContaining({ nextScheduledDate: "", nextPurpose: "" })));
  });

  it("allows a new explicit date only after operator chooses another visit", () => {
    wrap(values(), "/admin/maintenance/rel-1");
    fireEvent.click(screen.getByRole("button", { name: "Complete visit" }));
    fireEvent.click(screen.getByLabelText("Schedule another visit"));
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
    expect(screen.getByLabelText("Work planned")).toBeInTheDocument();
  });

  it("shows one Schedule visit action for an as-needed relationship with no current visit", () => {
    wrap(values(), "/admin/maintenance/rel-2");
    expect(screen.getByRole("button", { name: "Schedule visit" })).toBeInTheDocument();
    expect(screen.getAllByText("No visit scheduled").length).toBeGreaterThan(0);
  });

  it("surfaces an outstanding follow-up and prefills its work", () => {
    const followUpVisit = { id: "visit-follow", relationshipId: "rel-2", scheduledDate: "2026-08-16", status: "completed", purpose: "Inspection", completedAt: "2026-08-16T09:00:00Z", completionNote: "Inspection completed", cancellationReason: "", dailySiteEntryId: "dsr-follow", completionOutcome: "partial", followUpRequired: true, followUpNote: "Return to repair irrigation leak", version: 2 };
    wrap(values({ maintenance: { visits: [...visits, followUpVisit] } }), "/admin/maintenance/rel-2");
    expect(screen.getAllByText("Follow-up outstanding").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Return to repair irrigation leak/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Schedule follow-up" }));
    expect(screen.getByLabelText("Work planned")).toHaveValue("Return to repair irrigation leak");
    expect(screen.getByRole("button", { name: "Save visit" })).toBeInTheDocument();
  });

  it("does not offer visit scheduling while Maintenance is paused", () => {
    const pausedRegister = register.map((item) => item.id === "rel-2" ? { ...item, status: "paused" } : item);
    wrap(values({ maintenance: { register: pausedRegister } }), "/admin/maintenance/rel-2");
    expect(screen.queryByRole("button", { name: "Schedule visit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add visit" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resume Maintenance" })).toBeInTheDocument();
  });

  it("lets Operations Manager manage ordinary visits but not terminal closure or historical correction", () => {
    wrap(values({ role: "manager" }), "/admin/maintenance/rel-1");
    expect(screen.getByRole("button", { name: "Complete visit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause Maintenance" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add visit" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "End Maintenance" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Correct assignment" })).not.toBeInTheDocument();
  });

  it("keeps terminal closure and historical assignment correction with Principal", () => {
    wrap(values({ role: "owner" }), "/admin/maintenance/rel-1");
    expect(screen.getByRole("button", { name: "End Maintenance" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Correct assignment" })).toBeInTheDocument();
  });

  it("denies Maintenance to Project Team", () => {
    wrap(values({ role: "staff" }));
    expect(screen.getByRole("heading", { name: "Maintenance unavailable" })).toBeInTheDocument();
  });
});
