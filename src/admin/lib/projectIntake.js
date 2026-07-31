// PostgREST + RPC client for the restricted project-intake proposal workflow.
// Mirrors ../lib/approvals.js. All mutation flows through SECURITY DEFINER RPCs;
// reads are RLS-scoped (owner sees all intakes, a manager sees only their own).
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
    const message = data?.message || data?.hint || "Project intake request failed.";
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

export async function fetchProjectIntakes(accessToken) {
  const params = new URLSearchParams({
    select: [
      "id", "requester_id", "state", "request_round", "proposed_values", "reason",
      "requester_notes", "decision", "decision_notes", "created_project_id",
      "requested_at", "reviewed_at", "decided_at", "withdrawn_at", "supersedes_request_id",
    ].join(","),
    order: "requested_at.desc",
  });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/project_intake_requests?${params}`, {
    headers: headers(accessToken),
  }));
}

export async function fetchProjectIntake(accessToken, intakeId) {
  const params = new URLSearchParams({
    select: [
      "id", "requester_id", "state", "request_round", "proposed_values", "reason",
      "requester_notes", "decision", "decision_notes", "created_project_id",
      "requested_at", "reviewed_at", "decided_at", "withdrawn_at", "supersedes_request_id",
    ].join(","),
    id: `eq.${intakeId}`,
    limit: "1",
  });
  const rows = await read(await fetch(
    `${SUPABASE_URL}/rest/v1/project_intake_requests?${params}`,
    { headers: headers(accessToken) }
  ));
  return rows[0] || null;
}

export async function fetchProjectIntakeEvents(accessToken, intakeRequestId) {
  const params = new URLSearchParams({
    select: [
      "id", "intake_request_id", "event_type", "actor_id", "from_state",
      "to_state", "round_number", "event_notes", "occurred_at",
    ].join(","),
    intake_request_id: `eq.${intakeRequestId}`,
    order: "occurred_at.asc",
  });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/project_intake_events?${params}`, {
    headers: headers(accessToken),
  }));
}

export function submitProjectIntake(accessToken, values) {
  return rpc(accessToken, "submit_project_intake", {
    target_proposed_values: values.proposedValues,
    target_reason: values.reason,
    target_requester_notes: values.requesterNotes || null,
    target_supersedes_request_id: values.supersedesRequestId || null,
  });
}

export function withdrawProjectIntake(accessToken, intakeId, notes = "") {
  return rpc(accessToken, "withdraw_project_intake", {
    target_intake_request_id: intakeId,
    target_notes: notes || null,
  });
}

export function requestProjectIntakeAmendment(accessToken, intakeId, notes) {
  return rpc(accessToken, "request_project_intake_amendment", {
    target_intake_request_id: intakeId,
    target_decision_notes: notes,
  });
}

export function amendAndResubmitProjectIntake(accessToken, intakeId, values) {
  return rpc(accessToken, "amend_and_resubmit_project_intake", {
    target_intake_request_id: intakeId,
    target_proposed_values: values.proposedValues,
    target_reason: values.reason,
    target_requester_notes: values.requesterNotes || null,
  });
}

export function decideProjectIntake(accessToken, intakeId, decision, notes = "") {
  return rpc(accessToken, "decide_project_intake", {
    target_intake_request_id: intakeId,
    target_decision: decision,
    target_decision_notes: notes || null,
  });
}
