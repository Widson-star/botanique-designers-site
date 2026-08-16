import { describe, expect, it, vi, beforeEach } from "vitest";
import { useEffect } from "react";
import { act, render, waitFor } from "@testing-library/react";
import { AdminDataContext } from "./adminData";
import MaintenanceProvider from "./MaintenanceProvider";
import { useMaintenance } from "./maintenance";

// The Maintenance route tests inject an already-prepared context value, so
// they never exercise the authenticated RPC -> provider mapping path. That is
// precisely the path that shipped broken: mapRegisterRow ran twice, re-reading
// snake_case keys off already-camelCased objects, and the first real
// production record rendered with a blank site heading, "Project status: —"
// and "Start date: —" while status/scope/frequency survived. These tests drive
// the REAL provider with REAL maintenance_register() response shapes.
vi.mock("../lib/maintenance", () => ({
  fetchMaintenanceRegister: vi.fn(),
  fetchMaintenanceVisits: vi.fn(),
  fetchMaintenanceAssignments: vi.fn(),
  fetchMaintenanceAuthorisedProjects: vi.fn(),
  createMaintenanceRelationship: vi.fn(),
  updateMaintenanceRelationship: vi.fn(),
  pauseMaintenanceRelationship: vi.fn(),
  resumeMaintenanceRelationship: vi.fn(),
  endMaintenanceRelationship: vi.fn(),
  scheduleMaintenanceVisit: vi.fn(),
  rescheduleMaintenanceVisit: vi.fn(),
  completeMaintenanceVisit: vi.fn(),
  cancelMaintenanceVisit: vi.fn(),
  assignMaintenancePerson: vi.fn(),
  endMaintenanceAssignment: vi.fn(),
  correctMaintenanceAssignment: vi.fn(),
}));

import * as api from "../lib/maintenance";

// Byte-for-byte the shape production returned for the first live Maintenance
// record (Kitusuru Residence House 0.8A), captured from the live database
// during the reconciliation audit.
const LIVE_REGISTER_ROW = {
  id: "09ae13f0-6482-48bc-8768-0f559d7d52aa",
  project_id: "f427ec01-8d83-4fc9-9eb3-2db297597d2b",
  project_name: "Kitusuru Residence House 0.8A",
  client_site_name: "Priya Shah",
  project_status: "Ongoing",
  status: "active",
  scope: "Three times a week",
  frequency: "weekly",
  start_date: "2026-08-17",
  version: 1,
  last_visit_date: null,
  next_visit_date: null,
  assigned_team: [
    { person_id: "76cbede5-204f-4fab-9560-7cd1cc5d86db", full_name: "Kefa Nyamari Ochenge", role: "maintenance_lead" },
  ],
};

const LIVE_ASSIGNMENT_ROW = {
  id: "e0ad4539-e044-4580-a4fe-3b06e47c5d5f",
  maintenance_relationship_id: "09ae13f0-6482-48bc-8768-0f559d7d52aa",
  person_id: "76cbede5-204f-4fab-9560-7cd1cc5d86db",
  role: "maintenance_lead",
  start_date: "2026-08-17",
  end_date: null,
  version: 1,
  created_by: "1fda7148-e072-45ad-9a59-a694532f5d05",
  updated_by: "1fda7148-e072-45ad-9a59-a694532f5d05",
  created_at: "2026-08-15T19:49:43.164089+00:00",
  updated_at: "2026-08-15T19:49:43.164089+00:00",
  people: { full_name: "Kefa Nyamari Ochenge" },
};

// A mutable holder rather than a reassigned outer binding: the provider's
// context value is published from an effect, so nothing is written during
// render.
const holder = { value: null };

function Probe() {
  const value = useMaintenance();
  useEffect(() => {
    holder.value = value;
  }, [value]);
  return <span data-testid="ready">{value.status}</span>;
}

function renderProvider({ registerRows = [LIVE_REGISTER_ROW], assignmentRows = [LIVE_ASSIGNMENT_ROW] } = {}) {
  api.fetchMaintenanceRegister.mockResolvedValue(registerRows);
  api.fetchMaintenanceVisits.mockResolvedValue([]);
  api.fetchMaintenanceAssignments.mockResolvedValue(assignmentRows);
  api.fetchMaintenanceAuthorisedProjects.mockResolvedValue([
    { id: "f427ec01-8d83-4fc9-9eb3-2db297597d2b", project_name: "Kitusuru Residence House 0.8A", client_site_name: "Priya Shah", status: "Ongoing" },
  ]);

  return render(
    <AdminDataContext.Provider value={{ projects: [] }}>
      <MaintenanceProvider session={{ access_token: "token" }} role="owner" isDemo={false}>
        <Probe />
      </MaintenanceProvider>
    </AdminDataContext.Provider>
  );
}

// Gate on the published context value, not on DOM text: the value is
// published from an effect, so waiting on the rendered status could observe a
// commit whose effect has not flushed yet. waitFor retries until the provider
// has genuinely finished loading.
async function loaded() {
  await waitFor(() => {
    expect(holder.value).not.toBeNull();
    expect(holder.value.status).toBe("ready");
  });
  return holder.value;
}

beforeEach(() => {
  holder.value = null;
  vi.clearAllMocks();
});

describe("MaintenanceProvider — authenticated register mapping", () => {
  it("maps a real maintenance_register() row exactly once, preserving every field", async () => {
    renderProvider();
    await loaded();

    expect(holder.value.register).toHaveLength(1);
    const row = holder.value.register[0];

    expect(row).toMatchObject({
      id: "09ae13f0-6482-48bc-8768-0f559d7d52aa",
      projectId: "f427ec01-8d83-4fc9-9eb3-2db297597d2b",
      projectName: "Kitusuru Residence House 0.8A",
      clientSiteName: "Priya Shah",
      projectStatus: "Ongoing",
      status: "active",
      scope: "Three times a week",
      frequency: "weekly",
      startDate: "2026-08-17",
      version: 1,
    });
    expect(row.assignedTeam).toHaveLength(1);
    expect(row.assignedTeam[0].full_name).toBe("Kefa Nyamari Ochenge");
  });

  // The exact live symptom. Every one of these was undefined/""/[] in
  // production because the row had been mapped a second time.
  it("regression: the fields destroyed by double-mapping are never lost again", async () => {
    renderProvider();
    await loaded();
    const row = holder.value.register[0];

    // Blank site heading and "Project status: —" in production.
    expect(row.projectName).toBeDefined();
    expect(row.projectName).not.toBe("");
    expect(row.projectStatus).toBeDefined();
    expect(row.projectStatus).not.toBe("");

    // "Start date: —" in production.
    expect(row.startDate).toBeDefined();
    expect(row.startDate).not.toBe("");

    // "View Project" pointed at /admin/projects/undefined in production.
    expect(row.projectId).toBeDefined();
    expect(String(row.projectId)).not.toContain("undefined");

    // Register showed "Unassigned" despite Kefa being assigned.
    expect(row.assignedTeam).not.toHaveLength(0);

    // Site line was empty in production.
    expect(row.clientSiteName).toBe("Priya Shah");

    // A second mapping would have produced exactly this object; assert we are
    // not it, so re-introducing the double map fails loudly here.
    expect(row).not.toMatchObject({ projectName: undefined, projectStatus: undefined, startDate: undefined });
  });

  it("preserves derived last/next visit dates through the mapping", async () => {
    renderProvider({
      registerRows: [{ ...LIVE_REGISTER_ROW, last_visit_date: "2026-08-13", next_visit_date: "2026-08-20" }],
    });
    await loaded();

    expect(holder.value.register[0].lastVisitDate).toBe("2026-08-13");
    expect(holder.value.register[0].nextVisitDate).toBe("2026-08-20");
  });

  it("keeps a truthful empty string when a derived visit date is genuinely null", async () => {
    renderProvider();
    await loaded();

    expect(holder.value.register[0].lastVisitDate).toBe("");
    expect(holder.value.register[0].nextVisitDate).toBe("");
  });

  // The Project-detail indicator resolves the relationship by projectId, which
  // was undefined in production — so the indicator could never appear.
  it("resolves the Project-detail Maintenance indicator for the real project id", async () => {
    renderProvider();
    await loaded();

    const summary = holder.value.summaryForProject("f427ec01-8d83-4fc9-9eb3-2db297597d2b");
    expect(summary).not.toBeNull();
    expect(summary).toMatchObject({
      id: "09ae13f0-6482-48bc-8768-0f559d7d52aa",
      status: "active",
    });
  });

  it("returns no indicator for a project with no live relationship", async () => {
    renderProvider();
    await loaded();
    expect(holder.value.summaryForProject("no-such-project")).toBeNull();
  });

  it("maps assignments once, exposing the person name for the relationship", async () => {
    renderProvider();
    await loaded();

    const team = holder.value.assignmentsForRelationship("09ae13f0-6482-48bc-8768-0f559d7d52aa");
    expect(team).toHaveLength(1);
    expect(team[0]).toMatchObject({
      id: "e0ad4539-e044-4580-a4fe-3b06e47c5d5f",
      personId: "76cbede5-204f-4fab-9560-7cd1cc5d86db",
      personName: "Kefa Nyamari Ochenge",
      role: "maintenance_lead",
      startDate: "2026-08-17",
      version: 1,
    });
    expect(team[0].endDate).toBe("");
  });
});

describe("MaintenanceProvider — relationship detail edits", () => {
  it("sends only scope, start date and frequency with the loaded version", async () => {
    api.updateMaintenanceRelationship.mockResolvedValue({ ...LIVE_REGISTER_ROW, scope: "Corrected scope" });
    renderProvider();
    await loaded();

    await act(async () => {
      await holder.value.editRelationship("09ae13f0-6482-48bc-8768-0f559d7d52aa", 1, {
        scope: "  Corrected scope  ", startDate: "2026-08-05", frequency: "weekly",
      });
    });

    expect(api.updateMaintenanceRelationship).toHaveBeenCalledWith(
      "token", "09ae13f0-6482-48bc-8768-0f559d7d52aa", 1,
      { scope: "Corrected scope", startDate: "2026-08-05", frequency: "weekly" }
    );
    // Lifecycle and identity are never part of an ordinary edit.
    const payload = api.updateMaintenanceRelationship.mock.calls[0][3];
    expect(payload).not.toHaveProperty("status");
    expect(payload).not.toHaveProperty("projectId");
    expect(payload).not.toHaveProperty("project_id");
  });

  it("refuses an empty scope before any request is made", async () => {
    renderProvider();
    await loaded();

    let result;
    await act(async () => {
      result = await holder.value.editRelationship("09ae13f0-6482-48bc-8768-0f559d7d52aa", 1, {
        scope: "   ", startDate: "2026-08-05", frequency: "weekly",
      });
    });
    expect(result.ok).toBe(false);
    expect(api.updateMaintenanceRelationship).not.toHaveBeenCalled();
  });

  it("reports a stale edit rather than showing a success that did not happen", async () => {
    // A version-filtered PATCH that matches no row returns nothing.
    api.updateMaintenanceRelationship.mockResolvedValue(undefined);
    renderProvider();
    await loaded();

    let result;
    await act(async () => {
      result = await holder.value.editRelationship("09ae13f0-6482-48bc-8768-0f559d7d52aa", 99, {
        scope: "Corrected scope", startDate: "2026-08-05", frequency: "weekly",
      });
    });
    expect(result.ok).toBe(false);
    expect(result.stale).toBe(true);
    expect(result.error).toMatch(/changed elsewhere/i);
  });
});

describe("MaintenanceProvider — assignment correction", () => {
  it("sends only role, start date and reason with the loaded version", async () => {
    api.correctMaintenanceAssignment.mockResolvedValue({ ...LIVE_ASSIGNMENT_ROW, role: "site_technician" });
    renderProvider();
    await loaded();

    await act(async () => {
      await holder.value.correctAssignment({
        assignmentId: "e0ad4539-e044-4580-a4fe-3b06e47c5d5f",
        expectedVersion: 1,
        role: "site_technician",
        startDate: "2026-08-05",
        correctionReason: "  Recorded from evidence: work began 5 Aug  ",
      });
    });

    expect(api.correctMaintenanceAssignment).toHaveBeenCalledWith("token", {
      assignmentId: "e0ad4539-e044-4580-a4fe-3b06e47c5d5f",
      expectedVersion: 1,
      role: "site_technician",
      startDate: "2026-08-05",
      correctionReason: "Recorded from evidence: work began 5 Aug",
    });
    // Identity and closure are never part of a correction.
    const payload = api.correctMaintenanceAssignment.mock.calls[0][1];
    expect(payload).not.toHaveProperty("personId");
    expect(payload).not.toHaveProperty("relationshipId");
    expect(payload).not.toHaveProperty("endDate");
  });

  it("requires a real correction reason before any request is made", async () => {
    renderProvider();
    await loaded();

    for (const reason of ["", "   ", "ab"]) {
      let result;
      await act(async () => {
        result = await holder.value.correctAssignment({
          assignmentId: "e0ad4539-e044-4580-a4fe-3b06e47c5d5f",
          expectedVersion: 1, role: "site_technician", startDate: "2026-08-05",
          correctionReason: reason,
        });
      });
      expect(result.ok).toBe(false);
    }
    expect(api.correctMaintenanceAssignment).not.toHaveBeenCalled();
  });

  it("surfaces the database's refusal of a stale correction", async () => {
    const stale = new Error("This assignment was changed elsewhere. Reload and try again.");
    stale.code = "40001";
    api.correctMaintenanceAssignment.mockRejectedValue(stale);
    renderProvider();
    await loaded();

    let result;
    await act(async () => {
      result = await holder.value.correctAssignment({
        assignmentId: "e0ad4539-e044-4580-a4fe-3b06e47c5d5f",
        expectedVersion: 99, role: "site_technician", startDate: "2026-08-05",
        correctionReason: "Recording error",
      });
    });
    expect(result.ok).toBe(false);
    expect(result.stale).toBe(true);
  });
});
