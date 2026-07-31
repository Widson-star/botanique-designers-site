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
    const error = new Error(data?.message || data?.hint || "Site cost request failed.");
    error.code = data?.code || "";
    throw error;
  }
  return data;
}

async function rpc(accessToken, name, body) {
  return read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify(body),
  }));
}

const CLAIM_COLUMNS = [
  "id", "project_id", "daily_site_entry_id", "daily_site_source_version",
  "daily_site_snapshot", "service_date", "recipient_type", "recipient_label",
  "category", "currency", "purpose", "lifecycle", "request_round",
  "submitted_total", "approved_total", "requester_id", "decider_id",
  "direct_authority_actor_id", "version", "created_at", "updated_at",
  "submitted_at", "decided_at", "withdrawn_at", "cancelled_at",
].join(",");

export async function fetchInternalCostClaims(accessToken) {
  const params = new URLSearchParams({ select: CLAIM_COLUMNS, order: "updated_at.desc" });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/internal_cost_claims?${params}`, { headers: headers(accessToken) }));
}

export async function fetchInternalCostClaimLines(accessToken) {
  const params = new URLSearchParams({
    select: "id,claim_id,line_number,description,rate_type,quantity,unit,unit_rate,line_total,created_at",
    order: "claim_id.asc,line_number.asc",
  });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/internal_cost_claim_lines?${params}`, { headers: headers(accessToken) }));
}

export async function fetchInternalCostClaimEvents(accessToken, claimId) {
  const params = new URLSearchParams({
    select: "id,claim_id,actor_id,event_type,previous_lifecycle,next_lifecycle,request_round,reason,occurred_at",
    claim_id: `eq.${claimId}`,
    order: "occurred_at.asc,id.asc",
  });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/internal_cost_claim_events?${params}`, { headers: headers(accessToken) }));
}

export function fetchInternalCostClaimProjects(accessToken) {
  return rpc(accessToken, "internal_cost_claim_authorised_projects", {});
}

function linePayload(lines) {
  return lines.map(({ description, rateType, quantity, unit, unitRate }) => ({
    description, rate_type: rateType, quantity: Number(quantity), unit, unit_rate: Number(unitRate),
  }));
}

function claimPayload(values) {
  return {
    target_service_date: values.serviceDate,
    target_recipient_type: values.recipientType,
    target_recipient_label: values.recipientLabel,
    target_category: values.category,
    target_purpose: values.purpose,
    target_lines: linePayload(values.lines),
  };
}

export function createInternalCostClaimDraft(accessToken, values) {
  return rpc(accessToken, "create_internal_cost_claim_draft", {
    target_project_id: values.projectId,
    target_daily_site_entry_id: values.dailySiteEntryId || null,
    ...claimPayload(values),
  });
}

export function updateInternalCostClaim(accessToken, claimId, expectedVersion, values) {
  return rpc(accessToken, "update_internal_cost_claim", {
    target_claim_id: claimId, target_expected_version: expectedVersion, ...claimPayload(values),
  });
}

export function submitInternalCostClaim(accessToken, claimId, expectedVersion) {
  return rpc(accessToken, "submit_internal_cost_claim", { target_claim_id: claimId, target_expected_version: expectedVersion });
}

export function withdrawInternalCostClaim(accessToken, claimId, expectedVersion, reason = "") {
  return rpc(accessToken, "withdraw_internal_cost_claim", {
    target_claim_id: claimId, target_expected_version: expectedVersion, target_reason: reason || null,
  });
}

export function decideInternalCostClaim(accessToken, claimId, expectedVersion, decision, reason = "") {
  return rpc(accessToken, "decide_internal_cost_claim", {
    target_claim_id: claimId, target_expected_version: expectedVersion,
    target_decision: decision, target_reason: reason || null,
  });
}

export function principalAuthoriseInternalCostClaim(accessToken, values, reason = "") {
  return rpc(accessToken, "principal_authorise_internal_cost_claim", {
    target_project_id: values.projectId,
    target_daily_site_entry_id: values.dailySiteEntryId || null,
    ...claimPayload(values),
    target_reason: reason || null,
  });
}

export function cancelInternalCostClaim(accessToken, claimId, expectedVersion, reason) {
  return rpc(accessToken, "cancel_internal_cost_claim", {
    target_claim_id: claimId, target_expected_version: expectedVersion, target_reason: reason,
  });
}
