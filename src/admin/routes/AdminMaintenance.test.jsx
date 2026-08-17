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
  { id: "rel-1", projectId: "p1", projectName: "Kitusuru Residence House 0.8A", projectStatus: "Ongoing", status: "active", scope: "Routine garden maintenance — weeding, watering, pruning and general upkeep.", frequency: "weekly", startDate: "2026-08-05", version: 2, lastVisitDate: "", nextVisitDate: "2026-08-17", assignedTeam: [{ person_id: "person-1", full_name: "Kefa Nyamari Ochenge", role: "site_technician" }] },
  { id: "rel-2", projectId: "p2", projectName: "Lugulu Residential Home", projectStatus: "Completed", status: "active", scope: "Attend when requested", frequency: "as_needed", startDate: "2026-08-01", version: 1, lastVisitDate: "", nextVisitDate: "", assignedTeam: [{ person_id: "person-2", full_name: "Martine Lotom", role: "supervisor" }] },
];
const visits = [{ id: "visit-1", relationshipId: "rel-1", scheduledDate: "2026-08-17", status: "scheduled", purpose: "Weeding, removing weeds, trimming and watering", completedAt: "", completionNote: "", cancellationReason: "", dailySiteEntryId: "", completionOutcome: "", followUpRequired: false, followUpNote: "", version: 2 }];
const assignments = [
  { id: "assign-1", relationshipId: "rel-1", personId: "person-1", personName: "Kefa Nyamari Ochenge", role: "site_technician", startDate: "2026-08-05", endDate: "", version: 1 },
  { id: "assign-2", relationshipId: "rel-2", personId: "person-2", personName: "Martine Lotom", role: "supervisor", startDate: "2026-08-01", endDate: "", version: 1 },
];
const entries = [
  { id: "dsr-1", projectId: "p1", workDate: "2026-08-17", disposition: "working", expectedWorkerCount: 1, crewReference: "casual crew", workPlanned: "Maintenance", notes: "", evidenceStatus: "none", state: "accepted", updatedAt: "2026-08-17T10:58:00Z" },
  { id: "dsr-old", projectId: "p1", workDate: "2026-07-20", disposition: "working", expectedWorkerCount: 3, workPlanned: "Implementation work before maintenance started", notes: "", evidenceStatus: "provided", state: "accepted", updatedAt: "2026-07-20T10:00:00Z" },
];
const people = [
  { id: "person-1", fullName: "Kefa Nyamari Ochenge", isActive: true },
  { id: "person-2", fullName: "Martine Lotom", isActive: true },
  { id: "person-3", fullName: "Lincoln Waweru", isActive: true },
];

function values(overrides = {}) {
  const role = overrides.role || "owner";
  return {
    admin: { role }, daily: { entries, status: "ready", error: "" }, people: { people },
    maintenance: {
      register, visits, assignments, eligibleProjects: [{ id: "p3", projectName: "New Maintenance Site", status: "Completed" }], status: "ready", error: "",
      addRelationship: vi.fn(() => Promise.resolve({ ok: true })), editRelationship: vi.fn(() => Promise.resolve({ ok: true })), pauseRelationship: vi.fn(() => Promise.resolve({ ok: true })), resumeRelationship: vi.fn(() => Promise.resolve({ ok: true })), endRelationship: vi.fn(() => Promise.resolve({ ok: true })), addVisit: vi.fn(() => Promise.resolve({ ok: true })), rescheduleVisit: vi.fn(() => Promise.resolve({ ok: true })), completeVisit: vi.fn(() => Promise.resolve({ ok: true })), completeVisitCycle: vi.fn(() => Promise.resolve({ ok: true })), cancelVisit: vi.fn(() => Promise.resolve({ ok: true })), addAssignment: vi.fn(() => Promise.resolve({ ok: true })), endAssignment: vi.fn(() => Promise.resolve({ ok: true })), correctAssignment: vi.fn(() => Promise.resolve({ ok: true })),
      visitsForRelationship: (id) => visits.filter((visit) => visit.relationshipId === id), assignmentsForRelationship: (id) => assignments.filter((assignment) => assignment.relationshipId === id), ...overrides.maintenance,
    },
  };
}
function wrap(context, initial = "/admin/maintenance") {
  return render(<MemoryRouter initialEntries={[initial]}><AdminDataContext.Provider value={context.admin}><DailySiteOperationsContext.Provider value={context.daily}><PeopleContext.Provider value={context.people}><MaintenanceContext.Provider value={context.maintenance}><Routes><Route path="/admin/maintenance" element={<AdminMaintenance />} /><Route path="/admin/maintenance/:relationshipId" element={<AdminMaintenanceDetail />} /><Route path="/admin/daily-site-operations/:entryId" element={<div>Daily Site Detail</div>} /><Route path="/admin/daily-site-operations/new" element={<div>New Daily Site Record</div>} /><Route path="/admin/projects/:projectId" element={<div>Project Detail</div>} /></Routes></MaintenanceContext.Provider></PeopleContext.Provider></DailySiteOperationsContext.Provider></AdminDataContext.Provider></MemoryRouter>);
}

describe("Maintenance operating workboard", () => {
  it("turns a scheduled visit with accepted same-day DSR into Needs closure", () => {
    wrap(values());
    expect(screen.getByRole("heading", { level: 1, name: "Maintenance" })).toBeInTheDocument();
    expect(screen.getByText("Needs closure").parentElement).toHaveTextContent("1");
    expect(screen.getByRole("heading", { name: "Maintenance workboard" })).toBeInTheDocument();
    expect(screen.getAllByText("Kitusuru Residence House 0.8A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Needs closure").length).toBeGreaterThan(1);
    expect(screen.queryByRole("heading", { name: "Upcoming scheduled visits" })).not.toBeInTheDocument();
  });
  it("does not invent a schedule gap for as-needed Maintenance", () => {
    wrap(values());
    const registerRow = screen.getByText("Lugulu Residential Home").closest("tr");
    expect(registerRow).toHaveTextContent("As needed");
  });
  it("starts Maintenance without changing the Project lifecycle", async () => {
    const context = values(); wrap(context);
    fireEvent.click(screen.getByRole("button", { name: "Start Maintenance" }));
    fireEvent.change(screen.getByLabelText("Project / site"), { target: { value: "p3" } });
    fireEvent.change(screen.getByLabelText("Maintenance scope"), { target: { value: "  Weekly lawn care  " } });
    fireEvent.click(screen.getByRole("button", { name: "Start Maintenance" }));
    await waitFor(() => expect(context.maintenance.addRelationship).toHaveBeenCalledWith(expect.objectContaining({ projectId: "p3", scope: "Weekly lawn care" })));
  });
});

describe("Maintenance cycle detail and RBAC", () => {
  it("does not offer duplicate field entry when the scheduled date already has a DSR", () => {
    wrap(values(), "/admin/maintenance/rel-1");
    expect(screen.getByText("Current Maintenance cycle")).toBeInTheDocument();
    expect(screen.getAllByText("Needs closure").length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Record field work" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /View site record|DSR: Accepted/ }).length).toBeGreaterThan(0);
  });
  it("closes accepted execution and suggests the next weekly visit", async () => {
    const context = values(); wrap(context, "/admin/maintenance/rel-1");
    fireEvent.click(screen.getAllByRole("button", { name: "Complete visit" })[0]);
    expect(screen.getByRole("heading", { name: "Complete Maintenance visit" })).toBeInTheDocument();
    expect(screen.getByLabelText("Next visit")).toHaveValue("2026-08-24");
    fireEvent.click(screen.getByRole("button", { name: "Complete visit and schedule next" }));
    await waitFor(() => expect(context.maintenance.completeVisitCycle).toHaveBeenCalledWith(expect.objectContaining({ visitId: "visit-1", expectedVersion: 2, dailySiteEntryId: "dsr-1", outcome: "completed", followUpRequired: false, nextScheduledDate: "2026-08-24", nextPurpose: "Weeding, removing weeds, trimming and watering" })));
  });
  it("lets Operations Manager close ordinary visits but not end Maintenance or correct history", () => {
    wrap(values({ role: "manager" }), "/admin/maintenance/rel-1");
    expect(screen.getAllByRole("button", { name: "Complete visit" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Pause Maintenance" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Schedule visit" })).toBeInTheDocument();
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
