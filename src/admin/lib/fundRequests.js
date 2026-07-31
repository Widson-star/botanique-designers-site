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
    const error = new Error(data?.message || data?.hint || "Fund request failed.");
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

const REQUEST_COLUMNS = [
  "id", "request_number", "project_id", "authority_type", "status", "requester_id",
  "direct_authority_actor_id", "intended_custody_type", "custodian_profile_id",
  "purpose", "currency", "total_requested_amount", "submission_round", "version",
  "created_at", "updated_at", "submitted_at", "decided_at", "withdrawn_at", "cancelled_at",
].join(",");

const ALLOCATION_COLUMNS = [
  "id", "fund_request_id", "internal_cost_claim_id", "allocation_order", "requested_amount",
  "claim_reference_snapshot", "claim_service_date_snapshot", "claim_recipient_type_snapshot",
  "claim_recipient_label_snapshot", "claim_category_snapshot", "claim_purpose_snapshot",
  "claim_approved_total_snapshot",
].join(",");

export async function fetchFundRequests(accessToken) {
  const params = new URLSearchParams({ select: REQUEST_COLUMNS, order: "updated_at.desc" });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/fund_requests?${params}`, { headers: headers(accessToken) }));
}

export async function fetchFundRequestAllocations(accessToken) {
  const params = new URLSearchParams({
    select: ALLOCATION_COLUMNS,
    order: "fund_request_id.asc,allocation_order.asc",
  });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/fund_request_allocations?${params}`, { headers: headers(accessToken) }));
}

export async function fetchFundRequestEvents(accessToken, requestId) {
  const params = new URLSearchParams({
    select: "id,fund_request_id,event_type,actor_id,from_status,to_status,request_version,submission_round,reason,created_at",
    fund_request_id: `eq.${requestId}`,
    order: "created_at.asc,id.asc",
  });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/fund_request_events?${params}`, { headers: headers(accessToken) }));
}

// The eligible-project surface is shared with Site Costs so both finance surfaces resolve
// project eligibility, archive state and excluded fixtures from one authority.
export function fetchFundRequestProjects(accessToken) {
  return rpc(accessToken, "internal_cost_claim_authorised_projects", {});
}

export function fetchClaimAvailability(accessToken, projectId, requestId = null) {
  return rpc(accessToken, "fund_request_claim_availability", {
    target_project_id: projectId,
    target_request_id: requestId,
  });
}

function allocationPayload(allocations = []) {
  return allocations.map(({ claimId, requestedAmount }) => ({
    claim_id: claimId,
    requested_amount: Number(requestedAmount),
  }));
}

function custodyPayload(values) {
  return {
    target_intended_custody_type: values.intendedCustodyType,
    target_custodian_profile_id: values.custodianProfileId || null,
    target_purpose: values.purpose,
  };
}

export function createFundRequestDraft(accessToken, values) {
  return rpc(accessToken, "create_fund_request_draft", {
    target_project_id: values.projectId,
    ...custodyPayload(values),
    target_allocations: allocationPayload(values.allocations),
  });
}

export function updateFundRequest(accessToken, requestId, expectedVersion, values) {
  return rpc(accessToken, "update_fund_request", {
    target_request_id: requestId,
    target_expected_version: expectedVersion,
    ...custodyPayload(values),
    target_allocations: allocationPayload(values.allocations),
  });
}

export function submitFundRequest(accessToken, requestId, expectedVersion) {
  return rpc(accessToken, "submit_fund_request", {
    target_request_id: requestId, target_expected_version: expectedVersion,
  });
}

export function withdrawFundRequest(accessToken, requestId, expectedVersion, reason = "") {
  return rpc(accessToken, "withdraw_fund_request", {
    target_request_id: requestId, target_expected_version: expectedVersion,
    target_reason: reason || null,
  });
}

export function decideFundRequest(accessToken, requestId, expectedVersion, decision, reason = "") {
  return rpc(accessToken, "decide_fund_request", {
    target_request_id: requestId, target_expected_version: expectedVersion,
    target_decision: decision, target_reason: reason || null,
  });
}

export function directAuthoriseFundRequest(accessToken, values, reason = "") {
  return rpc(accessToken, "direct_authorise_fund_request", {
    target_project_id: values.projectId,
    ...custodyPayload(values),
    target_allocations: allocationPayload(values.allocations),
    target_reason: reason || null,
  });
}

export function cancelFundRequest(accessToken, requestId, expectedVersion, reason) {
  return rpc(accessToken, "cancel_fund_request", {
    target_request_id: requestId, target_expected_version: expectedVersion, target_reason: reason,
  });
}
