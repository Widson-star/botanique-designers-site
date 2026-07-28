const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "") || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

function headers(accessToken) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}
async function read(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = data?.message || data?.hint || "Approval request failed.";
    const error = new Error(message);
    error.code = data?.code || "";
    throw error;
  }
  return data;
}

async function rpc(accessToken, name, body) {
  return read(
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: headers(accessToken),
      body: JSON.stringify(body),
    })
  );
}

export async function fetchApprovalRequests(accessToken) {
  const params = new URLSearchParams({
    select: [
      "id", "approval_domain", "approval_type", "project_id", "requester_id",
      "state", "request_round", "original_values", "proposed_values", "reason",
      "requester_notes", "decision", "decision_notes", "requested_at",
      "reviewed_at", "decided_at", "withdrawn_at", "supersedes_request_id",
    ].join(","),
    order: "requested_at.desc",
  });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/approval_requests?${params}`, {
    headers: headers(accessToken),
  }));
}

export async function fetchApprovalEvents(accessToken, approvalRequestId) {
  const params = new URLSearchParams({
    select: [
      "id", "approval_request_id", "event_type", "actor_id", "from_state",
      "to_state", "round_number", "event_notes", "occurred_at",
    ].join(","),
    approval_request_id: `eq.${approvalRequestId}`,
    order: "occurred_at.asc",
  });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/approval_events?${params}`, {
    headers: headers(accessToken),
  }));
}

export function submitProjectApproval(accessToken, values) {
  return rpc(accessToken, "submit_project_approval", {
    target_project_id: values.projectId,
    target_approval_type: values.approvalType,
    target_proposed_values: values.proposedValues,
    target_reason: values.reason,
    target_requester_notes: values.requesterNotes || null,
    target_supersedes_request_id: values.supersedesRequestId || null,
  });
}

export function withdrawApprovalRequest(accessToken, requestId, notes = "") {
  return rpc(accessToken, "withdraw_approval_request", {
    target_approval_request_id: requestId,
    target_notes: notes || null,
  });
}

export function requestApprovalAmendment(accessToken, requestId, notes) {
  return rpc(accessToken, "request_approval_amendment", {
    target_approval_request_id: requestId,
    target_decision_notes: notes,
  });
}

export function amendAndResubmitApproval(accessToken, requestId, values) {
  return rpc(accessToken, "amend_and_resubmit_approval", {
    target_approval_request_id: requestId,
    target_proposed_values: values.proposedValues,
    target_reason: values.reason,
    target_requester_notes: values.requesterNotes || null,
  });
}

export function decideProjectApproval(accessToken, requestId, decision, notes = "") {
  return rpc(accessToken, "decide_project_approval", {
    target_approval_request_id: requestId,
    target_decision: decision,
    target_decision_notes: notes || null,
  });
}
