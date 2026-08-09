import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAdminData } from "./adminData";
import { SiteCostsContext } from "./siteCosts";
import {
  cancelInternalCostClaim, createInternalCostClaimDraft, decideInternalCostClaim,
  fetchInternalCostClaimEvents, fetchInternalCostClaimLines, fetchInternalCostClaimProjects,
  fetchInternalCostClaims, principalAuthoriseInternalCostClaim, submitInternalCostClaim,
  updateInternalCostClaim, withdrawInternalCostClaim,
} from "../lib/siteCosts";
import { calculateSiteCostTotal } from "../utils/siteCostCapabilities";

const now = () => new Date().toISOString();

function mapClaim(row) {
  return {
    id: row.id, projectId: row.project_id, dailySiteEntryId: row.daily_site_entry_id || "",
    dailySiteSourceVersion: row.daily_site_source_version ?? null,
    dailySiteSnapshot: row.daily_site_snapshot || null, serviceDate: row.service_date,
    recipientType: row.recipient_type, recipientLabel: row.recipient_label,
    category: row.category, currency: row.currency, purpose: row.purpose,
    lifecycle: row.lifecycle, requestRound: row.request_round,
    submittedTotal: row.submitted_total == null ? null : Number(row.submitted_total),
    approvedTotal: row.approved_total == null ? null : Number(row.approved_total),
    requesterId: row.requester_id, deciderId: row.decider_id || "",
    directAuthorityActorId: row.direct_authority_actor_id || "", version: row.version,
    createdAt: row.created_at, updatedAt: row.updated_at, submittedAt: row.submitted_at || "",
    decidedAt: row.decided_at || "", withdrawnAt: row.withdrawn_at || "", cancelledAt: row.cancelled_at || "",
  };
}

function mapLine(row) {
  return {
    id: row.id, claimId: row.claim_id, lineNumber: row.line_number,
    description: row.description, rateType: row.rate_type, quantity: Number(row.quantity),
    unit: row.unit, unitRate: Number(row.unit_rate), lineTotal: Number(row.line_total),
  };
}

function mapEvent(row) {
  return {
    id: row.id, claimId: row.claim_id, actorId: row.actor_id, eventType: row.event_type,
    previousLifecycle: row.previous_lifecycle || "", nextLifecycle: row.next_lifecycle,
    requestRound: row.request_round, reason: row.reason || "", occurredAt: row.occurred_at,
  };
}

export default function SiteCostsProvider({ children, session, role, isDemo }) {
  const { projects, profiles, currentUserId } = useAdminData();
  const accessToken = session?.access_token || "";
  const [claims, setClaims] = useState([]);
  const [lines, setLines] = useState([]);
  // In hosted mode the database is the truth and refresh() re-reads it after every action.
  // In demo mode this provider IS the truth, and AdminSiteCostForm creates a draft and submits
  // it in the same tick, before React has re-rendered. These mirrors let each demo path read
  // what the previous demo path just wrote instead of a closure captured before it.
  const demoClaimsRef = useRef([]);
  const demoLinesRef = useRef([]);

  const writeDemoClaims = useCallback((next) => {
    demoClaimsRef.current = next;
    setClaims(next);
  }, []);
  const writeDemoLines = useCallback((next) => {
    demoLinesRef.current = next;
    setLines(next);
  }, []);
  const [eventsByClaim, setEventsByClaim] = useState({});
  const [remoteProjects, setRemoteProjects] = useState([]);
  const [status, setStatus] = useState(isDemo ? "ready" : "loading");
  const [error, setError] = useState("");

  const authorisedProjects = useMemo(() => isDemo
    ? projects.filter((project) => project.status === "Ongoing" && !project.archived)
    : remoteProjects,
  [isDemo, projects, remoteProjects]);

  const refresh = useCallback(async () => {
    if (isDemo) return { ok: true };
    try {
      const [claimRows, lineRows, projectRows] = await Promise.all([
        fetchInternalCostClaims(accessToken), fetchInternalCostClaimLines(accessToken),
        fetchInternalCostClaimProjects(accessToken),
      ]);
      setClaims((claimRows || []).map(mapClaim));
      setLines((lineRows || []).map(mapLine));
      setRemoteProjects((projectRows || []).map((row) => ({
        id: row.id, projectName: row.project_name, status: row.status, archived: Boolean(row.archived),
      })));
      setStatus("ready"); setError("");
      return { ok: true };
    } catch (nextError) {
      setStatus("error"); setError(nextError.message || "Unable to load project costs.");
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

  const loadEvents = useCallback(async (claimId, force = false) => {
    if (!force && eventsByClaim[claimId]) return eventsByClaim[claimId];
    if (isDemo) return eventsByClaim[claimId] || [];
    const mapped = (await fetchInternalCostClaimEvents(accessToken, claimId)).map(mapEvent);
    setEventsByClaim((current) => ({ ...current, [claimId]: mapped }));
    return mapped;
  }, [accessToken, eventsByClaim, isDemo]);

  const run = useCallback(async (operation) => {
    try {
      const result = await operation();
      await refresh();
      return { ok: true, claim: result ? mapClaim(result) : null };
    } catch (nextError) {
      const message = nextError.message || "The project cost action did not complete.";
      return { ok: false, error: message, stale: nextError.code === "40001" || /stale/i.test(message) };
    }
  }, [refresh]);

  const demoCreate = useCallback((values, direct = false) => {
    const id = `demo-cost-${Date.now()}`;
    const total = calculateSiteCostTotal(values.lines);
    const claim = {
      ...values, id, currency: "KES", lifecycle: direct ? "approved" : "draft",
      requestRound: 0, submittedTotal: direct ? total : null, approvedTotal: direct ? total : null,
      requesterId: currentUserId, deciderId: "", directAuthorityActorId: direct ? currentUserId : "",
      version: 1, createdAt: now(), updatedAt: now(), decidedAt: direct ? now() : "",
    };
    writeDemoClaims([claim, ...demoClaimsRef.current]);
    writeDemoLines([...demoLinesRef.current, ...values.lines.map((line, index) => ({
      ...line, id: `${id}-line-${index}`, claimId: id, lineNumber: index + 1,
      quantity: Number(line.quantity), unitRate: Number(line.unitRate),
      lineTotal: Number(line.quantity) * Number(line.unitRate),
    }))]);
    setEventsByClaim((current) => ({ ...current, [id]: [{
      id: `${id}-event`, claimId: id, actorId: currentUserId,
      eventType: direct ? "principal_authorised" : "created", previousLifecycle: "",
      nextLifecycle: claim.lifecycle, requestRound: 0, reason: "", occurredAt: now(),
    }] }));
    return { ok: true, claim };
  }, [currentUserId, writeDemoClaims, writeDemoLines]);

  const createDraft = useCallback((values) => isDemo ? Promise.resolve(demoCreate(values))
    : run(() => createInternalCostClaimDraft(accessToken, values)), [accessToken, demoCreate, isDemo, run]);
  const authoriseDirect = useCallback((values, reason = "") => isDemo ? Promise.resolve(demoCreate(values, true))
    : run(() => principalAuthoriseInternalCostClaim(accessToken, values, reason)), [accessToken, demoCreate, isDemo, run]);

  const updateClaim = useCallback((claimId, expectedVersion, values) => isDemo
    ? Promise.resolve({ ok: false, error: "Demo amendment is not persisted." })
    : run(() => updateInternalCostClaim(accessToken, claimId, expectedVersion, values)), [accessToken, isDemo, run]);

  // submit_internal_cost_claim sets submitted_total from the claim's own lines and refuses a
  // stale version. The demo path proves the same two things against the mirrored state.
  const demoSubmit = useCallback((claimId, expectedVersion) => {
    const currentClaim = demoClaimsRef.current.find((claim) => claim.id === claimId);
    if (!currentClaim || currentClaim.version !== expectedVersion) {
      return { ok: false, error: "This claim changed elsewhere.", stale: true };
    }
    const total = demoLinesRef.current
      .filter((line) => line.claimId === claimId)
      .reduce((sum, line) => sum + line.lineTotal, 0);
    const changed = {
      ...currentClaim, lifecycle: "awaiting_review", requestRound: currentClaim.requestRound + 1,
      submittedTotal: total, version: currentClaim.version + 1, submittedAt: now(), updatedAt: now(),
    };
    writeDemoClaims(demoClaimsRef.current.map((claim) => claim.id === claimId ? changed : claim));
    setEventsByClaim((current) => ({ ...current, [claimId]: [...(current[claimId] || []), {
      id: `${claimId}-submitted-${changed.version}`, claimId, actorId: currentUserId,
      eventType: currentClaim.requestRound === 0 ? "submitted" : "resubmitted",
      previousLifecycle: currentClaim.lifecycle, nextLifecycle: "awaiting_review",
      requestRound: changed.requestRound, reason: "", occurredAt: now(),
    }] }));
    return { ok: true, claim: changed };
  }, [currentUserId, writeDemoClaims]);

  const submitClaim = useCallback((claimId, expectedVersion) => isDemo
    ? Promise.resolve(demoSubmit(claimId, expectedVersion))
    : run(() => submitInternalCostClaim(accessToken, claimId, expectedVersion)),
  [accessToken, demoSubmit, isDemo, run]);

  const demoTransition = useCallback((claimId, expectedVersion, nextLifecycle, eventType, reason = "") => {
    const currentClaim = demoClaimsRef.current.find((claim) => claim.id === claimId);
    if (!currentClaim || currentClaim.version !== expectedVersion) {
      return { ok: false, error: "This claim changed elsewhere.", stale: true };
    }
    const changed = {
      ...currentClaim,
      lifecycle: nextLifecycle,
      approvedTotal: nextLifecycle === "approved" ? currentClaim.submittedTotal : currentClaim.approvedTotal,
      deciderId: ["approved", "rejected", "amendment_requested"].includes(nextLifecycle) ? currentUserId : currentClaim.deciderId,
      decidedAt: ["approved", "rejected"].includes(nextLifecycle) ? now() : currentClaim.decidedAt,
      withdrawnAt: nextLifecycle === "withdrawn" ? now() : currentClaim.withdrawnAt,
      cancelledAt: nextLifecycle === "cancelled" ? now() : currentClaim.cancelledAt,
      version: currentClaim.version + 1,
      updatedAt: now(),
    };
    writeDemoClaims(demoClaimsRef.current.map((claim) => claim.id === claimId ? changed : claim));
    setEventsByClaim((current) => ({ ...current, [claimId]: [...(current[claimId] || []), {
      id: `${claimId}-${eventType}-${changed.version}`, claimId, actorId: currentUserId,
      eventType, previousLifecycle: currentClaim.lifecycle, nextLifecycle,
      requestRound: currentClaim.requestRound, reason, occurredAt: now(),
    }] }));
    return { ok: true, claim: changed };
  }, [currentUserId, writeDemoClaims]);

  const withdrawClaim = useCallback((claimId, version, reason) => isDemo
    ? Promise.resolve(demoTransition(claimId, version, "withdrawn", "withdrawn", reason))
    : run(() => withdrawInternalCostClaim(accessToken, claimId, version, reason)), [accessToken, demoTransition, isDemo, run]);
  const decideClaim = useCallback((claimId, version, decision, reason) => isDemo
    ? Promise.resolve(demoTransition(claimId, version, decision, decision, reason))
    : run(() => decideInternalCostClaim(accessToken, claimId, version, decision, reason)), [accessToken, demoTransition, isDemo, run]);
  const cancelClaim = useCallback((claimId, version, reason) => isDemo
    ? Promise.resolve(demoTransition(claimId, version, "cancelled", "cancelled", reason))
    : run(() => cancelInternalCostClaim(accessToken, claimId, version, reason)), [accessToken, demoTransition, isDemo, run]);

  const value = useMemo(() => ({
    claims, lines, eventsByClaim, authorisedProjects, status, error, profiles,
    refresh, loadEvents, createDraft, authoriseDirect, updateClaim, submitClaim,
    withdrawClaim, decideClaim, cancelClaim,
    linesForClaim: (claimId) => lines.filter((line) => line.claimId === claimId),
  }), [claims, lines, eventsByClaim, authorisedProjects, status, error, profiles, refresh,
    loadEvents, createDraft, authoriseDirect, updateClaim, submitClaim, withdrawClaim, decideClaim, cancelClaim]);

  return <SiteCostsContext.Provider value={value}>{children}</SiteCostsContext.Provider>;
}
