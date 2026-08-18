import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminData } from "./adminData";
import { MaintenanceContext } from "./maintenance";
import {
  assignMaintenancePerson, cancelMaintenanceVisit, completeMaintenanceVisit,
  completeMaintenanceVisitCycle, correctMaintenanceAssignment,
  createMaintenanceRelationship, endMaintenanceAssignment, endMaintenanceRelationship,
  createMaintenanceSite,
  fetchMaintenanceAssignments, fetchMaintenanceAuthorisedSites, fetchMaintenanceRegister,
  fetchMaintenanceVisits, pauseMaintenanceRelationship, rescheduleMaintenanceVisit,
  resumeMaintenanceRelationship, scheduleMaintenanceVisit, updateMaintenanceRelationship,
} from "../lib/maintenance";

const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);

// Site is the durable identity; Project is optional origin context and may be
// null for a maintenance-only Site.
function mapRegisterRow(row) {
  return {
    id: row.id,
    siteId: row.site_id, siteName: row.site_name || "",
    siteLocation: row.site_location || "", siteCounty: row.site_county || "",
    projectId: row.project_id || "", projectName: row.project_name || "",
    projectStatus: row.project_status || "",
    status: row.status, scope: row.scope, frequency: row.frequency, startDate: row.start_date,
    version: row.version, lastVisitDate: row.last_visit_date || "", nextVisitDate: row.next_visit_date || "",
    assignedTeam: row.assigned_team || [],
  };
}

function mapAuthorisedSite(row) {
  return {
    id: row.id, siteName: row.site_name || "",
    location: row.location || "", county: row.county || "",
    projects: (row.projects || []).map((project) => ({
      id: project.id, projectName: project.project_name, status: project.status,
    })),
  };
}

function mapVisit(row) {
  return {
    id: row.id, relationshipId: row.maintenance_relationship_id, scheduledDate: row.scheduled_date,
    status: row.status, purpose: row.purpose, completedAt: row.completed_at || "",
    completionNote: row.completion_note || "", cancellationReason: row.cancellation_reason || "",
    dailySiteEntryId: row.daily_site_entry_id || "", completionOutcome: row.completion_outcome || "",
    followUpRequired: row.follow_up_required === true, followUpNote: row.follow_up_note || "",
    version: row.version, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapAssignment(row) {
  return {
    id: row.id, relationshipId: row.maintenance_relationship_id, personId: row.person_id,
    personName: row.people?.full_name || "", role: row.role, startDate: row.start_date,
    endDate: row.end_date || "", version: row.version, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function buildDemoState() {
  const relationships = [
    { id: "demo-maintenance-1", siteId: "demo-site-1", siteName: "Muthithi Gardens Estate", siteLocation: "Muthithi Estate", siteCounty: "Nairobi", projectId: "muthithi-gardens-estate", scope: "Quarterly grounds inspection and irrigation servicing.", startDate: "2026-06-01", frequency: "quarterly", status: "active", version: 1 },
    { id: "demo-maintenance-2", siteId: "demo-site-2", siteName: "Karen Residence", siteLocation: "Karen", siteCounty: "Nairobi", projectId: "karen-residence-fountain-garden", scope: "Fortnightly lawn, border and fountain upkeep.", startDate: "2026-07-15", frequency: "fortnightly", status: "active", version: 1 },
    // A maintenance-only Site: Botanique never built here, so there is no Project.
    { id: "demo-maintenance-3", siteId: "demo-site-3", siteName: "Riverside Court", siteLocation: "Westlands", siteCounty: "Nairobi", projectId: "", scope: "Weekly grounds upkeep for a landscape Botanique did not build.", startDate: "2026-08-01", frequency: "weekly", status: "active", version: 1 },
  ];
  const visits = [
    { id: "demo-visit-1", relationshipId: "demo-maintenance-1", scheduledDate: "2026-08-05", status: "completed", purpose: "Quarterly grounds inspection", completedAt: "2026-08-05T09:00:00Z", completionNote: "Irrigation checked, no issues found.", cancellationReason: "", completionOutcome: "completed", followUpRequired: false, followUpNote: "", dailySiteEntryId: "", version: 2 },
    { id: "demo-visit-2", relationshipId: "demo-maintenance-1", scheduledDate: "2026-11-05", status: "scheduled", purpose: "Quarterly grounds inspection", completedAt: "", completionNote: "", cancellationReason: "", completionOutcome: "", followUpRequired: false, followUpNote: "", dailySiteEntryId: "", version: 1 },
    { id: "demo-visit-3", relationshipId: "demo-maintenance-2", scheduledDate: "2026-08-01", status: "completed", purpose: "Routine lawn and fountain maintenance", completedAt: "2026-08-01T10:00:00Z", completionNote: "Lawn mowed, fountain pump serviced.", cancellationReason: "", completionOutcome: "completed", followUpRequired: false, followUpNote: "", dailySiteEntryId: "", version: 2 },
    { id: "demo-visit-4", relationshipId: "demo-maintenance-2", scheduledDate: "2026-08-22", status: "scheduled", purpose: "Routine lawn and fountain maintenance", completedAt: "", completionNote: "", cancellationReason: "", completionOutcome: "", followUpRequired: false, followUpNote: "", dailySiteEntryId: "", version: 1 },
  ];
  const assignments = [
    { id: "demo-assignment-1", relationshipId: "demo-maintenance-1", personId: "demo-person-1", personName: "Lincoln Waweru", role: "maintenance_lead", startDate: "2026-06-01", endDate: "", version: 1 },
    { id: "demo-assignment-2", relationshipId: "demo-maintenance-2", personId: "demo-person-1", personName: "Lincoln Waweru", role: "site_technician", startDate: "2026-07-15", endDate: "", version: 1 },
    { id: "demo-assignment-3", relationshipId: "demo-maintenance-2", personId: "demo-person-3", personName: "Grace Njeri", role: "supervisor", startDate: "2026-07-15", endDate: "", version: 1 },
  ];
  return { relationships, visits, assignments };
}

function deriveLastVisit(visits, relationshipId) {
  const dates = visits.filter((visit) => visit.relationshipId === relationshipId && visit.status === "completed").map((visit) => visit.scheduledDate).sort();
  return dates.at(-1) || "";
}
function deriveNextVisit(visits, relationshipId) {
  const dates = visits.filter((visit) => visit.relationshipId === relationshipId && visit.status === "scheduled" && visit.scheduledDate >= today()).map((visit) => visit.scheduledDate).sort();
  return dates[0] || "";
}
function buildDemoRegister(relationships, visits, assignments, projects) {
  return relationships.map((relationship) => {
    const project = relationship.projectId
      ? projects.find((candidate) => candidate.id === relationship.projectId)
      : null;
    const team = assignments.filter((assignment) => assignment.relationshipId === relationship.id && !assignment.endDate)
      .map((assignment) => ({ person_id: assignment.personId, full_name: assignment.personName, role: assignment.role }));
    return {
      ...relationship,
      // Never invent a Project label: a maintenance-only Site simply has none.
      projectName: project?.projectName || "",
      projectStatus: project?.status || "",
      lastVisitDate: deriveLastVisit(visits, relationship.id),
      nextVisitDate: deriveNextVisit(visits, relationship.id),
      assignedTeam: team,
    };
  });
}

// Sites a demo operator may start Maintenance at: every Project-backed Site with
// no live relationship, plus a free maintenance-only Site.
function buildDemoEligibleSites(relationships, projects) {
  const taken = new Set(relationships.filter((item) => item.status !== "ended").map((item) => item.siteId));
  const fromProjects = projects
    .filter((project) => !project.archived && ["Ongoing", "Paused", "Completed"].includes(project.status))
    .map((project) => ({
      id: project.siteId || `demo-site-of-${project.id}`,
      siteName: project.clientSiteName || project.projectName,
      location: project.location || "", county: project.county || "",
      projects: [{ id: project.id, projectName: project.projectName, status: project.status }],
    }));
  const maintenanceOnly = [{ id: "demo-site-free", siteName: "Acacia Court", location: "Lavington", county: "Nairobi", projects: [] }];
  return [...fromProjects, ...maintenanceOnly].filter((site) => !taken.has(site.id));
}

export default function MaintenanceProvider({ children, session, role, isDemo }) {
  const { projects } = useAdminData();
  const accessToken = session?.access_token || "";
  const demoSeed = useMemo(() => (isDemo ? buildDemoState() : null), [isDemo]);
  const [relationships, setRelationships] = useState(() => demoSeed?.relationships || []);
  const [visits, setVisits] = useState(() => demoSeed?.visits || []);
  const [assignments, setAssignments] = useState(() => demoSeed?.assignments || []);
  const [authorisedSites, setAuthorisedSites] = useState([]);
  const [status, setStatus] = useState(isDemo ? "ready" : "loading");
  const [error, setError] = useState("");

  const register = useMemo(() => isDemo ? buildDemoRegister(relationships, visits, assignments, projects) : relationships, [isDemo, relationships, visits, assignments, projects]);
  // The start-Maintenance choice is a SITE. Each Site carries its related
  // Botanique Projects, which stay optional origin context.
  const eligibleSites = useMemo(() => isDemo ? buildDemoEligibleSites(relationships, projects) : authorisedSites, [isDemo, relationships, projects, authorisedSites]);

  const refresh = useCallback(async () => {
    if (isDemo) return { ok: true };
    try {
      const [registerRows, visitRows, assignmentRows, siteRows] = await Promise.all([
        fetchMaintenanceRegister(accessToken), fetchMaintenanceVisits(accessToken), fetchMaintenanceAssignments(accessToken), fetchMaintenanceAuthorisedSites(accessToken),
      ]);
      setRelationships((registerRows || []).map(mapRegisterRow));
      setVisits((visitRows || []).map(mapVisit));
      setAssignments((assignmentRows || []).map(mapAssignment));
      setAuthorisedSites((siteRows || []).map(mapAuthorisedSite));
      setStatus("ready"); setError(""); return { ok: true };
    } catch (nextError) {
      setStatus("error"); setError(nextError.message || "Unable to load Maintenance."); return { ok: false, error: nextError };
    }
  }, [accessToken, isDemo]);

  useEffect(() => { if (!isDemo && accessToken && role) refresh(); }, [accessToken, isDemo, role, refresh]);

  const run = useCallback(async (operation, staleMessage) => {
    try {
      const result = await operation();
      if (!result) return { ok: false, error: staleMessage, stale: true };
      await refresh(); return { ok: true, record: result };
    } catch (nextError) {
      return { ok: false, error: nextError.message || "The Maintenance action did not complete.", stale: nextError.code === "40001" };
    }
  }, [refresh]);

  const addRelationship = useCallback((values) => {
    if (!values.siteId) return Promise.resolve({ ok: false, error: "Choose the Site this Maintenance belongs to." });
    if (isDemo) {
      const site = buildDemoEligibleSites(relationships, projects).find((item) => item.id === values.siteId);
      const project = values.projectId ? projects.find((item) => item.id === values.projectId) : null;
      const record = {
        id: `demo-maintenance-${Date.now()}`, ...values,
        siteName: site?.siteName || values.siteName || "", siteLocation: site?.location || "", siteCounty: site?.county || "",
        projectId: values.projectId || "", projectName: project?.projectName || "",
        status: "active", version: 1,
      };
      setRelationships((current) => [...current, record]);
      return Promise.resolve({ ok: true, record });
    }
    return run(() => createMaintenanceRelationship(accessToken, values), "This Maintenance relationship could not be started.");
  }, [accessToken, isDemo, run, relationships, projects]);

  // Create (or reuse) the Site a maintenance-only client needs, without granting
  // a manager generic Site authority — the database RPC owns that boundary.
  const addMaintenanceSite = useCallback(async (values) => {
    const siteName = (values.siteName || "").trim();
    if (!siteName) return { ok: false, error: "A Site / property name is required." };
    if (isDemo) {
      const record = { id: `demo-site-${Date.now()}`, siteName, location: values.location || "", county: values.county || "", projects: [] };
      setAuthorisedSites((current) => [...current, record]);
      return { ok: true, record };
    }
    try {
      const created = await createMaintenanceSite(accessToken, { ...values, siteName });
      const record = mapAuthorisedSite({ ...created, projects: [] });
      setAuthorisedSites((current) =>
        current.some((item) => item.id === record.id) ? current : [...current, record]
      );
      return { ok: true, record };
    } catch (nextError) {
      return { ok: false, error: nextError.message || "The Site could not be created." };
    }
  }, [accessToken, isDemo]);

  const editRelationship = useCallback((relationshipId, expectedVersion, values) => {
    const scope = (values.scope || "").trim();
    if (!scope) return Promise.resolve({ ok: false, error: "Describe the maintenance scope." });
    if (!values.startDate) return Promise.resolve({ ok: false, error: "A start date is required." });
    if (isDemo) { let changed; setRelationships((current) => current.map((item) => item.id === relationshipId ? (changed = { ...item, ...values, scope, version: item.version + 1 }) : item)); return Promise.resolve(changed ? { ok: true, record: changed } : { ok: false, error: "Relationship not found." }); }
    return run(() => updateMaintenanceRelationship(accessToken, relationshipId, expectedVersion, { ...values, scope }), "This Maintenance relationship was changed elsewhere. Reload and try again.");
  }, [accessToken, isDemo, run]);

  const transitionRelationship = useCallback((kind, relationshipId, expectedVersion, reason) => {
    if (isDemo) {
      let changed; setRelationships((current) => current.map((item) => item.id === relationshipId ? (changed = { ...item, status: kind === "pause" ? "paused" : kind === "resume" ? "active" : "ended", version: item.version + 1 }) : item));
      return Promise.resolve(changed ? { ok: true, record: changed } : { ok: false, error: "Relationship not found." });
    }
    const op = kind === "pause" ? pauseMaintenanceRelationship(accessToken, relationshipId, expectedVersion, reason) : kind === "resume" ? resumeMaintenanceRelationship(accessToken, relationshipId, expectedVersion) : endMaintenanceRelationship(accessToken, relationshipId, expectedVersion, reason);
    return run(() => op, "This Maintenance relationship was changed elsewhere. Reload and try again.");
  }, [accessToken, isDemo, run]);
  const pauseRelationship = useCallback((id, version, reason) => transitionRelationship("pause", id, version, reason), [transitionRelationship]);
  const resumeRelationship = useCallback((id, version) => transitionRelationship("resume", id, version), [transitionRelationship]);
  const endRelationship = useCallback((id, version, reason) => transitionRelationship("end", id, version, reason), [transitionRelationship]);

  const addVisit = useCallback((values) => {
    if (isDemo) { const record = { id: `demo-visit-${Date.now()}`, relationshipId: values.relationshipId, scheduledDate: values.scheduledDate, status: "scheduled", purpose: values.purpose, completedAt: "", completionNote: "", cancellationReason: "", dailySiteEntryId: "", completionOutcome: "", followUpRequired: false, followUpNote: "", version: 1 }; setVisits((current) => [record, ...current]); return Promise.resolve({ ok: true, record }); }
    return run(() => scheduleMaintenanceVisit(accessToken, values), "This visit could not be scheduled.");
  }, [accessToken, isDemo, run]);

  const rescheduleVisit = useCallback((visitId, expectedVersion, newScheduledDate) => {
    if (isDemo) { let changed; setVisits((current) => current.map((item) => item.id === visitId ? (changed = { ...item, scheduledDate: newScheduledDate, version: item.version + 1 }) : item)); return Promise.resolve(changed ? { ok: true, record: changed } : { ok: false, error: "Visit not found." }); }
    return run(() => rescheduleMaintenanceVisit(accessToken, visitId, expectedVersion, newScheduledDate), "This visit was changed elsewhere. Reload and try again.");
  }, [accessToken, isDemo, run]);

  const completeVisit = useCallback((visitId, expectedVersion, completionNote) => {
    if (isDemo) { let changed; setVisits((current) => current.map((item) => item.id === visitId ? (changed = { ...item, status: "completed", completedAt: now(), completionNote, completionOutcome: "completed", followUpRequired: false, version: item.version + 1 }) : item)); return Promise.resolve(changed ? { ok: true, record: changed } : { ok: false, error: "Visit not found." }); }
    return run(() => completeMaintenanceVisit(accessToken, visitId, expectedVersion, completionNote), "This visit was changed elsewhere. Reload and try again.");
  }, [accessToken, isDemo, run]);

  const completeVisitCycle = useCallback((values) => {
    if (isDemo) {
      let changed;
      setVisits((current) => {
        const next = current.map((item) => item.id === values.visitId ? (changed = { ...item, status: "completed", completedAt: now(), completionNote: values.completionNote, dailySiteEntryId: values.dailySiteEntryId || "", completionOutcome: values.outcome, followUpRequired: Boolean(values.followUpRequired), followUpNote: values.followUpRequired ? values.followUpNote : "", version: item.version + 1 }) : item);
        if (values.nextScheduledDate) next.unshift({ id: `demo-visit-${Date.now()}`, relationshipId: changed?.relationshipId || "", scheduledDate: values.nextScheduledDate, status: "scheduled", purpose: values.nextPurpose, completedAt: "", completionNote: "", cancellationReason: "", dailySiteEntryId: "", completionOutcome: "", followUpRequired: false, followUpNote: "", version: 1 });
        return next;
      });
      return Promise.resolve(changed ? { ok: true, record: changed } : { ok: false, error: "Visit not found." });
    }
    return run(() => completeMaintenanceVisitCycle(accessToken, values), "This visit was changed elsewhere. Reload and try again.");
  }, [accessToken, isDemo, run]);

  const cancelVisit = useCallback((visitId, expectedVersion, cancellationReason) => {
    if (isDemo) { let changed; setVisits((current) => current.map((item) => item.id === visitId ? (changed = { ...item, status: "cancelled", cancellationReason, version: item.version + 1 }) : item)); return Promise.resolve(changed ? { ok: true, record: changed } : { ok: false, error: "Visit not found." }); }
    return run(() => cancelMaintenanceVisit(accessToken, visitId, expectedVersion, cancellationReason), "This visit was changed elsewhere. Reload and try again.");
  }, [accessToken, isDemo, run]);

  const addAssignment = useCallback((values, personName) => {
    if (isDemo) { const record = { id: `demo-assignment-${Date.now()}`, relationshipId: values.relationshipId, personId: values.personId, personName: personName || "", role: values.role, startDate: values.startDate, endDate: "", version: 1 }; setAssignments((current) => [...current, record]); return Promise.resolve({ ok: true, record }); }
    return run(() => assignMaintenancePerson(accessToken, values), "This assignment could not be recorded.");
  }, [accessToken, isDemo, run]);

  const endAssignment = useCallback((assignmentId, expectedVersion) => {
    if (isDemo) { let changed; setAssignments((current) => current.map((item) => item.id === assignmentId && !item.endDate ? (changed = { ...item, endDate: today() > item.startDate ? today() : item.startDate, version: item.version + 1 }) : item)); return Promise.resolve(changed ? { ok: true, record: changed } : { ok: false, error: "This assignment has already ended." }); }
    return run(() => endMaintenanceAssignment(accessToken, assignmentId, expectedVersion), "This assignment was changed elsewhere. Reload and try again.");
  }, [accessToken, isDemo, run]);

  const correctAssignment = useCallback((values) => {
    const reason = (values.correctionReason || "").trim();
    if (reason.length < 3) return Promise.resolve({ ok: false, error: "Explain why this Maintenance assignment is being corrected." });
    if (isDemo) { let changed; setAssignments((current) => current.map((item) => item.id === values.assignmentId && !item.endDate ? (changed = { ...item, role: values.role, startDate: values.startDate, version: item.version + 1 }) : item)); return Promise.resolve(changed ? { ok: true, record: changed } : { ok: false, error: "Assignment not found or already ended." }); }
    return run(() => correctMaintenanceAssignment(accessToken, { ...values, correctionReason: reason }), "This assignment was changed elsewhere. Reload and try again.");
  }, [accessToken, isDemo, run]);

  // A relationship with no originating Project never appears on a Project page.
  const summaryForProject = useCallback((projectId) => {
    if (!projectId) return null;
    const relationship = register.find((row) => row.projectId === projectId && row.status !== "ended");
    return relationship ? { id: relationship.id, status: relationship.status, nextVisitDate: relationship.nextVisitDate } : null;
  }, [register]);

  const value = useMemo(() => ({
    register, visits, assignments, eligibleSites, status, error, refresh,
    addRelationship, addMaintenanceSite, editRelationship, pauseRelationship, resumeRelationship, endRelationship,
    addVisit, rescheduleVisit, completeVisit, completeVisitCycle, cancelVisit,
    addAssignment, endAssignment, correctAssignment, summaryForProject,
    visitsForRelationship: (relationshipId) => visits.filter((visit) => visit.relationshipId === relationshipId),
    assignmentsForRelationship: (relationshipId) => assignments.filter((assignment) => assignment.relationshipId === relationshipId),
  }), [register, visits, assignments, eligibleSites, status, error, refresh, addRelationship, addMaintenanceSite, editRelationship, pauseRelationship, resumeRelationship, endRelationship, addVisit, rescheduleVisit, completeVisit, completeVisitCycle, cancelVisit, addAssignment, endAssignment, correctAssignment, summaryForProject]);

  return <MaintenanceContext.Provider value={value}>{children}</MaintenanceContext.Provider>;
}
