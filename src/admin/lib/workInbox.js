// BD-INBOX-01 (Stage 3) — narrow Work Inbox readers.
//
// The Work Inbox does NOT mount the existing domain providers. Those readers
// fetch a whole authorised history with no state predicate and no bound, which
// is the wrong data path for an attention list — and on a phone it is the
// difference between a short list and every record the account can see.
//
// Every read below is:
//
//   * state-filtered  — only the states that can produce an attention item are
//                       requested, so resolved and historical records never
//                       leave the database;
//   * field-whitelisted — explicit column lists, never select=*, and no JSON
//                       snapshot or payload column is ever selected, so raw
//                       event payloads cannot reach the interface;
//   * bounded         — an explicit limit on every list;
//   * executed under the caller's own RLS through the ordinary PostgREST
//     endpoints with the caller's access token. No SECURITY DEFINER inbox
//     function exists, and application-side filtering is never treated as a
//     security boundary.
//
// The access token travels in the Authorization header, exactly as every other
// reader in this codebase does. It is never placed in a URL, a query string or
// a route parameter.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "") || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Fixed ceiling for any inbox list. An inbox that would exceed this is
// truncated for display rather than allowed to grow unbounded on a phone.
export const INBOX_ROW_LIMIT = 200;

function headers(accessToken) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}

// Every failure is normalised to one safe error. The raw database, RLS or
// PostgREST message is deliberately discarded before it can reach the UI.
async function read(response, context) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(`Unable to load ${context}.`);
    error.inboxSource = context;
    throw error;
  }
  return data || [];
}

async function get(path, params, accessToken, context) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}?${params.toString()}`, {
    headers: headers(accessToken),
  });
  return read(response, context);
}

// ---------------------------------------------------------------------------
// Source reads
// ---------------------------------------------------------------------------
// original_values / proposed_values are never selected.
const APPROVAL_COLUMNS = [
  "id", "project_id", "state", "requester_id", "reason", "decision_notes", "requested_at",
].join(",");

export async function fetchInboxApprovals(accessToken) {
  const params = new URLSearchParams({
    select: APPROVAL_COLUMNS,
    state: "in.(submitted,awaiting_review,amendment_requested)",
    order: "requested_at.desc",
    limit: String(INBOX_ROW_LIMIT),
  });
  return get("approval_requests", params, accessToken, "approvals");
}

const CLAIM_COLUMNS = [
  "id", "project_id", "lifecycle", "requester_id", "purpose", "submitted_total", "updated_at",
].join(",");

export async function fetchInboxClaims(accessToken) {
  const params = new URLSearchParams({
    select: CLAIM_COLUMNS,
    lifecycle: "in.(awaiting_review,amendment_requested)",
    order: "updated_at.desc",
    limit: String(INBOX_ROW_LIMIT),
  });
  return get("internal_cost_claims", params, accessToken, "cost claims");
}

const FUND_REQUEST_COLUMNS = [
  "id", "project_id", "status", "requester_id", "purpose", "updated_at",
].join(",");

export async function fetchInboxFundRequests(accessToken) {
  const params = new URLSearchParams({
    select: FUND_REQUEST_COLUMNS,
    status: "in.(submitted,amendment_requested)",
    order: "updated_at.desc",
    limit: String(INBOX_ROW_LIMIT),
  });
  return get("fund_requests", params, accessToken, "fund requests");
}

// Only entries returned for correction can produce an item, so only those are
// requested. No snapshot column is selected.
const DAILY_SITE_COLUMNS = [
  "id", "project_id", "work_date", "state", "created_by", "returned_reason", "updated_at",
].join(",");

export async function fetchInboxDailySiteEntries(accessToken) {
  const params = new URLSearchParams({
    select: DAILY_SITE_COLUMNS,
    state: "eq.returned_for_correction",
    order: "work_date.desc",
    limit: String(INBOX_ROW_LIMIT),
  });
  return get("daily_site_entries", params, accessToken, "site entries");
}

// Today's morning obligation across every project within the caller's Daily
// Site authority. The function is already authority-filtered — owner
// company-wide, manager only their project-authority set — so no unauthorised
// project id or name can be returned.
export async function fetchInboxCompliance(accessToken) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/daily_site_morning_compliance`, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({ target_date: null }),
  });
  return read(response, "site obligations");
}

const PROJECT_COLUMNS = [
  "id", "project_name", "status", "stage", "archived", "next_action", "next_action_date",
  "blocker", "lead_person_id",
].join(",");

export async function fetchInboxProjects(accessToken) {
  const params = new URLSearchParams({
    select: PROJECT_COLUMNS,
    archived: "is.false",
    status: "in.(Pending,Ongoing,Paused)",
    order: "project_name.asc",
    limit: String(INBOX_ROW_LIMIT),
  });
  return get("projects", params, accessToken, "projects");
}

// ---------------------------------------------------------------------------
// Read state
// ---------------------------------------------------------------------------
// Personal seen-markers. RLS restricts every operation below to the caller's
// own rows, so no user can read, set or clear another user's read state.
export async function fetchInboxReadState(accessToken) {
  const params = new URLSearchParams({
    select: "item_key",
    limit: String(INBOX_ROW_LIMIT * 4),
  });
  const rows = await get("work_inbox_read_state", params, accessToken, "your read state");
  return (rows || []).map((row) => row.item_key);
}

// Marking items seen writes ONLY to the read-state table. It touches no
// operational record, and it never resolves the underlying issue — the item
// stays in the inbox until its source record stops requiring attention.
export async function markInboxItemsRead(accessToken, userId, itemKeys) {
  const keys = (itemKeys || []).filter(Boolean);
  if (!userId || keys.length === 0) return;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/work_inbox_read_state`, {
    method: "POST",
    headers: {
      ...headers(accessToken),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(keys.map((item_key) => ({ user_id: userId, item_key }))),
  });
  await read(response, "your read state");
}
