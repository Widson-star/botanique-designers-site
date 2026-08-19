import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { DailySiteOperationsContext } from "../context/dailySiteOperations";
import { MaintenanceContext } from "../context/maintenance";
import { PeopleContext } from "../context/people";
import AdminMaintenance from "./AdminMaintenance";
import AdminMaintenanceDetail from "./AdminMaintenanceDetail";

const register = [
  { id: "rel-1", siteId: "s1", siteName: "Kitusuru Residence House 0.8A", siteLocation: "Kitusuru", siteCounty: "Nairobi", projectId: "p1", projectName: "Kitusuru Residence House 0.8A", projectStatus: "Ongoing", status: "active", scope: "Routine garden maintenance", frequency: "weekly", startDate: "2026-08-05", version: 2, lastVisitDate: "", nextVisitDate: "2026-08-17", assignedTeam: [{ person_id: "person-1", full_name: "Kefa Nyamari Ochenge", role: "site_technician" }] },
  { id: "rel-2", siteId: "s2", siteName: "Lugulu Residential Home", siteLocation: "Lugulu", siteCounty: "Bungoma", projectId: "p2", projectName: "Lugulu Residential Home", projectStatus: "Completed", status: "active", scope: "Attend when requested", frequency: "as_needed", startDate: "2026-08-01", version: 1, lastVisitDate: "", nextVisitDate: "", assignedTeam: [{ person_id: "person-2", full_name: "Martine Lotom", role: "supervisor" }] },
  { id: "rel-3", siteId: "s3", siteName: "Inspection Only Site", siteLocation: "", siteCounty: "", projectId: "", projectName: "", projectStatus: "", status: "active", scope: "Inspection and one-off maintenance", frequency: "as_needed", startDate: "2026-08-01", version: 1, lastVisitDate: "", nextVisitDate: "", assignedTeam: [] },
];
const visits = [{ id: "visit-1", relationshipId: "rel-1", scheduledDate: "2026-08-17", status: "scheduled", purpose: "Weeding, removing weeds, trimming and watering", completedAt: "", completionNote: "", cancellationReason: "", dailySiteEntryId: "", completionOutcome: "", followUpRequired: false, followUpNote: "", version: 2 }];
const assignments = [
  { id: "assign-1", relationshipId: "rel-1", personId: "person-1", personName: "Kefa Nyamari Ochenge", role: "site_technician", startDate: "2026-08-05", endDate: "", version: 1 },
  { id: "assign-2", relationshipId: "rel-2", personId: "person-2", personName: "Martine Lotom", role: "supervisor", startDate: "2026-08-01", endDate: "", version: 1 },
];
const entries = [
  { id: "dsr-1", siteId: "s1", projectId: "p1", maintenanceVisitId: "", workDate: "2026-08-17", disposition: "working", expectedWorkerCount: 1, workPlanned: "Maintenance", evidenceStatus: "none", state: "accepted", updatedAt: "2026-08-17T10:58:00Z" },
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
      eligibleSites: [{ id: "s4", siteName: "New Maintenance Site", location: "Karen", county: "Nairobi", projects: [] }],
      status: "ready", error: "",
      addRelationship: vi.fn(() => Promise.resolve({ ok: true })),
      addMaintenanceSite: vi.fn(() => Promise.resolve({ ok: true, record: { id: "s-new", siteName: "Riverside Court", location: "", county: "", projects: [] } })),
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

// The Site name of a quiet relationship still appears in the register, the
// team panel and the recent-visit list, so a workboard assertion must say it
// means the workboard.
const workboard = () => within(screen.getByRole("heading", { name: "Maintenance workboard" }).closest("section"));

describe("Maintenance workboard", () => {
  it("turns accepted same-day execution into Needs closure", () => {
    wrap(values());
    expect(screen.getByRole("heading", { level: 1, name: "Maintenance" })).toBeInTheDocument();
    expect(screen.getAllByText("Needs closure").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Kitusuru Residence House 0.8A").length).toBeGreaterThan(0);
  });

  it("keeps a cadence relationship with no next visit schedulable", () => {
    // Weekly work that has no next visit is a real gap, so it still surfaces.
    const noVisitRegister = [{ ...register[0], nextVisitDate: "" }];
    wrap(values({ maintenance: { register: noVisitRegister, visits: [] } }));
    expect(workboard().getAllByText("Kitusuru Residence House 0.8A").length).toBeGreaterThan(0);
    expect(workboard().getByText("No visit scheduled")).toBeInTheDocument();
    expect(workboard().getByRole("link", { name: "Schedule visit \u2192" })).toBeInTheDocument();
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

  it("asks the operator to identify the field record when a Site has two same-date candidates", () => {
    // One physical Site may hold several Projects, so two unlinked records can
    // share a date. The Hub must not pick one.
    const context = values({
      daily: { entries: [
        { id: "dsr-a", siteId: "s1", projectId: "p1", maintenanceVisitId: "", workDate: "2026-08-17", disposition: "working", expectedWorkerCount: 1, workPlanned: "Maintenance", evidenceStatus: "none", state: "accepted", updatedAt: "2026-08-17T10:00:00Z" },
        { id: "dsr-b", siteId: "s1", projectId: "p9", maintenanceVisitId: "", workDate: "2026-08-17", disposition: "working", expectedWorkerCount: 2, workPlanned: "Remedial works", evidenceStatus: "none", state: "accepted", updatedAt: "2026-08-17T11:00:00Z" },
      ] },
    });
    wrap(context);
    expect(screen.getAllByText("Identify field record").length).toBeGreaterThan(0);
  });

  it("uses the durable Maintenance visit link ahead of any same-date candidate", () => {
    const context = values({
      daily: { entries: [
        { id: "dsr-linked", siteId: "s1", projectId: "", maintenanceVisitId: "visit-1", workDate: "2026-08-17", disposition: "working", expectedWorkerCount: 1, workPlanned: "Maintenance", evidenceStatus: "none", state: "accepted", updatedAt: "2026-08-17T10:00:00Z" },
        { id: "dsr-other", siteId: "s1", projectId: "p9", maintenanceVisitId: "", workDate: "2026-08-17", disposition: "working", expectedWorkerCount: 2, workPlanned: "Remedial works", evidenceStatus: "none", state: "accepted", updatedAt: "2026-08-17T11:00:00Z" },
      ] },
    });
    wrap(context);
    // Unambiguous: the linked record is this visit's execution truth.
    expect(screen.queryByText("Identify field record")).not.toBeInTheDocument();
    expect(screen.getAllByText("Needs closure").length).toBeGreaterThan(0);
  });

  it("leads a maintenance-only Site with its Site name and invents no Project", () => {
    // rel-3 has no Project at all. Give it a scheduled visit so it is on the
    // workboard at all, and the workboard must still name the property.
    const visit = { id: "visit-only", relationshipId: "rel-3", scheduledDate: "2026-08-20", status: "scheduled", purpose: "Inspection", completedAt: "", completionNote: "", cancellationReason: "", dailySiteEntryId: "", completionOutcome: "", followUpRequired: false, followUpNote: "", version: 1 };
    wrap(values({ maintenance: { visits: [...visits, visit] } }));
    expect(workboard().getByText("Inspection Only Site")).toBeInTheDocument();
    expect(screen.queryByText("Unknown project")).not.toBeInTheDocument();
  });

  it("starts Maintenance on a Site that has no Botanique Project", async () => {
    const context = values();
    wrap(context);
    fireEvent.click(screen.getByRole("button", { name: "Start Maintenance" }));
    fireEvent.change(screen.getByLabelText("Site / property"), { target: { value: "s4" } });
    // The Site carries no Projects, so no Project selector is offered at all.
    expect(screen.queryByLabelText("Related Botanique Project (optional)")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Scope"), { target: { value: "Grounds upkeep" } });
    fireEvent.click(screen.getByRole("button", { name: "Start Maintenance" }));
    await waitFor(() => expect(context.maintenance.addRelationship).toHaveBeenCalledWith(
      expect.objectContaining({ siteId: "s4", projectId: "", scope: "Grounds upkeep" })
    ));
  });

  it("creates a Site for a property Botanique did not build", async () => {
    const context = values();
    wrap(context);
    fireEvent.click(screen.getByRole("button", { name: "Start Maintenance" }));
    fireEvent.click(screen.getByRole("button", { name: "Add a Site Botanique did not build" }));
    fireEvent.change(screen.getByLabelText("Site / property name"), { target: { value: "Riverside Court" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Site" }));
    await waitFor(() => expect(context.maintenance.addMaintenanceSite).toHaveBeenCalledWith(
      expect.objectContaining({ siteName: "Riverside Court" })
    ));
    // Immediately selectable for starting Maintenance.
    await waitFor(() => expect(screen.getByLabelText("Site / property")).toBeInTheDocument());
  });

  it("starts Maintenance without changing Project lifecycle", async () => {
    const context = values();
    wrap(context);
    fireEvent.click(screen.getByRole("button", { name: "Start Maintenance" }));
    fireEvent.change(screen.getByLabelText("Site / property"), { target: { value: "s4" } });
    fireEvent.change(screen.getByLabelText("Scope"), { target: { value: "  Weekly lawn care  " } });
    fireEvent.click(screen.getByRole("button", { name: "Start Maintenance" }));
    await waitFor(() => expect(context.maintenance.addRelationship).toHaveBeenCalledWith(expect.objectContaining({ siteId: "s4", scope: "Weekly lawn care" })));
  });
});

// An Active As-needed relationship with nothing scheduled and no outstanding
// follow-up is an ordinary quiet state: Botanique still holds the relationship,
// but nobody is due there until a visit is deliberately scheduled. It should
// not read as unfinished work on the workboard — while remaining fully visible
// everywhere the relationship itself is the subject.
describe("Quiet As-needed Maintenance", () => {
  const asNeededVisit = (overrides) => ({
    id: "visit-x", relationshipId: "rel-2", scheduledDate: "2026-08-20", status: "scheduled",
    purpose: "Attend when requested", completedAt: "", completionNote: "", cancellationReason: "",
    dailySiteEntryId: "", completionOutcome: "", followUpRequired: false, followUpNote: "",
    version: 1, ...overrides,
  });

  it("leaves an active as-needed relationship with nothing due off the workboard", () => {
    wrap(values());
    expect(workboard().queryByText("Lugulu Residential Home")).not.toBeInTheDocument();
    expect(workboard().queryByText("No visit scheduled")).not.toBeInTheDocument();
    expect(workboard().queryByRole("link", { name: "Schedule visit →" })).not.toBeInTheDocument();
  });

  it("applies the same rule to a Site-owned maintenance-only relationship", () => {
    wrap(values());
    // rel-3 has no Botanique Project at all and is equally quiet.
    expect(workboard().queryByText("Inspection Only Site")).not.toBeInTheDocument();
    // Only the weekly relationship with a live visit remains.
    expect(workboard().getAllByText("Kitusuru Residence House 0.8A").length).toBeGreaterThan(0);
  });

  it("keeps the quiet relationship in the Maintenance register as Active", () => {
    wrap(values());
    fireEvent.click(screen.getByRole("button", { name: "View register" }));
    const row = screen.getByRole("cell", { name: "Lugulu Residential Home" }).closest("tr");
    expect(within(row).getByText("Active")).toBeInTheDocument();
    expect(within(row).getByText("As needed")).toBeInTheDocument();
    expect(within(row).getByText("Not scheduled")).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "View →" })).toHaveAttribute("href", "/admin/maintenance/rel-2");
  });

  it("keeps the quiet relationship's assigned-team truth", () => {
    wrap(values());
    const team = within(screen.getByRole("heading", { name: "Assigned team" }).closest("section"));
    expect(team.getByText("Martine Lotom")).toBeInTheDocument();
    expect(team.getByText("Supervisor")).toBeInTheDocument();
  });

  it("brings an as-needed relationship back for an outstanding follow-up", () => {
    const followUp = asNeededVisit({ id: "visit-follow", scheduledDate: "2026-08-16", status: "completed", completedAt: "2026-08-16T09:00:00Z", completionNote: "Attended", completionOutcome: "partial", followUpRequired: true, followUpNote: "Return to repair irrigation leak" });
    wrap(values({ maintenance: { visits: [...visits, followUp] } }));
    expect(workboard().getByText("Lugulu Residential Home")).toBeInTheDocument();
    expect(workboard().getByText("Follow-up outstanding")).toBeInTheDocument();
  });

  it("brings an as-needed relationship back once a visit is scheduled", () => {
    wrap(values({ maintenance: { visits: [...visits, asNeededVisit()] } }));
    expect(workboard().getByText("Lugulu Residential Home")).toBeInTheDocument();
    expect(workboard().getByText("Upcoming")).toBeInTheDocument();
  });

  it("still asks a weekly relationship with no visit to schedule one", () => {
    const weeklyNoVisit = [{ ...register[1], id: "rel-w", siteName: "Weekly Site", frequency: "weekly", assignedTeam: [] }];
    wrap(values({ maintenance: { register: weeklyNoVisit, visits: [] } }));
    expect(workboard().getByText("Weekly Site")).toBeInTheDocument();
    expect(workboard().getByText("No visit scheduled")).toBeInTheDocument();
  });

  it("still asks a monthly relationship with no visit to schedule one", () => {
    const monthlyNoVisit = [{ ...register[1], id: "rel-m", siteName: "Monthly Site", frequency: "monthly", assignedTeam: [] }];
    wrap(values({ maintenance: { register: monthlyNoVisit, visits: [] } }));
    expect(workboard().getByText("Monthly Site")).toBeInTheDocument();
    expect(workboard().getByText("No visit scheduled")).toBeInTheDocument();
  });

  it("counts no quiet relationship as due, overdue, follow-up or needing closure", () => {
    const quietOnly = [register[1], register[2]];
    wrap(values({ maintenance: { register: quietOnly, visits: [] } }));
    for (const label of ["Needs closure", "Due / overdue", "Follow-up"]) {
      expect(screen.getByText(label).parentElement).toHaveTextContent("0");
    }
    expect(workboard().getByText("No active Maintenance action.")).toBeInTheDocument();
  });

  it("leaves recently completed visits untouched", () => {
    const completed = asNeededVisit({ id: "visit-done", scheduledDate: "2026-08-10", status: "completed", completedAt: "2026-08-10T09:00:00Z", completionNote: "Attended once", completionOutcome: "completed" });
    wrap(values({ maintenance: { visits: [...visits, completed] } }));
    const recent = within(screen.getByRole("heading", { name: "Recently completed visits" }).closest("section"));
    expect(recent.getByText("Lugulu Residential Home")).toBeInTheDocument();
    // Completed with no follow-up and nothing next: still quiet on the board.
    expect(workboard().queryByText("Lugulu Residential Home")).not.toBeInTheDocument();
  });

  it("keeps Pause, Resume and End working on the quiet relationship", () => {
    wrap(values(), "/admin/maintenance/rel-2");
    expect(screen.getByRole("button", { name: "Pause Maintenance" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "End Maintenance" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Schedule visit" })).toBeInTheDocument();

    const paused = register.map((item) => item.id === "rel-2" ? { ...item, status: "paused" } : item);
    wrap(values({ maintenance: { register: paused } }), "/admin/maintenance/rel-2");
    expect(screen.getAllByRole("button", { name: "Resume Maintenance" }).length).toBeGreaterThan(0);
  });

  it("keeps End Maintenance with the Principal on a quiet relationship", () => {
    wrap(values({ role: "manager" }), "/admin/maintenance/rel-2");
    expect(screen.getByRole("button", { name: "Pause Maintenance" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "End Maintenance" })).not.toBeInTheDocument();
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
