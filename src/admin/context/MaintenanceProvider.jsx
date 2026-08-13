import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminData } from "./adminData";
import { MaintenanceContext } from "./maintenance";
import {
  assignMaintenancePerson, cancelMaintenanceVisit, completeMaintenanceVisit,
  createMaintenanceRelationship, endMaintenanceAssignment, endMaintenanceRelationship,
  fetchMaintenanceAssignments, fetchMaintenanceAuthorisedProjects, fetchMaintenanceRegister,
  fetchMaintenanceVisits, pauseMaintenanceRelationship, rescheduleMaintenanceVisit,
  resumeMaintenanceRelationship, scheduleMaintenanceVisit,
} from "../lib/maintenance";

const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);

function mapRegisterRow(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    clientSiteName: row.client_site_name || "",
    projectStatus: row.project_status,
    status: row.status,
    scope: row.scope,
    frequency: row.frequency,
    startDate: row.start_date,
    version: row.version,
    lastVisitDate: row.last_visit_date || "",
    nextVisitDate: row.next_visit_date || "",
    assignedTeam: row.assigned_team || [],
  };
}

function mapVisit(row) {
  return {
    id: row.id,
    relationshipId: row.maintenance_relationship_id,
    scheduledDate: row.scheduled_date,
    status: row.status,
    purpose: row.purpose,
    completedAt: row.completed_at || "",
    completionNote: row.completion_note || "",
    cancellationReason: row.cancellation_reason || "",
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAssignment(row) {
  return {
    id: row.id,
    relationshipId: row.maintenance_relationship_id,
    personId: row.person_id,
    personName: row.people?.full_name || "",
    role: row.role,
    startDate: row.start_date,
    endDate: row.end_date || "",
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// A small demo seed so the screens are usable without Supabase configured.
// Illustrative only — nothing here reaches a real database. Linked to two
// real demo projects from ../data/projectSeed so the Completed-project +
// Active-Maintenance coexistence is genuinely demonstrable in preview.
function buildDemoState() {
  const relationships = [
    {
      id: "demo-maintenance-1",
      projectId: "muthithi-gardens-estate",
      scope: "Quarterly grounds inspection and irrigation servicing.",
      startDate: "2026-06-01",
      frequency: "quarterly",
      status: "active",
      version: 1,
    },
    {
      id: "demo-maintenance-2",
      projectId: "karen-residence-fountain-garden",
      scope: "Fortnightly lawn, border and fountain upkeep.",
      startDate: "2026-07-15",
      frequency: "fortnightly",
      status: "active",
      version: 1,
    },
  ];
  const visits = [
    { id: "demo-visit-1", relationshipId: "demo-maintenance-1", scheduledDate: "2026-08-05", status: "completed", purpose: "Quarterly grounds inspection", completedAt: "2026-08-05T09:00:00Z", completionNote: "Irrigation checked, no issues found.", cancellationReason: "", version: 2 },
    { id: "demo-visit-2", relationshipId: "demo-maintenance-1", scheduledDate: "2026-11-05", status: "scheduled", purpose: "Quarterly grounds inspection", completedAt: "", completionNote: "", cancellationReason: "", version: 1 },
    { id: "demo-visit-3", relationshipId: "demo-maintenance-2", scheduledDate: "2026-08-01", status: "completed", purpose: "Routine lawn and fountain maintenance", completedAt: "2026-08-01T10:00:00Z", completionNote: "Lawn mowed, fountain pump serviced.", cancellationReason: "", version: 2 },
    { id: "demo-visit-4", relationshipId: "demo-maintenance-2", scheduledDate: "2026-08-22", status: "scheduled", purpose: "Routine lawn and fountain maintenance", completedAt: "", completionNote: "", cancellationReason: "", version: 1 },
  ];
  const assignments = [
    { id: "demo-assignment-1", relationshipId: "demo-maintenance-1", personId: "demo-person-1", personName: "Lincoln Waweru", role: "maintenance_lead", startDate: "2026-06-01", endDate: "", version: 1 },
    { id: "demo-assignment-2", relationshipId: "demo-maintenance-2", personId: "demo-person-1", personName: "Lincoln Waweru", role: "site_technician", startDate: "2026-07-15", endDate: "", version: 1 },
    { id: "demo-assignment-3", relationshipId: "demo-maintenance-2", personId: "demo-person-3", personName: "Grace Njeri", role: "supervisor", startDate: "2026-07-15", endDate: "", version: 1 },
  ];
  return { relationships, visits, assignments };
}

function deriveLastVisit(visits, relationshipId) {
  const dates = visits
    .filter((visit) => visit.relationshipId === relationshipId && visit.status === "completed")
    .map((visit) => visit.scheduledDate);
  return dates.length ? dates.sort().at(-1) : "";
}

function deriveNextVisit(visits, relationshipId) {
  const todayIso = today();
  const dates = visits
    .filter((visit) => visit.relationshipId === relationshipId && visit.status === "scheduled" && visit.scheduledDate >= todayIso)
    .map((visit) => visit.scheduledDate);
  return dates.length ? dates.sort()[0] : "";
}

function buildDemoRegister(relationships, visits, assignments, projects) {
  return relationships.map((relationship) => {
    const project = projects.find((candidate) => candidate.id === relationship.projectId);
    const team = assignments
      .filter((assignment) => assignment.relationshipId === relationship.id && !assignment.endDate)
      .map((assignment) => ({ person_id: assignment.personId, full_name: assignment.personName, role: assignment.role }));
    return {
      ...relationship,
      projectName: project?.projectName || "Unknown project",
      clientSiteName: project?.clientSiteName || "",
      projectStatus: project?.status || "",
      lastVisitDate: deriveLastVisit(visits, relationship.id),
      nextVisitDate: deriveNextVisit(visits, relationship.id),
      assignedTeam: team,
    };
  });
}

export default function MaintenanceProvider({ children, session, role, isDemo }) {
  const { projects } = useAdminData();
  const accessToken = session?.access_token || "";
  const demoSeed = useMemo(() => (isDemo ? buildDemoState() : null), [isDemo]);

  const [relationships, setRelationships] = useState(() => demoSeed?.relationships || []);
  const [visits, setVisits] = useState(() => demoSeed?.visits || []);
  const [assignments, setAssignments] = useState(() => demoSeed?.assignments || []);
  const [authorisedProjects, setAuthorisedProjects] = useState([]);
  const [status, setStatus] = useState(isDemo ? "ready" : "loading");
  const [error, setError] = useState("");

  const register = useMemo(
    () => (isDemo ? buildDemoRegister(relationships, visits, assignments, projects) : relationships.map(mapRegisterRow)),
    [isDemo, relationships, visits, assignments, projects]
  );

  const eligibleProjects = useMemo(
    () => (isDemo
      ? projects.filter((project) => !project.archived && ["Ongoing", "Paused", "Completed"].includes(project.status))
      : authorisedProjects),
    [isDemo, projects, authorisedProjects]
  );

  const refresh = useCallback(async () => {
    if (isDemo) return { ok: true };
    try {
      const [registerRows, visitRows, assignmentRows, projectRows] = await Promise.all([
        fetchMaintenanceRegister(accessToken),
        fetchMaintenanceVisits(accessToken),
        fetchMaintenanceAssignments(accessToken),
        fetchMaintenanceAuthorisedProjects(accessToken),
      ]);
      setRelationships((registerRows || []).map(mapRegisterRow));
      setVisits((visitRows || []).map(mapVisit));
      setAssignments((assignmentRows || []).map(mapAssignment));
      setAuthorisedProjects((projectRows || []).map((row) => ({
        id: row.id, projectName: row.project_name, clientSiteName: row.client_site_name || "", status: row.status,
      })));
      setStatus("ready");
      setError("");
      return { ok: true };
    } catch (nextError) {
      setStatus("error");
      setError(nextError.message || "Unable to load Maintenance.");
      return { ok: false, error: nextError };
    }
  }, [accessToken, isDemo]);

  useEffect(() => {
    if (isDemo || !accessToken || !role) return undefined;
    let cancelled = false;
    (async () => {
      const result = await refresh();
      if (cancelled && result.ok) return;
    })();
    return () => { cancelled = true; };
  }, [accessToken, isDemo, role, refresh]);

  const run = useCallback(async (operation, staleMessage) => {
    try {
      const result = await operation();
      // A version-filtered write that matched no row means somebody else
      // changed this record first. Nothing was written, and the reader is
      // told so rather than being shown a success that did not happen.
      if (!result) return { ok: false, error: staleMessage, stale: true };
      await refresh();
      return { ok: true, record: result };
    } catch (nextError) {
      const message = nextError.message || "The Maintenance action did not complete.";
      return { ok: false, error: message, stale: nextError.code === "40001" };
    }
  }, [refresh]);

  // ---- Relationship actions ------------------------------------------------
  const addRelationship = useCallback((values) => {
    if (isDemo) {
      const relationship = {
        id: `demo-maintenance-${Date.now()}`, projectId: values.projectId, scope: values.scope,
        startDate: values.startDate, frequency: values.frequency, status: "active", version: 1,
      };
      setRelationships((current) => [...current, relationship]);
      return Promise.resolve({ ok: true, record: relationship });
    }
    return run(() => createMaintenanceRelationship(accessToken, values), "This Maintenance relationship could not be started.");
  }, [accessToken, isDemo, run]);

  const pauseRelationship = useCallback((relationshipId, expectedVersion, reason) => {
    if (isDemo) {
      let changed = null;
      setRelationships((current) => current.map((relationship) => {
        if (relationship.id !== relationshipId) return relationship;
        changed = { ...relationship, status: "paused", version: relationship.version + 1 };
        return changed;
      }));
      return Promise.resolve(changed ? { ok: true, record: changed } : { ok: false, error: "Relationship not found." });
    }
    return run(
      () => pauseMaintenanceRelationship(accessToken, relationshipId, expectedVersion, reason),
      "This Maintenance relationship was changed elsewhere. Reload and try again."
    );
  }, [accessToken, isDemo, run]);

  const resumeRelationship = useCallback((relationshipId, expectedVersion) => {
    if (isDemo) {
      let changed = null;
      setRelationships((current) => current.map((relationship) => {
        if (relationship.id !== relationshipId) return relationship;
        changed = { ...relationship, status: "active", version: relationship.version + 1 };
        return changed;
      }));
      return Promise.resolve(changed ? { ok: true, record: changed } : { ok: false, error: "Relationship not found." });
    }
    return run(
      () => resumeMaintenanceRelationship(accessToken, relationshipId, expectedVersion),
      "This Maintenance relationship was changed elsewhere. Reload and try again."
    );
  }, [accessToken, isDemo, run]);

  const endRelationship = useCallback((relationshipId, expectedVersion, reason) => {
    if (isDemo) {
      let changed = null;
      setRelationships((current) => current.map((relationship) => {
        if (relationship.id !== relationshipId) return relationship;
        changed = { ...relationship, status: "ended", version: relationship.version + 1 };
        return changed;
      }));
      return Promise.resolve(changed ? { ok: true, record: changed } : { ok: false, error: "Relationship not found." });
    }
    return run(
      () => endMaintenanceRelationship(accessToken, relationshipId, expectedVersion, reason),
      "This Maintenance relationship was changed elsewhere. Reload and try again."
    );
  }, [accessToken, isDemo, run]);

  // ---- Visit actions --------------------------------------------------------
  const addVisit = useCallback((values) => {
    if (isDemo) {
      const visit = {
        id: `demo-visit-${Date.now()}`, relationshipId: values.relationshipId, scheduledDate: values.scheduledDate,
        status: "scheduled", purpose: values.purpose, completedAt: "", completionNote: "", cancellationReason: "", version: 1,
      };
      setVisits((current) => [visit, ...current]);
      return Promise.resolve({ ok: true, record: visit });
    }
    return run(() => scheduleMaintenanceVisit(accessToken, values), "This visit could not be scheduled.");
  }, [accessToken, isDemo, run]);

  const rescheduleVisit = useCallback((visitId, expectedVersion, newScheduledDate) => {
    if (isDemo) {
      let changed = null;
      setVisits((current) => current.map((visit) => {
        if (visit.id !== visitId) return visit;
        changed = { ...visit, scheduledDate: newScheduledDate, version: visit.version + 1 };
        return changed;
      }));
      return Promise.resolve(changed ? { ok: true, record: changed } : { ok: false, error: "Visit not found." });
    }
    return run(
      () => rescheduleMaintenanceVisit(accessToken, visitId, expectedVersion, newScheduledDate),
      "This visit was changed elsewhere. Reload and try again."
    );
  }, [accessToken, isDemo, run]);

  const completeVisit = useCallback((visitId, expectedVersion, completionNote) => {
    if (isDemo) {
      let changed = null;
      setVisits((current) => current.map((visit) => {
        if (visit.id !== visitId) return visit;
        changed = { ...visit, status: "completed", completedAt: now(), completionNote, version: visit.version + 1 };
        return changed;
      }));
      return Promise.resolve(changed ? { ok: true, record: changed } : { ok: false, error: "Visit not found." });
    }
    return run(
      () => completeMaintenanceVisit(accessToken, visitId, expectedVersion, completionNote),
      "This visit was changed elsewhere. Reload and try again."
    );
  }, [accessToken, isDemo, run]);

  const cancelVisit = useCallback((visitId, expectedVersion, cancellationReason) => {
    if (isDemo) {
      let changed = null;
      setVisits((current) => current.map((visit) => {
        if (visit.id !== visitId) return visit;
        changed = { ...visit, status: "cancelled", cancellationReason, version: visit.version + 1 };
        return changed;
      }));
      return Promise.resolve(changed ? { ok: true, record: changed } : { ok: false, error: "Visit not found." });
    }
    return run(
      () => cancelMaintenanceVisit(accessToken, visitId, expectedVersion, cancellationReason),
      "This visit was changed elsewhere. Reload and try again."
    );
  }, [accessToken, isDemo, run]);

  // ---- Assignment actions ----------------------------------------------------
  const addAssignment = useCallback((values, personName) => {
    if (isDemo) {
      const assignment = {
        id: `demo-assignment-${Date.now()}`, relationshipId: values.relationshipId, personId: values.personId,
        personName: personName || "", role: values.role, startDate: values.startDate, endDate: "", version: 1,
      };
      setAssignments((current) => [...current, assignment]);
      return Promise.resolve({ ok: true, record: assignment });
    }
    return run(() => assignMaintenancePerson(accessToken, values), "This assignment could not be recorded.");
  }, [accessToken, isDemo, run]);

  const endAssignment = useCallback((assignmentId, expectedVersion, endDate) => {
    if (isDemo) {
      let changed = null;
      setAssignments((current) => current.map((assignment) => {
        if (assignment.id !== assignmentId) return assignment;
        changed = { ...assignment, endDate, version: assignment.version + 1 };
        return changed;
      }));
      return Promise.resolve(changed ? { ok: true, record: changed } : { ok: false, error: "Assignment not found." });
    }
    return run(
      () => endMaintenanceAssignment(accessToken, assignmentId, expectedVersion, endDate),
      "This assignment was changed elsewhere. Reload and try again."
    );
  }, [accessToken, isDemo, run]);

  // The compact Project-detail indicator: at most one live relationship per
  // project, matching the database's own one-live-per-project constraint.
  const summaryForProject = useCallback((projectId) => {
    const relationship = register.find((row) => row.projectId === projectId && row.status !== "ended");
    if (!relationship) return null;
    return { id: relationship.id, status: relationship.status, nextVisitDate: relationship.nextVisitDate };
  }, [register]);

  const value = useMemo(() => ({
    register, visits, assignments, eligibleProjects, status, error,
    refresh, addRelationship, pauseRelationship, resumeRelationship, endRelationship,
    addVisit, rescheduleVisit, completeVisit, cancelVisit,
    addAssignment, endAssignment, summaryForProject,
    visitsForRelationship: (relationshipId) => visits.filter((visit) => visit.relationshipId === relationshipId),
    assignmentsForRelationship: (relationshipId) => assignments.filter((assignment) => assignment.relationshipId === relationshipId),
  }), [
    register, visits, assignments, eligibleProjects, status, error, refresh,
    addRelationship, pauseRelationship, resumeRelationship, endRelationship,
    addVisit, rescheduleVisit, completeVisit, cancelVisit,
    addAssignment, endAssignment, summaryForProject,
  ]);

  return <MaintenanceContext.Provider value={value}>{children}</MaintenanceContext.Provider>;
}
