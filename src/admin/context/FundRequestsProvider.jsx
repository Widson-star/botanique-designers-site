import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  confirmFundReleaseReceipt, decideFundAcquittal, fetchFundAcquittalLines, fetchFundAcquittals,
  fetchFundReleases, recordFundRelease, reverseFundRelease, submitFundAcquittal,
} from "../lib/fundReleases";
import {
  calculateFundRequestTotal, isReservingFundRequest,
} from "../utils/fundRequestCapabilities";
import {
  calculateAcquittalSpend, deriveFinancialPosition, remainingReleasable,
} from "../utils/fundReleaseCapabilities";

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

function mapRelease(row) {
  return {
    id: row.id, releaseNumber: row.release_number, fundRequestId: row.fund_request_id,
    status: row.status, custodyDisposition: row.custody_disposition,
    recipientProfileId: row.recipient_profile_id || "", recipientLabel: row.recipient_label || "",
    currency: row.currency, releasedAmount: Number(row.released_amount),
    releasedAt: row.released_at, paymentChannel: row.payment_channel,
    paymentReference: row.payment_reference || "", note: row.note || "",
    recordedBy: row.recorded_by, recordedAt: row.recorded_at,
    receiptConfirmedBy: row.receipt_confirmed_by || "",
    receiptConfirmedAt: row.receipt_confirmed_at || "",
    reversedBy: row.reversed_by || "", reversedAt: row.reversed_at || "",
    reversalReason: row.reversal_reason || "", version: row.version,
  };
}

function mapAcquittal(row) {
  return {
    id: row.id, fundReleaseId: row.fund_release_id, state: row.state,
    releasedAmountSnapshot: Number(row.released_amount_snapshot),
    actualSpendTotal: Number(row.actual_spend_total),
    returnedAmount: Number(row.returned_amount),
    varianceAmount: Number(row.variance_amount),
    evidenceReference: row.evidence_reference || "", note: row.note || "",
    submittedBy: row.submitted_by, submittedAt: row.submitted_at,
    acceptedBy: row.accepted_by || "", acceptedAt: row.accepted_at || "",
    varianceOverrideReason: row.variance_override_reason || "", version: row.version,
  };
}

function mapAcquittalLine(row) {
  return {
    id: row.id, acquittalId: row.acquittal_id, lineNumber: row.line_number,
    description: row.description, category: row.category, amount: Number(row.amount),
    spentOn: row.spent_on,
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
  const [releases, setReleases] = useState([]);
  const [acquittals, setAcquittals] = useState([]);
  const [acquittalLines, setAcquittalLines] = useState([]);
  const [remoteProjects, setRemoteProjects] = useState([]);
  // Demo mode has no database to re-read, so the money records are mirrored synchronously for
  // the same reason SiteCostsProvider mirrors claims: a surface may record a release and read
  // the resulting position before React has re-rendered.
  const demoReleasesRef = useRef([]);
  const demoAcquittalsRef = useRef([]);
  const demoAcquittalLinesRef = useRef([]);

  const writeDemoReleases = useCallback((next) => {
    demoReleasesRef.current = next;
    setReleases(next);
  }, []);
  const writeDemoAcquittals = useCallback((next, nextLines) => {
    demoAcquittalsRef.current = next;
    setAcquittals(next);
    if (nextLines) {
      demoAcquittalLinesRef.current = nextLines;
      setAcquittalLines(nextLines);
    }
  }, []);
  const [status, setStatus] = useState(isDemo ? "ready" : "loading");
  const [error, setError] = useState("");

  const authorisedProjects = useMemo(() => isDemo
    ? projects.filter((project) => project.status === "Ongoing" && !project.archived)
    : remoteProjects,
  [isDemo, projects, remoteProjects]);

  const refresh = useCallback(async () => {
    if (isDemo) return { ok: true };
    try {
      const [requestRows, allocationRows, projectRows, releaseRows, acquittalRows, lineRows] =
        await Promise.all([
          fetchFundRequests(accessToken), fetchFundRequestAllocations(accessToken),
          fetchFundRequestProjects(accessToken), fetchFundReleases(accessToken),
          fetchFundAcquittals(accessToken), fetchFundAcquittalLines(accessToken),
        ]);
      setRequests((requestRows || []).map(mapRequest));
      setAllocations((allocationRows || []).map(mapAllocation));
      setReleases((releaseRows || []).map(mapRelease));
      setAcquittals((acquittalRows || []).map(mapAcquittal));
      setAcquittalLines((lineRows || []).map(mapAcquittalLine));
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

  // ---------------------------------------------------------------------------
  // BD-FIN-01C. Money movement and what became of it. Every guard below mirrors the RPC that
  // enforces it in the database; the demo path never permits something the database refuses.
  // ---------------------------------------------------------------------------

  const runMoney = useCallback(async (operation, key) => {
    try {
      const result = await operation();
      await refresh();
      return { ok: true, [key]: result || null };
    } catch (nextError) {
      const message = nextError.message || "The action did not complete.";
      return {
        ok: false,
        error: message,
        stale: nextError.code === "40001" || /stale/i.test(message),
        // The approved authority ran out while the form was open.
        conflict: nextError.code === "BDF02" || /remains releasable/i.test(message),
      };
    }
  }, [refresh]);

  const demoRecordRelease = useCallback((requestId, values) => {
    const request = requests.find((item) => item.id === requestId);
    if (!request || request.status !== "approved") {
      return { ok: false, error: "Only an approved fund request may carry a release." };
    }
    const amount = Number(values.releasedAmount);
    const remaining = remainingReleasable(request,
      demoReleasesRef.current.filter((release) => release.fundRequestId === requestId));
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: "A release must record a positive amount." };
    }
    if (amount > remaining) {
      return {
        ok: false, conflict: true,
        error: `Only KES ${remaining.toLocaleString("en-KE")} remains releasable against this authority.`,
      };
    }
    const id = `demo-release-${Date.now()}`;
    const release = {
      id, releaseNumber: `BDRL-${new Date().getFullYear()}-DEMO`, fundRequestId: requestId,
      status: "recorded", custodyDisposition: values.custodyDisposition,
      recipientProfileId: values.recipientProfileId || "",
      recipientLabel: values.recipientLabel || "", currency: "KES", releasedAmount: amount,
      releasedAt: values.releasedAt || now(), paymentChannel: values.paymentChannel,
      paymentReference: values.paymentReference || "", note: values.note || "",
      recordedBy: currentUserId, recordedAt: now(), receiptConfirmedBy: "",
      receiptConfirmedAt: "", reversedBy: "", reversedAt: "", reversalReason: "", version: 1,
    };
    writeDemoReleases([release, ...demoReleasesRef.current]);
    return { ok: true, release };
  }, [currentUserId, requests, writeDemoReleases]);

  const recordRelease = useCallback((requestId, values) => isDemo
    ? Promise.resolve(demoRecordRelease(requestId, values))
    : runMoney(() => recordFundRelease(accessToken, requestId, values), "release"),
  [accessToken, demoRecordRelease, isDemo, runMoney]);

  const demoUpdateRelease = useCallback((releaseId, expectedVersion, patch) => {
    const current = demoReleasesRef.current.find((release) => release.id === releaseId);
    if (!current || current.version !== expectedVersion) {
      return { ok: false, error: "This release changed elsewhere.", stale: true };
    }
    const changed = { ...current, ...patch, version: current.version + 1 };
    writeDemoReleases(demoReleasesRef.current.map((release) => release.id === releaseId ? changed : release));
    return { ok: true, release: changed };
  }, [writeDemoReleases]);

  const reverseRelease = useCallback((releaseId, expectedVersion, reason) => isDemo
    ? Promise.resolve(demoUpdateRelease(releaseId, expectedVersion, {
      status: "reversed", reversedBy: currentUserId, reversedAt: now(), reversalReason: reason,
    }))
    : runMoney(() => reverseFundRelease(accessToken, releaseId, expectedVersion, reason), "release"),
  [accessToken, currentUserId, demoUpdateRelease, isDemo, runMoney]);

  const confirmReceipt = useCallback((releaseId, expectedVersion) => isDemo
    ? Promise.resolve(demoUpdateRelease(releaseId, expectedVersion, {
      receiptConfirmedBy: currentUserId, receiptConfirmedAt: now(),
    }))
    : runMoney(() => confirmFundReleaseReceipt(accessToken, releaseId, expectedVersion), "release"),
  [accessToken, currentUserId, demoUpdateRelease, isDemo, runMoney]);

  const demoSubmitAcquittal = useCallback((releaseId, expectedVersion, values) => {
    const release = demoReleasesRef.current.find((item) => item.id === releaseId);
    if (!release) return { ok: false, error: "Fund release not found." };
    const existing = demoAcquittalsRef.current.find((item) => item.fundReleaseId === releaseId);
    if (existing && existing.state !== "amendment_requested") {
      return { ok: false, error: "This reconciliation is not open for a further submission." };
    }
    const expected = existing ? existing.version : release.version;
    if (expected !== expectedVersion) {
      return { ok: false, error: "This reconciliation changed elsewhere.", stale: true };
    }
    const spend = calculateAcquittalSpend(values.lines);
    const id = existing?.id || `demo-acquittal-${Date.now()}`;
    const acquittal = {
      id, fundReleaseId: releaseId, state: "submitted",
      releasedAmountSnapshot: release.releasedAmount, actualSpendTotal: spend,
      returnedAmount: Number(values.returnedAmount || 0),
      varianceAmount: Math.round((release.releasedAmount - spend - Number(values.returnedAmount || 0)) * 100) / 100,
      evidenceReference: values.evidenceReference || "", note: values.note || "",
      submittedBy: currentUserId, submittedAt: now(), acceptedBy: "", acceptedAt: "",
      varianceOverrideReason: "", version: existing ? existing.version + 1 : 1,
    };
    const nextLines = [
      ...demoAcquittalLinesRef.current.filter((line) => line.acquittalId !== id),
      ...(values.lines || []).map((line, index) => ({
        id: `${id}-line-${index}`, acquittalId: id, lineNumber: index + 1,
        description: line.description, category: line.category,
        amount: Number(line.amount), spentOn: line.spentOn,
      })),
    ];
    writeDemoAcquittals(
      existing
        ? demoAcquittalsRef.current.map((item) => item.id === id ? acquittal : item)
        : [acquittal, ...demoAcquittalsRef.current],
      nextLines
    );
    return { ok: true, acquittal };
  }, [currentUserId, writeDemoAcquittals]);

  const submitAcquittal = useCallback((releaseId, expectedVersion, values) => isDemo
    ? Promise.resolve(demoSubmitAcquittal(releaseId, expectedVersion, values))
    : runMoney(() => submitFundAcquittal(accessToken, releaseId, expectedVersion, values), "acquittal"),
  [accessToken, demoSubmitAcquittal, isDemo, runMoney]);

  const demoDecideAcquittal = useCallback((acquittalId, expectedVersion, decision, reason) => {
    const current = demoAcquittalsRef.current.find((item) => item.id === acquittalId);
    if (!current || current.version !== expectedVersion) {
      return { ok: false, error: "This reconciliation changed elsewhere.", stale: true };
    }
    if (decision === "accepted" && current.varianceAmount !== 0 && !String(reason || "").trim()) {
      return { ok: false, error: "Accepting a reconciliation that does not balance requires a stated reason." };
    }
    const changed = {
      ...current, state: decision,
      acceptedBy: decision === "accepted" ? currentUserId : "",
      acceptedAt: decision === "accepted" ? now() : "",
      varianceOverrideReason: decision === "accepted" && current.varianceAmount !== 0 ? reason : "",
      version: current.version + 1,
    };
    writeDemoAcquittals(demoAcquittalsRef.current.map((item) => item.id === acquittalId ? changed : item));
    return { ok: true, acquittal: changed };
  }, [currentUserId, writeDemoAcquittals]);

  const decideAcquittal = useCallback((acquittalId, expectedVersion, decision, reason) => isDemo
    ? Promise.resolve(demoDecideAcquittal(acquittalId, expectedVersion, decision, reason))
    : runMoney(() => decideFundAcquittal(accessToken, acquittalId, expectedVersion, decision, reason), "acquittal"),
  [accessToken, demoDecideAcquittal, isDemo, runMoney]);

  const value = useMemo(() => ({
    requests, allocations, eventsByRequest, authorisedProjects, status, error, profiles,
    releases, acquittals, acquittalLines,
    refresh, loadEvents, loadAvailability, createDraft, authoriseDirect, updateRequest,
    submitRequest, withdrawRequest, decideRequest, cancelRequest,
    recordRelease, reverseRelease, confirmReceipt, submitAcquittal, decideAcquittal,
    allocationsForRequest: (requestId) => allocations
      .filter((allocation) => allocation.fundRequestId === requestId)
      .sort((first, second) => first.allocationOrder - second.allocationOrder),
    releasesForRequest: (requestId) => releases
      .filter((release) => release.fundRequestId === requestId)
      .sort((first, second) => String(second.releasedAt).localeCompare(String(first.releasedAt))),
    acquittalForRelease: (releaseId) => acquittals
      .find((acquittal) => acquittal.fundReleaseId === releaseId) || null,
    linesForAcquittal: (acquittalId) => acquittalLines
      .filter((line) => line.acquittalId === acquittalId)
      .sort((first, second) => first.lineNumber - second.lineNumber),
    // One derivation, read by every surface, never stored.
    positionForRequest: (requestId) => deriveFinancialPosition(
      requests.find((request) => request.id === requestId), releases, acquittals),
  }), [requests, allocations, eventsByRequest, authorisedProjects, status, error, profiles,
    releases, acquittals, acquittalLines,
    refresh, loadEvents, loadAvailability, createDraft, authoriseDirect, updateRequest,
    submitRequest, withdrawRequest, decideRequest, cancelRequest,
    recordRelease, reverseRelease, confirmReceipt, submitAcquittal, decideAcquittal]);

  return <FundRequestsContext.Provider value={value}>{children}</FundRequestsContext.Provider>;
}
