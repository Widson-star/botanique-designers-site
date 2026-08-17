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
  {
    id: "rel-1", projectId: "p1", projectName: "Lugulu Residential Home", projectStatus: "Completed",
    status: "active", scope: "Lawn, borders and irrigation upkeep", frequency: "weekly",
    startDate: "2026-08-01", version: 2, lastVisitDate: "2026-08-05", nextVisitDate: "2026-08-20",
    assignedTeam: [{ person_id: "person-1", full_name: "Lincoln Waweru", role: "maintenance_lead" }],
  },
  {
    id: "rel-2", projectId: "p2", projectName: "Alego Usonga", projectStatus: "Completed",
    status: "active", scope: "Attend when requested", frequency: "as_needed",
    startDate: "2026-08-01", version: 1, lastVisitDate: "", nextVisitDate: "",
    assignedTeam: [{ person_id: "person-2", full_name: "Grace Njeri", role: "site_technician" }],
  },
];

const visits = [
  { id: "visit-1", relationshipId: "rel-1", scheduledDate: "2026-08-20", status: "scheduled", purpose: "Routine weekly upkeep", completionNote: "", cancellationReason: "", version: 1 },
  { id: "visit-2", relationshipId: "rel-1", scheduledDate: "2026-08-05", status: "completed", purpose: "Lawn and borders", completedAt: "2026-08-05T10:00:00Z", completionNote: "Lawn mowed and borders trimmed.", cancellationReason: "", version: 2 },
];

const assignments = [
  { id: "assign-1", relationshipId: "rel-1", personId: "person-1", personName: "Lincoln Waweru", role: "maintenance_lead", startDate: "2026-08-01", endDate: "", version: 1 },
  { id: "assign-2", relationshipId: "rel-2", personId: "person-2", personName: "Grace Njeri", role: "site_technician", startDate: "2026-08-01", endDate: "", version: 1 },
];

const entries = [
  {
    id: "dsr-1", projectId: "p1", workDate: "2026-08-17", disposition: "working",
    expectedWorkerCount: 2, crewReference: "casual crew", workPlanned: "Regular maintenance and touchups",
    notes: "Watered borders and trimmed lawn edges.", evidenceStatus: "promised", state: "accepted",
    updatedAt: "2026-08-17T10:00:00Z",
  },
  {
    id: "dsr-old", projectId: "p1", workDate: "2026-07-20", disposition: "working",
    expectedWorkerCount: 3, workPlanned: "Implementation work before maintenance started",
    notes: "", evidenceStatus: "provided", state: "accepted", updatedAt: "2026-07-20T10:00:00Z",
  },
  {
    id: "dsr-2", projectId: "p2", workDate: "2026-08-16", disposition: "working",
    expectedWorkerCount: 1, crewReference: "casual crew", workPlanned: "As-needed touchup",
    notes: "", evidenceStatus: "provided", state: "accepted", updatedAt: "2026-08-16T10:00:00Z",
  },
];

const people = [
  { id: "person-1", fullName: "Lincoln Waweru", isActive: true },
  { id: "person-2", fullName: "Grace Njeri", isActive: true },
  { id: "person-3", fullName: "Kefa Nyamari Ochenge", isActive: true },
];

function values(overrides = {}) {
  const role = overrides.role || "owner";
  return {
    admin: { role },
    daily: { entries, status: "ready", error: "" },
    people: { people },
    maintenance: {
      register, visits, assignments,
      eligibleProjects: [{ id: "p3", projectName: "New Maintenance Site", status: "Completed" }],
      status: "ready", error: "",
      addRelationship: vi.fn(() => Promise.resolve({ ok: true })),
      editRelationship: vi.fn(() => Promise.resolve({ ok: true })),
      pauseRelationship: vi.fn(() => Promise.resolve({ ok: true })),
      resumeRelationship: vi.fn(() => Promise.resolve({ ok: true })),
      endRelationship: vi.fn(() => Promise.resolve({ ok: true })),
      addVisit: vi.fn(() => Promise.resolve({ ok: true })),
      rescheduleVisit: vi.fn(() => Promise.resolve({ ok: true })),
      completeVisit: vi.fn(() => Promise.resolve({ ok: true })),
      cancelVisit: vi.fn(() => Promise.resolve({ ok: true })),
      addAssignment: vi.fn(() => Promise.resolve({ ok: true })),
      endAssignment: vi.fn(() => Promise.resolve({ ok: true })),
      correctAssignment: vi.fn(() => Promise.resolve({ ok: true })),
      visitsForRelationship: (id) => visits.filter((visit) => visit.relationshipId === id),
      assignmentsForRelationship: (id) => assignments.filter((assignment) => assignment.relationshipId === id),
      ...overrides.maintenance,
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
              </Routes>
            </MaintenanceContext.Provider>
          </PeopleContext.Provider>
        </DailySiteOperationsContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
}

describe("Maintenance authority-led landing", () => {
  it("puts visit planning, follow-up and completed work ahead of Daily Site Record activity", () => {
    wrap(values());
    expect(screen.getByRole("heading", { level: 1, name: "Maintenance" })).toBeInTheDocument();
    expect(screen.getByText("Scheduled visits").parentElement).toHaveTextContent("1");
    expect(screen.getByText("Next due visits").parentElement).toHaveTextContent("1");
    expect(screen.getByText("Sites needing follow-up").parentElement).toHaveTextContent("1");
    expect(screen.getByText("Completed visits").parentElement).toHaveTextContent("1");
    expect(screen.getByRole("heading", { name: "Upcoming scheduled visits" })).toBeInTheDocument();
    expect(screen.getByText("Routine weekly upkeep")).toBeInTheDocument();
  });

  it("shows current maintenance responsibility and genuine recorded notes", () => {
    wrap(values());
    expect(screen.getByRole("heading", { name: "Assigned maintenance team" })).toBeInTheDocument();
    expect(screen.getAllByText("Lincoln Waweru").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Grace Njeri").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Recent maintenance notes" })).toBeInTheDocument();
    expect(screen.getByText("Lawn mowed and borders trimmed.")).toBeInTheDocument();
    expect(screen.getByText("Watered borders and trimmed lawn edges.")).toBeInTheDocument();
  });

  it("keeps Daily Site Record as supporting execution and excludes pre-Maintenance implementation work", () => {
    wrap(values());
    expect(screen.getByRole("heading", { name: "Recent field execution" })).toBeInTheDocument();
    expect(screen.getAllByText(/Regular maintenance and touchups/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Implementation work before maintenance started/)).not.toBeInTheDocument();
  });

  it("does not create a schedule gap for as-needed maintenance", () => {
    wrap(values());
    const row = screen.getByText("Alego Usonga").closest("tr");
    expect(row).toHaveTextContent("As needed");
    expect(screen.getByText("Sites needing follow-up").parentElement).toHaveTextContent("1");
  });

  it("starts a Maintenance relationship without changing the linked Project lifecycle", async () => {
    const context = values();
    wrap(context);
    fireEvent.click(screen.getByRole("button", { name: "Start Maintenance" }));
    fireEvent.change(screen.getByLabelText("Project / site"), { target: { value: "p3" } });
    fireEvent.change(screen.getByLabelText("Maintenance scope"), { target: { value: "  Weekly lawn care  " } });
    fireEvent.click(screen.getByRole("button", { name: "Start Maintenance" }));
    await waitFor(() => expect(context.maintenance.addRelationship).toHaveBeenCalledWith(expect.objectContaining({ projectId: "p3", scope: "Weekly lawn care" })));
  });
});

describe("Maintenance RBAC and operating detail", () => {
  it("keeps active Maintenance usable when the Project itself is Completed", () => {
    wrap(values(), "/admin/maintenance/rel-1");
    expect(screen.getByText(/Project status: Completed/)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Record field work" })[0]).toHaveAttribute("href", "/admin/daily-site-operations/new?project=p1");
  });

  it("lets the Operations Manager operate Maintenance but not terminate the service relationship", () => {
    wrap(values({ role: "manager" }), "/admin/maintenance/rel-1");
    expect(screen.getByRole("button", { name: "Pause Maintenance" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Schedule visit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Assign person" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "End Maintenance" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Correct assignment" })).not.toBeInTheDocument();
  });

  it("keeps terminal closure and historical assignment correction with the Principal", () => {
    wrap(values({ role: "owner" }), "/admin/maintenance/rel-1");
    expect(screen.getByRole("button", { name: "End Maintenance" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Correct assignment" })).toBeInTheDocument();
  });

  it("still schedules and completes Maintenance visits", async () => {
    const context = values();
    wrap(context, "/admin/maintenance/rel-1");
    fireEvent.click(screen.getByRole("button", { name: "Complete" }));
    fireEvent.change(screen.getByLabelText("Completed work / result"), { target: { value: "Visit completed; irrigation checked." } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(context.maintenance.completeVisit).toHaveBeenCalledWith("visit-1", 1, "Visit completed; irrigation checked."));
  });

  it("denies Maintenance to Project Team", () => {
    wrap(values({ role: "staff" }));
    expect(screen.getByRole("heading", { name: "Maintenance unavailable" })).toBeInTheDocument();
  });
});
