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
    const error = new Error(data?.message || data?.hint || "Fund release failed.");
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

const RELEASE_COLUMNS = [
  "id", "release_number", "fund_request_id", "status", "custody_disposition",
  "recipient_profile_id", "recipient_label", "currency", "released_amount", "released_at",
  "payment_channel", "payment_reference", "note", "recorded_by", "recorded_at",
  "receipt_confirmed_by", "receipt_confirmed_at", "reversed_by", "reversed_at",
  "reversal_reason", "version", "created_at", "updated_at",
].join(",");

const ACQUITTAL_COLUMNS = [
  "id", "fund_release_id", "state", "released_amount_snapshot", "actual_spend_total",
  "returned_amount", "variance_amount", "evidence_reference", "note", "submitted_by",
  "submitted_at", "accepted_by", "accepted_at", "variance_override_reason", "version",
  "created_at", "updated_at",
].join(",");

export async function fetchFundReleases(accessToken) {
  const params = new URLSearchParams({ select: RELEASE_COLUMNS, order: "released_at.desc" });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/fund_releases?${params}`, { headers: headers(accessToken) }));
}

export async function fetchFundAcquittals(accessToken) {
  const params = new URLSearchParams({ select: ACQUITTAL_COLUMNS, order: "updated_at.desc" });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/fund_acquittals?${params}`, { headers: headers(accessToken) }));
}

export async function fetchFundAcquittalLines(accessToken) {
  const params = new URLSearchParams({
    select: "id,acquittal_id,line_number,description,category,amount,spent_on",
    order: "acquittal_id.asc,line_number.asc",
  });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/fund_acquittal_lines?${params}`, { headers: headers(accessToken) }));
}

export async function fetchFundReleaseEvents(accessToken, releaseId) {
  const params = new URLSearchParams({
    select: "id,fund_release_id,event_type,actor_id,from_status,to_status,release_version,reason,created_at",
    fund_release_id: `eq.${releaseId}`,
    order: "created_at.asc,id.asc",
  });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/fund_release_events?${params}`, { headers: headers(accessToken) }));
}

export async function fetchFundAcquittalEvents(accessToken, acquittalId) {
  const params = new URLSearchParams({
    select: "id,acquittal_id,event_type,actor_id,from_state,to_state,acquittal_version,reason,created_at",
    acquittal_id: `eq.${acquittalId}`,
    order: "created_at.asc,id.asc",
  });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/fund_acquittal_events?${params}`, { headers: headers(accessToken) }));
}

// The derived position is always read from the database rather than recomputed on the client,
// so the application can never disagree with the source truth about what has been paid.
export function fetchFinancialPosition(accessToken, projectId = null, requestId = null) {
  return rpc(accessToken, "fund_request_financial_position", {
    target_project_id: projectId, target_request_id: requestId,
  });
}

export function recordFundRelease(accessToken, requestId, values) {
  return rpc(accessToken, "record_fund_release", {
    target_request_id: requestId,
    target_released_amount: Number(values.releasedAmount),
    target_released_at: values.releasedAt,
    target_custody_disposition: values.custodyDisposition,
    target_recipient_profile_id: values.recipientProfileId || null,
    target_recipient_label: values.recipientLabel || null,
    target_payment_channel: values.paymentChannel,
    target_payment_reference: values.paymentReference || null,
    target_note: values.note || null,
  });
}

export function reverseFundRelease(accessToken, releaseId, expectedVersion, reason) {
  return rpc(accessToken, "reverse_fund_release", {
    target_release_id: releaseId, target_expected_version: expectedVersion,
    target_reason: reason,
  });
}

export function confirmFundReleaseReceipt(accessToken, releaseId, expectedVersion) {
  return rpc(accessToken, "confirm_fund_release_receipt", {
    target_release_id: releaseId, target_expected_version: expectedVersion,
  });
}

export function submitFundAcquittal(accessToken, releaseId, expectedVersion, values) {
  return rpc(accessToken, "submit_fund_acquittal", {
    target_release_id: releaseId,
    target_expected_version: expectedVersion,
    target_lines: (values.lines || []).map((line) => ({
      description: line.description,
      category: line.category,
      amount: Number(line.amount),
      spent_on: line.spentOn,
    })),
    target_returned_amount: Number(values.returnedAmount || 0),
    target_evidence_reference: values.evidenceReference || null,
    target_note: values.note || null,
  });
}

export function decideFundAcquittal(accessToken, acquittalId, expectedVersion, decision, reason = "") {
  return rpc(accessToken, "decide_fund_acquittal", {
    target_acquittal_id: acquittalId, target_expected_version: expectedVersion,
    target_decision: decision, target_reason: reason || null,
  });
}
