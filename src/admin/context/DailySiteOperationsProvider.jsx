import { useCallback, useEffect, useMemo, useState } from "react";
import { DailySiteOperationsContext } from "./dailySiteOperations";
import { useAdminData } from "./adminData";
import {
  acceptDailySiteEntry as apiAccept,
  correctAndResubmitDailySiteEntry as apiCorrect,
  createComplianceWaiver as apiCreateWaiver,
  createDailySiteEntryDraft as apiCreateDraft,
  fetchAuthorisedProjects,
  fetchAuthorisedSites,
  fetchDailySiteEntries,
  fetchDailySiteEntryEvents,
  fetchDailySiteWaivers,
  fetchMorningCompliance,
  returnDailySiteEntry as apiReturn,
  revokeComplianceWaiver as apiRevokeWaiver,
  submitDailySiteEntry as apiSubmit,
  supersedeDailySiteEntry as apiSupersede,
  updateDailySiteEntryDraft as apiUpdateDraft,
  voidDailySiteEntry as apiVoid,
} from "../lib/dailySiteOperations";
import {
  computeLabourCost,
} from "../utils/dailySiteCapabilities";
import {
  mapComplianceRow,
  mapDailySiteEntry,
  mapDailySiteEntryEvent,
  mapDailySiteWaiver,
  todayIso,
} from "../utils/dailySiteFormatters";

const demoNow = () => new Date().toISOString();

// Build a demo entry object from the form values (dev preview only; Supabase is
// the authority everywhere else). Kept module-level so component memoization is
// preserved by the React Compiler.
function buildDemoEntry(values, currentUserId, overrides = {}) {
  const working = values.disposition === "working";
  return {
    id: `demo-entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    siteId: values.siteId || "",
    projectId: values.projectId || "",
    maintenanceVisitId: values.maintenanceVisitId || "",
    workDate: values.workDate,
    disposition: values.disposition,
    noWorkReason: values.disposition === "no_work" ? values.noWorkReason || "" : "",
    reasonDetail: values.reasonDetail || "",
    expectedWorkerCount: working ? Number(values.expectedWorkerCount) || 0 : 0,
    crewReference: values.crewReference || "",
    ratePerWorker: working ? (values.ratePerWorker === "" ? null : Number(values.ratePerWorker)) : null,
    agreedLabourTotal: working ? (values.agreedLabourTotal === "" ? null : Number(values.agreedLabourTotal)) : null,
    plannedLabourCost: computeLabourCost(values),
    workPlanned: values.workPlanned || "",
    fundsAvailable: values.fundsAvailable === "" ? null : Number(values.fundsAvailable),
    additionalAmountRequested: values.additionalAmountRequested === "" ? null : Number(values.additionalAmountRequested),
    notes: values.notes || "",
    evidenceStatus: values.evidenceStatus || "none",
    state: "draft",
    version: 1,
    supersedesEntryId: "",
    returnedReason: "",
    voidReason: "",
    supersessionReason: "",
    createdBy: currentUserId,
    updatedBy: currentUserId,
    submittedBy: "",
    reviewedBy: "",
    createdAt: demoNow(),
    updatedAt: demoNow(),
    submittedAt: "",
    reviewedAt: "",
    isLate: false,
    ...overrides,
  };
}

function projectInScope(project) {
  return (
    project.status === "Ongoing" &&
    !project.archived &&
    project.stage !== "Awaiting Approval"
  );
}

// Demo compliance is computed the same shape the RPC returns, so the UI is
// identical whether or not Supabase is configured.
function computeDemoCompliance(projects, entries, waivers, workDate) {
  const dow = new Date(`${workDate}T00:00:00`).getDay();
  const isWeekend = dow === 0 || dow === 6;
  const rows = [];
  for (const project of projects) {
    const inScope = projectInScope(project);
    const entry = entries.find(
      (item) => item.projectId === project.id && item.workDate === workDate &&
        ["draft", "submitted", "returned_for_correction", "resubmitted", "accepted"].includes(item.state)
    );
    const waiver = waivers.find(
      (item) => item.projectId === project.id && item.workDate === workDate && item.state === "active"
    );
    if (!inScope && !entry && !waiver) continue;
    let complianceStatus = "not_due";
    if (entry) complianceStatus = entry.isLate ? "entry_late" : "entry_present";
    else if (waiver) complianceStatus = "waived";
    else if (inScope && !isWeekend) complianceStatus = "missing";
    rows.push({
      projectId: project.id,
      projectName: project.projectName,
      workDate,
      isWeekend,
      due: inScope && !isWeekend,
      entryId: entry?.id || "",
      entryState: entry?.state || "",
      disposition: entry?.disposition || "",
      isLate: entry?.isLate || false,
      waiverId: waiver?.id || "",
      complianceStatus,
    });
  }
  return rows;
}

export default function DailySiteOperationsProvider({ children, session, role, isDemo }) {
  const { currentUserId, projects } = useAdminData();
  const accessToken = session?.access_token || "";
  const [entries, setEntries] = useState([]);
  const [remoteAuthorisedSites, setRemoteAuthorisedSites] = useState([]);
  const [waivers, setWaivers] = useState([]);
  const [eventsByEntry, setEventsByEntry] = useState({});
  const [remoteCompliance, setRemoteCompliance] = useState([]);
  const [remoteAuthorisedProjects, setRemoteAuthorisedProjects] = useState([]);
  const [status, setStatus] = useState(isDemo ? "ready" : "loading");
  const [error, setError] = useState("");

  // The projects the caller may record a NEW entry for. Real mode: the
  // authority-scoped AND operationally-eligible database list (never the blanket
  // projects list). Demo mode: the dev seed projects filtered to the same
  // eligibility rule (Ongoing and not archived) so the preview matches the DB
  // boundary; the production boundary is DB-enforced. Pending, Paused, Completed,
  // Cancelled, Design-only and Archived projects are excluded from new entries.
  const authorisedProjects = useMemo(
    () =>
      isDemo
        ? projects.filter(
            (project) => !project.archived && project.status === "Ongoing"
          )
        : remoteAuthorisedProjects,
    [isDemo, projects, remoteAuthorisedProjects]
  );

  // The SITES a caller may record a new field record for. A Site qualifies
  // through Ongoing Project work OR an active Maintenance relationship, so a
  // maintenance-only property appears here with an empty Projects list.
  const authorisedSites = useMemo(() => {
    if (!isDemo) return remoteAuthorisedSites;
    const bySite = new Map();
    for (const project of projects) {
      if (project.archived || project.status !== "Ongoing") continue;
      const id = project.siteId || `demo-site-of-${project.id}`;
      const current = bySite.get(id) || {
        id,
        siteName: project.clientSiteName || project.projectName,
        location: project.location || "",
        county: project.county || "",
        projects: [],
        hasActiveMaintenance: false,
        maintenanceRelationshipId: "",
      };
      current.projects.push({ id: project.id, projectName: project.projectName, status: project.status });
      bySite.set(id, current);
    }
    return [...bySite.values()];
  }, [isDemo, projects, remoteAuthorisedSites]);

  // Demo compliance is derived (not stored) from local state; real compliance
  // comes from the EAT-aware database RPC via refresh().
  const compliance = useMemo(
    () => (isDemo ? computeDemoCompliance(projects, entries, waivers, todayIso()) : remoteCompliance),
    [isDemo, projects, entries, waivers, remoteCompliance]
  );

  const refresh = useCallback(async () => {
    if (isDemo) {
      setStatus("ready");
      return { ok: true };
    }
    try {
      const [entryRows, waiverRows, complianceRows, authorisedRows, authorisedSiteRows] = await Promise.all([
        fetchDailySiteEntries(accessToken),
        fetchDailySiteWaivers(accessToken),
        fetchMorningCompliance(accessToken, null),
        fetchAuthorisedProjects(accessToken),
        fetchAuthorisedSites(accessToken),
      ]);
      setRemoteAuthorisedSites((authorisedSiteRows || []).map((row) => ({
        id: row.id,
        siteName: row.site_name || "",
        location: row.location || "",
        county: row.county || "",
        projects: (row.projects || []).map((project) => ({
          id: project.id, projectName: project.project_name, status: project.status,
        })),
        // Stated by the database, never inferred from the absence of a Project.
        hasActiveMaintenance: row.has_active_maintenance === true,
        maintenanceRelationshipId: row.maintenance_relationship_id || "",
      })));
      setEntries(entryRows.map(mapDailySiteEntry));
      setWaivers(waiverRows.map(mapDailySiteWaiver));
      setRemoteCompliance((complianceRows || []).map(mapComplianceRow));
      setRemoteAuthorisedProjects((authorisedRows || []).map((row) => ({
        id: row.id,
        projectName: row.project_name,
        status: row.status,
        stage: row.stage,
        archived: Boolean(row.archived),
      })));
      setStatus("ready");
      setError("");
      return { ok: true };
    } catch (nextError) {
      setStatus("error");
      setError(nextError.message || "Unable to load site operations.");
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
    return () => {
      cancelled = true;
    };
  }, [accessToken, isDemo, role, refresh]);

  const loadEvents = useCallback(async (entryId, force = false) => {
    if (!force && eventsByEntry[entryId]) return eventsByEntry[entryId];
    if (isDemo) return eventsByEntry[entryId] || [];
    const rows = await fetchDailySiteEntryEvents(accessToken, entryId);
    const mapped = rows.map(mapDailySiteEntryEvent);
    setEventsByEntry((current) => ({ ...current, [entryId]: mapped }));
    return mapped;
  }, [accessToken, eventsByEntry, isDemo]);

  const runMutation = useCallback(async (operation) => {
    try {
      const result = await operation();
      await refresh();
      return { ok: true, entry: result ? mapDailySiteEntry(result) : null };
    } catch (nextError) {
      return {
        ok: false,
        error: nextError.message || "The action did not complete.",
        stale: nextError.code === "40001" || /stale/i.test(nextError.message || ""),
      };
    }
  }, [refresh]);

  // ---- Demo-mode local mutations -------------------------------------
  const createDraft = useCallback((values) => {
    if (isDemo) {
      const entry = buildDemoEntry(values, currentUserId);
      setEntries((current) => [entry, ...current]);
      setEventsByEntry((current) => ({
        ...current,
        [entry.id]: [{ id: `${entry.id}-created`, entryId: entry.id, eventType: "created", actorId: currentUserId, fromState: "", toState: "draft", versionNumber: 1, eventNotes: "", occurredAt: demoNow() }],
      }));
      return Promise.resolve({ ok: true, entry });
    }
    return runMutation(() => apiCreateDraft(accessToken, values));
  }, [accessToken, isDemo, runMutation, currentUserId]);

  const updateDraft = useCallback((entryId, values) => {
    if (isDemo) {
      setEntries((current) => current.map((entry) => (
        entry.id === entryId
          ? { ...entry, ...buildDemoEntry(values, currentUserId), id: entryId, state: "draft", updatedAt: demoNow() }
          : entry
      )));
      return Promise.resolve({ ok: true });
    }
    return runMutation(() => apiUpdateDraft(accessToken, entryId, values));
  }, [accessToken, isDemo, runMutation, currentUserId]);

  const submitEntry = useCallback((entryId) => {
    if (isDemo) {
      setEntries((current) => current.map((entry) => (
        entry.id === entryId
          ? { ...entry, state: "submitted", submittedBy: currentUserId, submittedAt: demoNow(), isLate: false, updatedAt: demoNow() }
          : entry
      )));
      return Promise.resolve({ ok: true });
    }
    return runMutation(() => apiSubmit(accessToken, entryId));
  }, [accessToken, isDemo, runMutation, currentUserId]);

  const returnEntry = useCallback((entryId, reason) => {
    if (isDemo) {
      setEntries((current) => current.map((entry) => (
        entry.id === entryId
          ? { ...entry, state: "returned_for_correction", returnedReason: reason, reviewedBy: currentUserId, reviewedAt: demoNow(), updatedAt: demoNow() }
          : entry
      )));
      return Promise.resolve({ ok: true });
    }
    return runMutation(() => apiReturn(accessToken, entryId, reason));
  }, [accessToken, isDemo, runMutation, currentUserId]);

  const correctEntry = useCallback((entryId, values) => {
    if (isDemo) {
      setEntries((current) => current.map((entry) => (
        entry.id === entryId
          ? { ...entry, ...buildDemoEntry(values, currentUserId), id: entryId, state: "resubmitted", version: entry.version + 1, returnedReason: "", submittedBy: currentUserId, submittedAt: demoNow(), updatedAt: demoNow() }
          : entry
      )));
      return Promise.resolve({ ok: true });
    }
    return runMutation(() => apiCorrect(accessToken, entryId, values));
  }, [accessToken, isDemo, runMutation, currentUserId]);

  const acceptEntry = useCallback((entryId, notes) => {
    if (isDemo) {
      setEntries((current) => current.map((entry) => (
        entry.id === entryId
          ? { ...entry, state: "accepted", reviewedBy: currentUserId, reviewedAt: demoNow(), updatedAt: demoNow() }
          : entry
      )));
      return Promise.resolve({ ok: true });
    }
    return runMutation(() => apiAccept(accessToken, entryId, notes));
  }, [accessToken, isDemo, runMutation, currentUserId]);

  const voidEntry = useCallback((entryId, reason) => {
    if (isDemo) {
      setEntries((current) => current.map((entry) => (
        entry.id === entryId
          ? { ...entry, state: "voided", voidReason: reason, updatedAt: demoNow() }
          : entry
      )));
      return Promise.resolve({ ok: true });
    }
    return runMutation(() => apiVoid(accessToken, entryId, reason));
  }, [accessToken, isDemo, runMutation]);

  const supersedeEntry = useCallback((entryId, reason, values) => {
    if (isDemo) {
      let created;
      setEntries((current) => {
        const next = current.map((entry) => (entry.id === entryId ? { ...entry, state: "superseded", supersessionReason: reason } : entry));
        const original = current.find((entry) => entry.id === entryId);
        created = buildDemoEntry(values, currentUserId, { state: "accepted", version: (original?.version || 1) + 1, supersedesEntryId: entryId, submittedBy: currentUserId, submittedAt: demoNow(), reviewedBy: currentUserId, reviewedAt: demoNow() });
        return [created, ...next];
      });
      return Promise.resolve({ ok: true, entry: created });
    }
    return runMutation(() => apiSupersede(accessToken, entryId, reason, values));
  }, [accessToken, isDemo, runMutation, currentUserId]);

  const createWaiver = useCallback((projectId, workDate, reason) => {
    if (isDemo) {
      const waiver = { id: `demo-waiver-${Date.now()}`, projectId, workDate, reason, state: "active", createdBy: currentUserId, createdAt: demoNow(), revokedBy: "", revokedAt: "", revokeReason: "" };
      setWaivers((current) => [waiver, ...current]);
      return Promise.resolve({ ok: true, waiver });
    }
    return runMutation(() => apiCreateWaiver(accessToken, projectId, workDate, reason));
  }, [accessToken, isDemo, runMutation, currentUserId]);

  const revokeWaiver = useCallback((waiverId, reason) => {
    if (isDemo) {
      setWaivers((current) => current.map((waiver) => (waiver.id === waiverId ? { ...waiver, state: "revoked", revokedBy: currentUserId, revokedAt: demoNow(), revokeReason: reason || "" } : waiver)));
      return Promise.resolve({ ok: true });
    }
    return runMutation(() => apiRevokeWaiver(accessToken, waiverId, reason));
  }, [accessToken, isDemo, runMutation, currentUserId]);

  const value = useMemo(() => ({
    entries,
    waivers,
    compliance,
    authorisedProjects,
    authorisedSites,
    status,
    error,
    refresh,
    loadEvents,
    createDraft,
    updateDraft,
    submitEntry,
    returnEntry,
    correctEntry,
    acceptEntry,
    voidEntry,
    supersedeEntry,
    createWaiver,
    revokeWaiver,
  }), [
    entries, waivers, compliance, authorisedProjects, authorisedSites, status, error, refresh, loadEvents,
    createDraft, updateDraft, submitEntry, returnEntry, correctEntry,
    acceptEntry, voidEntry, supersedeEntry, createWaiver, revokeWaiver,
  ]);

  return (
    <DailySiteOperationsContext.Provider value={value}>
      {children}
    </DailySiteOperationsContext.Provider>
  );
}
