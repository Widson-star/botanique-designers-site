import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminData } from "./adminData";
import { AdminApprovalsContext } from "./adminApprovals";
import {
  amendAndResubmitApproval as apiAmend,
  decideProjectApproval as apiDecide,
  fetchApprovalEvents,
  fetchApprovalRequests,
  requestApprovalAmendment as apiRequestAmendment,
  submitProjectApproval as apiSubmit,
  withdrawApprovalRequest as apiWithdraw,
} from "../lib/approvals";
import { mapApprovalEvent, mapApprovalRequest } from "../utils/approvalFormatters";
import {
  isValidApprovalMutationResponse,
  normalizeApprovalFailure,
} from "../utils/approvalErrors";

const demoRequests = [];
const demoEvents = {};

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
      const rows = await fetchApprovalRequests(accessToken);
      setRequests(rows.map(mapApprovalRequest));
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
    const rows = await fetchApprovalEvents(accessToken, requestId);
    const mapped = rows.map(mapApprovalEvent);
    setEventsByRequest((current) => ({ ...current, [requestId]: mapped }));
    return mapped;
  }, [accessToken, eventsByRequest, isDemo]);

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
      return { ok: true, request: result ? mapApprovalRequest(result) : null };
    } catch (nextError) {
      return normalizeApprovalFailure(nextError);
    }
  }, [refetchProjects, refreshRequests]);

  const submit = useCallback((values) => {
    if (isDemo) {
      const now = new Date().toISOString();
      const request = {
        id: `demo-approval-${Date.now()}`,
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

  const withdraw = useCallback((requestId, notes) => (
    isDemo
      ? Promise.resolve((setRequests((current) => current.map((request) => (
          request.id === requestId
            ? { ...request, state: "withdrawn", withdrawnAt: new Date().toISOString() }
            : request
        ))), { ok: true }))
      :
    runMutation(() => apiWithdraw(accessToken, requestId, notes))
  ), [accessToken, isDemo, runMutation]);

  const requestAmendment = useCallback((requestId, notes) => (
    isDemo
      ? Promise.resolve((setRequests((current) => current.map((request) => (
          request.id === requestId
            ? {
                ...request,
                state: "amendment_requested",
                decision: "amendment_requested",
                decisionNotes: notes,
                reviewedAt: new Date().toISOString(),
              }
            : request
        ))), { ok: true }))
      :
    runMutation(() => apiRequestAmendment(accessToken, requestId, notes))
  ), [accessToken, isDemo, runMutation]);

  const amendAndResubmit = useCallback((requestId, values) => (
    isDemo
      ? Promise.resolve((setRequests((current) => current.map((request) => (
          request.id === requestId
            ? {
                ...request,
                ...values,
                state: "awaiting_review",
                decision: "",
                decisionNotes: "",
                reviewedAt: "",
                requestRound: request.requestRound + 1,
                requestedAt: new Date().toISOString(),
              }
            : request
        ))), { ok: true }))
      :
    runMutation(() => apiAmend(accessToken, requestId, values))
  ), [accessToken, isDemo, runMutation]);

  const decide = useCallback(async (requestId, decision, notes) => {
    if (isDemo) {
      const request = requests.find((item) => item.id === requestId);
      if (decision === "approved" && request) {
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
    return (
    runMutation(
      () => apiDecide(accessToken, requestId, decision, notes),
      { refetchProject: decision === "approved" }
    )
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
