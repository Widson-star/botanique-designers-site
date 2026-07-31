import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminData } from "./adminData";
import { useSiteCosts } from "./siteCosts";
import { FundRequestsContext } from "./fundRequests";
import {
  cancelFundRequest, createFundRequestDraft, decideFundRequest, directAuthoriseFundRequest,
  fetchClaimAvailability, fetchFundRequestAllocations, fetchFundRequestEvents,
  fetchFundRequestProjects, fetchFundRequests, submitFundRequest, updateFundRequest,
  withdrawFundRequest,
} from "../lib/fundRequests";
import {
  calculateFundRequestTotal, isReservingFundRequest,
} from "../utils/fundRequestCapabilities";

const now = () => new Date().toISOString();

function mapRequest(row) {
  return {
    id: row.id, requestNumber: row.request_number, projectId: row.project_id,
    authorityType: row.authority_type, status: row.status,
    requesterId: row.requester_id || "", directAuthorityActorId: row.direct_authority_actor_id || "",
    intendedCustodyType: row.intended_custody_type, custodianProfileId: row.custodian_profile_id || "",
    purpose: row.purpose, currency: row.currency,
    totalRequestedAmount: row.total_requested_amount == null ? null : Number(row.total_requested_amount),
    submissionRound: row.submission_round, version: row.version,
    createdAt: row.created_at, updatedAt: row.updated_at, submittedAt: row.submitted_at || "",
    decidedAt: row.decided_at || "", withdrawnAt: row.withdrawn_at || "", cancelledAt: row.cancelled_at || "",
  };
}

function mapAllocation(row) {
  return {
    id: row.id, fundRequestId: row.fund_request_id, claimId: row.internal_cost_claim_id,
    allocationOrder: row.allocation_order, requestedAmount: Number(row.requested_amount),
    claimReference: row.claim_reference_snapshot, claimServiceDate: row.claim_service_date_snapshot,
    claimRecipientType: row.claim_recipient_type_snapshot,
    claimRecipientLabel: row.claim_recipient_label_snapshot,
    claimCategory: row.claim_category_snapshot, claimPurpose: row.claim_purpose_snapshot,
    claimApprovedTotal: Number(row.claim_approved_total_snapshot),
  };
}

function mapEvent(row) {
  return {
    id: row.id, fundRequestId: row.fund_request_id, eventType: row.event_type,
    actorId: row.actor_id, fromStatus: row.from_status || "", toStatus: row.to_status,
    requestVersion: row.request_version, submissionRound: row.submission_round,
    reason: row.reason || "", createdAt: row.created_at,
  };
}

function mapAvailability(row) {
  return {
    claimId: row.claim_id, projectId: row.project_id, claimReference: row.claim_reference,
    serviceDate: row.service_date, recipientType: row.recipient_type,
    recipientLabel: row.recipient_label, category: row.category, purpose: row.purpose,
    approvedTotal: Number(row.approved_total),
    reservedElsewhere: Number(row.reserved_elsewhere),
    requestedInRequest: Number(row.requested_in_request),
    availableToRequest: Number(row.available_to_request),
  };
}

export default function FundRequestsProvider({ children, session, role, isDemo }) {
  const { projects, profiles, currentUserId } = useAdminData();
  const { claims: costClaims } = useSiteCosts();
  const accessToken = session?.access_token || "";
  const [requests, setRequests] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [eventsByRequest, setEventsByRequest] = useState({});
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
      const [requestRows, allocationRows, projectRows] = await Promise.all([
        fetchFundRequests(accessToken), fetchFundRequestAllocations(accessToken),
        fetchFundRequestProjects(accessToken),
      ]);
      setRequests((requestRows || []).map(mapRequest));
      setAllocations((allocationRows || []).map(mapAllocation));
      setRemoteProjects((projectRows || []).map((row) => ({
        id: row.id, projectName: row.project_name, status: row.status, archived: Boolean(row.archived),
      })));
      setStatus("ready"); setError("");
      return { ok: true };
    } catch (nextError) {
      setStatus("error"); setError(nextError.message || "Unable to load fund requests.");
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

  const loadEvents = useCallback(async (requestId, force = false) => {
    if (!force && eventsByRequest[requestId]) return eventsByRequest[requestId];
    if (isDemo) return eventsByRequest[requestId] || [];
    const mapped = (await fetchFundRequestEvents(accessToken, requestId)).map(mapEvent);
    setEventsByRequest((current) => ({ ...current, [requestId]: mapped }));
    return mapped;
  }, [accessToken, eventsByRequest, isDemo]);

  // Demo availability is derived locally from approved Site Cost claims so the surface can be
  // explored without a hosted database. Live availability always comes from the database.
  const demoAvailability = useCallback((projectId, requestId = null) => costClaims
    .filter((claim) => claim.projectId === projectId && claim.lifecycle === "approved")
    .map((claim) => {
      const approvedTotal = Number(claim.approvedTotal || 0);
      const reservedElsewhere = allocations
        .filter((allocation) => allocation.claimId === claim.id && allocation.fundRequestId !== requestId)
        .filter((allocation) => isReservingFundRequest(
          requests.find((request) => request.id === allocation.fundRequestId)?.status))
        .reduce((sum, allocation) => sum + allocation.requestedAmount, 0);
      const requestedInRequest = allocations
        .filter((allocation) => allocation.claimId === claim.id && allocation.fundRequestId === requestId)
        .reduce((sum, allocation) => sum + allocation.requestedAmount, 0);
      return {
        claimId: claim.id, projectId: claim.projectId,
        claimReference: `ICC-${claim.id.slice(0, 8).toUpperCase()}`,
        serviceDate: claim.serviceDate, recipientType: claim.recipientType,
        recipientLabel: claim.recipientLabel, category: claim.category, purpose: claim.purpose,
        approvedTotal, reservedElsewhere, requestedInRequest,
        availableToRequest: Math.max(approvedTotal - reservedElsewhere, 0),
      };
    }), [allocations, costClaims, requests]);

  const loadAvailability = useCallback(async (projectId, requestId = null) => {
    if (!projectId) return [];
    if (isDemo) return demoAvailability(projectId, requestId);
    const rows = await fetchClaimAvailability(accessToken, projectId, requestId);
    return (rows || []).map(mapAvailability);
  }, [accessToken, demoAvailability, isDemo]);

  const run = useCallback(async (operation) => {
    try {
      const result = await operation();
      await refresh();
      return { ok: true, request: result ? mapRequest(result) : null };
    } catch (nextError) {
      const message = nextError.message || "The fund request action did not complete.";
      return {
        ok: false,
        error: message,
        stale: nextError.code === "40001" || /stale/i.test(message),
        // A reservation conflict means another request took the availability first. The form
        // keeps its data and refreshes availability rather than implying a partial save.
        conflict: nextError.code === "BDF01" || /no longer available to request/i.test(message),
      };
    }
  }, [refresh]);

  const demoCreate = useCallback((values, direct = false) => {
    const id = `demo-fund-${Date.now()}`;
    const total = calculateFundRequestTotal(values.allocations);
    const request = {
      id, requestNumber: `BDFR-${new Date().getFullYear()}-DEMO`, projectId: values.projectId,
      authorityType: direct ? "principal_direct" : "manager_requested",
      status: direct ? "approved" : "draft",
      requesterId: direct ? "" : currentUserId,
      directAuthorityActorId: direct ? currentUserId : "",
      intendedCustodyType: values.intendedCustodyType,
      custodianProfileId: values.custodianProfileId || "",
      purpose: values.purpose, currency: "KES", totalRequestedAmount: total || null,
      submissionRound: 0, version: 1, createdAt: now(), updatedAt: now(),
      decidedAt: direct ? now() : "",
    };
    setRequests((current) => [request, ...current]);
    setAllocations((current) => [...current, ...values.allocations.map((allocation, index) => ({
      id: `${id}-allocation-${index}`, fundRequestId: id, claimId: allocation.claimId,
      allocationOrder: index + 1, requestedAmount: Number(allocation.requestedAmount),
      claimReference: allocation.claimReference || "", claimServiceDate: allocation.serviceDate || "",
      claimRecipientType: allocation.recipientType || "", claimRecipientLabel: allocation.recipientLabel || "",
      claimCategory: allocation.category || "", claimPurpose: allocation.purpose || "",
      claimApprovedTotal: Number(allocation.approvedTotal || 0),
    }))]);
    setEventsByRequest((current) => ({ ...current, [id]: [{
      id: `${id}-event`, fundRequestId: id, actorId: currentUserId,
      eventType: direct ? "principal_direct_authorised" : "draft_created",
      fromStatus: "", toStatus: request.status, requestVersion: 1, submissionRound: 0,
      reason: "", createdAt: now(),
    }] }));
    return { ok: true, request };
  }, [currentUserId]);

  const demoTransition = useCallback((requestId, expectedVersion, nextStatus, eventType, reason = "") => {
    const currentRequest = requests.find((request) => request.id === requestId);
    if (!currentRequest || currentRequest.version !== expectedVersion) {
      return { ok: false, error: "This fund request changed elsewhere.", stale: true };
    }
    const changed = {
      ...currentRequest,
      status: nextStatus,
      submissionRound: nextStatus === "submitted" ? currentRequest.submissionRound + 1 : currentRequest.submissionRound,
      decidedAt: ["approved", "rejected"].includes(nextStatus) ? now() : currentRequest.decidedAt,
      withdrawnAt: nextStatus === "withdrawn" ? now() : currentRequest.withdrawnAt,
      cancelledAt: nextStatus === "cancelled" ? now() : currentRequest.cancelledAt,
      version: currentRequest.version + 1,
      updatedAt: now(),
    };
    setRequests((current) => current.map((request) => request.id === requestId ? changed : request));
    setEventsByRequest((current) => ({ ...current, [requestId]: [...(current[requestId] || []), {
      id: `${requestId}-${eventType}-${changed.version}`, fundRequestId: requestId,
      actorId: currentUserId, eventType, fromStatus: currentRequest.status, toStatus: nextStatus,
      requestVersion: changed.version, submissionRound: changed.submissionRound,
      reason, createdAt: now(),
    }] }));
    return { ok: true, request: changed };
  }, [currentUserId, requests]);

  const createDraft = useCallback((values) => isDemo
    ? Promise.resolve(demoCreate(values))
    : run(() => createFundRequestDraft(accessToken, values)), [accessToken, demoCreate, isDemo, run]);

  const authoriseDirect = useCallback((values, reason = "") => isDemo
    ? Promise.resolve(demoCreate(values, true))
    : run(() => directAuthoriseFundRequest(accessToken, values, reason)), [accessToken, demoCreate, isDemo, run]);

  const updateRequest = useCallback((requestId, expectedVersion, values) => isDemo
    ? Promise.resolve({ ok: false, error: "Demo amendment is not persisted." })
    : run(() => updateFundRequest(accessToken, requestId, expectedVersion, values)), [accessToken, isDemo, run]);

  const submitRequest = useCallback((requestId, expectedVersion) => isDemo
    ? Promise.resolve(demoTransition(requestId, expectedVersion, "submitted", "submitted"))
    : run(() => submitFundRequest(accessToken, requestId, expectedVersion)), [accessToken, demoTransition, isDemo, run]);

  const withdrawRequest = useCallback((requestId, version, reason) => isDemo
    ? Promise.resolve(demoTransition(requestId, version, "withdrawn", "withdrawn", reason))
    : run(() => withdrawFundRequest(accessToken, requestId, version, reason)), [accessToken, demoTransition, isDemo, run]);

  const decideRequest = useCallback((requestId, version, decision, reason) => isDemo
    ? Promise.resolve(demoTransition(requestId, version, decision, decision, reason))
    : run(() => decideFundRequest(accessToken, requestId, version, decision, reason)), [accessToken, demoTransition, isDemo, run]);

  const cancelRequest = useCallback((requestId, version, reason) => isDemo
    ? Promise.resolve(demoTransition(requestId, version, "cancelled", "cancelled", reason))
    : run(() => cancelFundRequest(accessToken, requestId, version, reason)), [accessToken, demoTransition, isDemo, run]);

  const value = useMemo(() => ({
    requests, allocations, eventsByRequest, authorisedProjects, status, error, profiles,
    refresh, loadEvents, loadAvailability, createDraft, authoriseDirect, updateRequest,
    submitRequest, withdrawRequest, decideRequest, cancelRequest,
    allocationsForRequest: (requestId) => allocations
      .filter((allocation) => allocation.fundRequestId === requestId)
      .sort((first, second) => first.allocationOrder - second.allocationOrder),
  }), [requests, allocations, eventsByRequest, authorisedProjects, status, error, profiles,
    refresh, loadEvents, loadAvailability, createDraft, authoriseDirect, updateRequest,
    submitRequest, withdrawRequest, decideRequest, cancelRequest]);

  return <FundRequestsContext.Provider value={value}>{children}</FundRequestsContext.Provider>;
}
