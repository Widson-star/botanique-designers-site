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
    startDate: "2026-08-01", version: 2, lastVisitDate: "", nextVisitDate: "2026-08-20",
    assignedTeam: [{ person_id: "person-1", full_name: "Lincoln Waweru", role: "maintenance_lead" }],
  },
  {
    id: "rel-2", projectId: "p2", projectName: "Alego Usonga", projectStatus: "Ongoing",
    status: "active", scope: "Attend when requested", frequency: "as_needed",
    startDate: "2026-08-01", version: 1, lastVisitDate: "", nextVisitDate: "",
    assignedTeam: [{ person_id: "person-2", full_name: "Grace Njeri", role: "site_technician" }],
  },
];

const visits = [
  { id: "visit-1", relationshipId: "rel-1", scheduledDate: "2026-08-20", status: "scheduled", purpose: "Routine weekly upkeep", completionNote: "", cancellationReason: "", version: 1 },
  { id: "visit-2", relationshipId: "rel-1", scheduledDate: "2026-08-05", status: "completed", purpose: "Lawn and borders", completionNote: "Lawn mowed and borders trimmed.", cancellationReason: "", version: 2 },
];

const assignments = [
  { id: "assign-1", relationshipId: "rel-1", personId: "person-1", personName: "Lincoln Waweru", role: "maintenance_lead", startDate: "2026-08-01", endDate: "", version: 1 },
  { id: "assign-2", relationshipId: "rel-2", personId: "person-2", personName: "Grace Njeri", role: "site_technician", startDate: "2026-08-01", endDate: "", version: 1 },
];

const entries = [
  {
    id: "dsr-1", projectId: "p1", workDate: "2026-08-17", disposition: "working",
    expectedWorkerCount: 2, crewReference: "Lincoln + casual", workPlanned: "Regular maintenance and touchups",
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
    expectedWorkerCount: 1, crewReference: "Grace", workPlanned: "As-needed touchup",
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

describe("Maintenance operational register", () => {
  it("shows actual field activity next to the Maintenance plan", () => {
    wrap(values());
    expect(screen.getByRole("heading", { level: 1, name: "Maintenance" })).toBeInTheDocument();
    expect(screen.getByText("Lugulu Residential Home")).toBeInTheDocument();
    expect(screen.getAllByText("17 Aug 2026").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Regular maintenance and touchups/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Implementation work before maintenance started/)).not.toBeInTheDocument();
  });

  it("treats promised evidence as an operational follow-up", () => {
    wrap(values());
    expect(screen.getAllByText(/Evidence promised/).length).toBeGreaterThan(0);
    expect(screen.getByText("Needs attention").parentElement).toHaveTextContent("1");
  });

  it("does not require a next scheduled visit for as-needed maintenance", () => {
    wrap(values());
    const row = screen.getByText("Alego Usonga").closest("li");
    expect(row).toHaveTextContent("As needed");
    expect(row).not.toHaveTextContent("Next visit is not scheduled");
  });

  it("starts a new Maintenance relationship without changing the linked Project lifecycle", async () => {
    const context = values();
    wrap(context);
    fireEvent.click(screen.getByRole("button", { name: "Start Maintenance" }));
    fireEvent.change(screen.getByLabelText("Project / site"), { target: { value: "p3" } });
    fireEvent.change(screen.getByLabelText("Maintenance scope"), { target: { value: "  Weekly lawn care  " } });
    fireEvent.click(screen.getByRole("button", { name: "Start Maintenance" }));
    await waitFor(() => expect(context.maintenance.addRelationship).toHaveBeenCalledWith(expect.objectContaining({ projectId: "p3", scope: "Weekly lawn care" })));
  });
});

describe("Maintenance operating detail", () => {
  it("keeps an active Maintenance operation usable when the Project itself is Completed", () => {
    wrap(values(), "/admin/maintenance/rel-1");
    expect(screen.getByText(/Project status: Completed/)).toBeInTheDocument();
    const recordLinks = screen.getAllByRole("link", { name: "Record field work" });
    expect(recordLinks[0]).toHaveAttribute("href", "/admin/daily-site-operations/new?project=p1");
  });

  it("shows plan, execution, evidence and follow-up without duplicating the Daily Site Record", () => {
    wrap(values(), "/admin/maintenance/rel-1");
    expect(screen.getByText("Operating position")).toBeInTheDocument();
    expect(screen.getByText("Field execution · Daily Site Record")).toBeInTheDocument();
    expect(screen.getAllByText(/Regular maintenance and touchups/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Evidence promised").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Open latest site record" })).toHaveAttribute("href", "/admin/daily-site-operations/dsr-1");
  });

  it("does not misclassify pre-Maintenance implementation records as Maintenance execution", () => {
    wrap(values(), "/admin/maintenance/rel-1");
    expect(screen.queryByText(/Implementation work before maintenance started/)).not.toBeInTheDocument();
  });

  it("still schedules and completes Maintenance visits", async () => {
    const context = values();
    wrap(context, "/admin/maintenance/rel-1");
    fireEvent.click(screen.getByRole("button", { name: "Complete" }));
    fireEvent.change(screen.getByLabelText("Completed work / result"), { target: { value: "Visit completed; irrigation checked." } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(context.maintenance.completeVisit).toHaveBeenCalledWith("visit-1", 1, "Visit completed; irrigation checked."));
  });

  it("keeps team assignment operational", async () => {
    const context = values();
    wrap(context, "/admin/maintenance/rel-1");
    fireEvent.click(screen.getByRole("button", { name: "Assign person" }));
    fireEvent.change(screen.getByLabelText("Person"), { target: { value: "person-3" } });
    fireEvent.click(screen.getByRole("button", { name: "Assign" }));
    await waitFor(() => expect(context.maintenance.addAssignment).toHaveBeenCalledWith(expect.objectContaining({ relationshipId: "rel-1", personId: "person-3" })));
  });

  it("denies Maintenance to a staff reader", () => {
    const context = values({ role: "staff" });
    wrap(context);
    expect(screen.getByRole("heading", { name: "Maintenance unavailable" })).toBeInTheDocument();
  });
});
