import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminData } from "./adminData";
import { AdminApprovalsContext } from "./adminApprovals";
import {
  amendAndResubmitApproval as apiAmend,
  decideProjectApproval as apiDecide,
  decideStaffCompensationApproval as apiDecideStaffCompensation,
  fetchApprovalEvents,
  fetchApprovalRequests,
  fetchStaffCompensationApprovalEvents,
  fetchStaffCompensationApprovalRequests,
  requestApprovalAmendment as apiRequestAmendment,
  submitProjectApproval as apiSubmit,
  withdrawApprovalRequest as apiWithdraw,
} from "../lib/approvals";
import {
  mapApprovalEvent,
  mapApprovalRequest,
  mapStaffCompensationApprovalEvent,
  mapStaffCompensationApprovalRequest,
} from "../utils/approvalFormatters";
import {
  isValidApprovalMutationResponse,
  normalizeApprovalFailure,
} from "../utils/approvalErrors";

const demoRequests = [];
const demoEvents = {};

function newestFirst(a, b) {
  const aTime = Date.parse(a.requestedAt || "") || 0;
  const bTime = Date.parse(b.requestedAt || "") || 0;
  return bTime - aTime;
}

export default function AdminApprovalsProvider({ children, session, isDemo, role }) {
  const { refetchProjects, updateProject } = useAdminData();
  const accessToken = session?.access_token || "";
  const [requests, setRequests] = useState(() => (isDemo ? demoRequests : []));
  const [eventsByRequest, setEventsByRequest] = useState(demoEvents);
  const [status, setStatus] = useState(isDemo ? "ready" : "loading");
  const [error, setError] = useState("");

  const refreshRequests = useCallback(async () => {
    if (isDemo) {
      setStatus("ready");
      return { ok: true };
    }
    try {
      const [projectRows, compensationRows] = await Promise.all([
        fetchApprovalRequests(accessToken),
        fetchStaffCompensationApprovalRequests(accessToken),
      ]);
      setRequests([
        ...(projectRows || []).map(mapApprovalRequest),
        ...(compensationRows || []).map(mapStaffCompensationApprovalRequest),
      ].sort(newestFirst));
      setStatus("ready");
      setError("");
      return { ok: true };
    } catch (nextError) {
      setStatus("error");
      setError(nextError.message || "Unable to load approvals.");
      return { ok: false, error: nextError };
    }
  }, [accessToken, isDemo]);

  useEffect(() => {
    if (isDemo || !accessToken || !role) return;
    let cancelled = false;
    async function run() {
      const result = await refreshRequests();
      if (cancelled && result.ok) return;
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [accessToken, isDemo, role, refreshRequests]);

  const loadEvents = useCallback(async (requestId, force = false) => {
    if (!force && eventsByRequest[requestId]) return eventsByRequest[requestId];
    if (isDemo) return [];
    const request = requests.find((item) => item.id === requestId);
    if (!request) return [];
    const rows = request.source === "staff_compensation"
      ? await fetchStaffCompensationApprovalEvents(accessToken, request.sourceId)
      : await fetchApprovalEvents(accessToken, request.sourceId || request.id);
    const mapped = request.source === "staff_compensation"
      ? rows.map(mapStaffCompensationApprovalEvent)
      : rows.map(mapApprovalEvent);
    setEventsByRequest((current) => ({ ...current, [requestId]: mapped }));
    return mapped;
  }, [accessToken, eventsByRequest, isDemo, requests]);

  const runMutation = useCallback(async (operation, { refetchProject = false } = {}) => {
    try {
      const result = await operation();
      if (!isValidApprovalMutationResponse(result)) {
        return normalizeApprovalFailure(
          null,
          "The approval service returned an invalid response. No success was recorded."
        );
      }
      await refreshRequests();
      if (refetchProject) await refetchProjects();
      return { ok: true };
    } catch (nextError) {
      return normalizeApprovalFailure(nextError);
    }
  }, [refetchProjects, refreshRequests]);

  const submit = useCallback((values) => {
    if (isDemo) {
      const now = new Date().toISOString();
      const request = {
        id: `demo-approval-${Date.now()}`,
        source: "project",
        sourceId: `demo-approval-${Date.now()}`,
        approvalType: values.approvalType,
        projectId: values.projectId,
        requesterId: values.requesterId,
        state: "awaiting_review",
        requestRound: 1,
        originalValues: values.originalValues || {},
        proposedValues: values.proposedValues,
        reason: values.reason,
        requesterNotes: values.requesterNotes || "",
        requestedAt: now,
      };
      setRequests((current) => [request, ...current]);
      return Promise.resolve({ ok: true, request });
    }
    return runMutation(() => apiSubmit(accessToken, values));
  }, [accessToken, isDemo, runMutation]);

  const withdraw = useCallback((requestId, notes) => {
    const request = requests.find((item) => item.id === requestId);
    if (request?.source === "staff_compensation") {
      return Promise.resolve({ ok: false, error: "Amend or withdraw Staff Compensation from Finance." });
    }
    return isDemo
      ? Promise.resolve((setRequests((current) => current.map((item) => (
          item.id === requestId
            ? { ...item, state: "withdrawn", withdrawnAt: new Date().toISOString() }
            : item
        ))), { ok: true }))
      : runMutation(() => apiWithdraw(accessToken, request?.sourceId || requestId, notes));
  }, [accessToken, isDemo, requests, runMutation]);

  const requestAmendment = useCallback((requestId, notes) => {
    const request = requests.find((item) => item.id === requestId);
    if (request?.source === "staff_compensation") {
      return runMutation(() => apiDecideStaffCompensation(
        accessToken,
        request.sourceId,
        request.version,
        "amendment_requested",
        notes
      ));
    }
    return isDemo
      ? Promise.resolve((setRequests((current) => current.map((item) => (
          item.id === requestId
            ? {
                ...item,
                state: "amendment_requested",
                decision: "amendment_requested",
                decisionNotes: notes,
                reviewedAt: new Date().toISOString(),
              }
            : item
        ))), { ok: true }))
      : runMutation(() => apiRequestAmendment(accessToken, request?.sourceId || requestId, notes));
  }, [accessToken, isDemo, requests, runMutation]);

  const amendAndResubmit = useCallback((requestId, values) => {
    const request = requests.find((item) => item.id === requestId);
    if (request?.source === "staff_compensation") {
      return Promise.resolve({ ok: false, error: "Amend and resubmit Staff Compensation from Finance." });
    }
    return isDemo
      ? Promise.resolve((setRequests((current) => current.map((item) => (
          item.id === requestId
            ? {
                ...item,
                ...values,
                state: "awaiting_review",
                decision: "",
                decisionNotes: "",
                reviewedAt: "",
                requestRound: item.requestRound + 1,
                requestedAt: new Date().toISOString(),
              }
            : item
        ))), { ok: true }))
      : runMutation(() => apiAmend(accessToken, request?.sourceId || requestId, values));
  }, [accessToken, isDemo, requests, runMutation]);

  const decide = useCallback(async (requestId, decision, notes) => {
    const request = requests.find((item) => item.id === requestId);
    if (!request) return { ok: false, error: "Approval item is no longer available." };
    if (request.source === "staff_compensation") {
      return runMutation(() => apiDecideStaffCompensation(
        accessToken,
        request.sourceId,
        request.version,
        decision,
        notes
      ));
    }
    if (isDemo) {
      if (decision === "approved") {
        const projectResult = await updateProject(request.projectId, request.proposedValues);
        if (!projectResult.ok) return projectResult;
      }
      setRequests((current) => current.map((item) => (
        item.id === requestId
          ? {
              ...item,
              state: decision,
              decision,
              decisionNotes: notes,
              reviewedAt: new Date().toISOString(),
              decidedAt: new Date().toISOString(),
            }
          : item
      )));
      return { ok: true };
    }
    return runMutation(
      () => apiDecide(accessToken, request.sourceId || requestId, decision, notes),
      { refetchProject: decision === "approved" }
    );
  }, [accessToken, isDemo, requests, runMutation, updateProject]);

  const value = useMemo(() => ({
    requests,
    status,
    error,
    refreshRequests,
    loadEvents,
    submit,
    withdraw,
    requestAmendment,
    amendAndResubmit,
    decide,
  }), [
    requests, status, error, refreshRequests, loadEvents, submit, withdraw,
    requestAmendment, amendAndResubmit, decide,
  ]);

  return (
    <AdminApprovalsContext.Provider value={value}>
      {children}
    </AdminApprovalsContext.Provider>
  );
}
