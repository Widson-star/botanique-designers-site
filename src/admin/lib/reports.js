// BD-REPORTS-01A — narrow Reports readers.
//
// Reports does NOT mount the existing domain providers. Those readers fetch a
// whole authorised history with no project predicate, no date predicate and no
// bound, which is unsuitable as a report data path. Every read below is:
//
//   * project-filtered      — one project per report, always an eq. predicate;
//   * period-filtered       — where the domain has a reporting date;
//   * field-whitelisted     — explicit column lists, never select=*;
//   * bounded               — an explicit limit on every list;
//   * executed under the caller's own RLS, through the ordinary PostgREST
//     endpoints with the caller's access token. No SECURITY DEFINER reporting
//     function exists, and application-side filtering is never treated as a
//     security boundary.
//
// No JSON snapshot or payload column is ever selected: not
// daily_site_snapshot, not claim_snapshot, not line_snapshot, not the fund
// request payload, and not the approval original_values / proposed_values or
// the project-history previous_values / new_values. Raw event payloads
// therefore cannot reach the interface.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "") || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Fixed ceiling for any report list. A period report that would exceed this is
// truncated for display rather than allowed to grow unbounded on a phone.
export const REPORT_ROW_LIMIT = 200;
export const RECENT_ACTIVITY_LIMIT = 50;

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
    error.reportSource = context;
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

// A record whose reporting date is either its submission date or its decision
// date inside the period. Two records of the same claim/request are never
// produced: one row is returned, and the metrics module decides which figure it
// contributes to.
function submittedOrDecidedIn(bounds) {
  return (
    `or=(and(submitted_at.gte.${bounds.from},submitted_at.lte.${bounds.to}),` +
    `and(decided_at.gte.${bounds.from},decided_at.lte.${bounds.to}))`
  );
}

// ---------------------------------------------------------------------------
// Project selector and Project Overview
// ---------------------------------------------------------------------------
// The Reports project selector reads the ordinary projects endpoint under the
// caller's projects RLS. It deliberately does NOT use
// internal_cost_claim_authorised_projects(), which is limited to ongoing
// projects and excludes hard-coded fixtures, and would therefore omit
// completed, paused and historical projects that hold reportable records.
// No project is hard-coded in or out here.
const SELECTOR_COLUMNS = ["id", "project_name", "status", "stage", "archived"].join(",");

export async function fetchReportProjects(accessToken) {
  const params = new URLSearchParams({
    select: SELECTOR_COLUMNS,
    order: "project_name.asc",
    limit: String(REPORT_ROW_LIMIT),
  });
  return get("projects", params, accessToken, "the project list");
}

// `last_updated` is deprecated and is never selected.
const OVERVIEW_COLUMNS = [
  "id", "project_name", "client_site_name", "location", "county", "project_type",
  "status", "stage", "lead_person_id", "start_date", "actual_start_date",
  "target_completion_date", "actual_completion_date", "next_action",
  "next_action_date", "blocker", "archived", "archived_at",
].join(",");

export async function fetchReportProject(accessToken, projectId) {
  const params = new URLSearchParams({
    select: OVERVIEW_COLUMNS,
    id: `eq.${projectId}`,
    limit: "1",
  });
  const rows = await get("projects", params, accessToken, "the project record");
  return rows[0] || null;
}

// ---------------------------------------------------------------------------
// Daily Site
// ---------------------------------------------------------------------------
// Daily Site sections filter by work_date. Submission timestamps control
// lateness only, never period membership.
const DAILY_SITE_COLUMNS = [
  "id", "project_id", "work_date", "disposition", "no_work_reason", "reason_detail",
  "expected_worker_count", "crew_reference", "rate_per_worker", "agreed_labour_total",
  "planned_labour_cost", "work_planned", "notes", "evidence_status", "state",
  "version", "supersedes_entry_id", "returned_reason", "submitted_at", "is_late",
].join(",");

export async function fetchReportDailySiteEntries(accessToken, projectId, range) {
  const params = new URLSearchParams({
    select: DAILY_SITE_COLUMNS,
    project_id: `eq.${projectId}`,
    work_date: `gte.${range.startDate}`,
    order: "work_date.desc,version.desc",
    limit: String(REPORT_ROW_LIMIT),
  });
  params.append("work_date", `lte.${range.endDate}`);
  return get("daily_site_entries", params, accessToken, "daily site activity");
}

// The one database range source added by BD-REPORTS-01A. Invoker rights, one
// call for the whole period — never one call per day.
export async function fetchReportRangeCompliance(accessToken, projectId, range) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/daily_site_range_compliance`, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({
      range_start: range.startDate,
      range_end: range.endDate,
      target_project_id: projectId,
    }),
  });
  return read(response, "daily site compliance");
}

// ---------------------------------------------------------------------------
// Internal Cost Claims
// ---------------------------------------------------------------------------
// updated_at is never the reporting date for a financial figure; submitted_at
// and decided_at are. No claim, line or snapshot JSON is selected.
const CLAIM_COLUMNS = [
  "id", "project_id", "service_date", "recipient_type", "recipient_label",
  "category", "currency", "lifecycle", "submitted_total", "approved_total",
  "requester_id", "decider_id", "submitted_at", "decided_at",
].join(",");

export async function fetchReportClaims(accessToken, projectId, bounds) {
  const params = new URLSearchParams({
    select: CLAIM_COLUMNS,
    project_id: `eq.${projectId}`,
    order: "submitted_at.desc",
    limit: String(REPORT_ROW_LIMIT),
  });
  const query = `${params.toString()}&${submittedOrDecidedIn(bounds)}`;
  return get("internal_cost_claims", new URLSearchParams(query), accessToken, "internal cost claims");
}

// A bounded existence probe: does this project hold ANY claim at all? It is the
// only way to tell "no records in the selected period" from "no records exist".
export async function fetchReportClaimExists(accessToken, projectId) {
  const params = new URLSearchParams({
    select: "id",
    project_id: `eq.${projectId}`,
    limit: "1",
  });
  const rows = await get("internal_cost_claims", params, accessToken, "internal cost claims");
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Fund Requests
// ---------------------------------------------------------------------------
// total_requested_amount is the single stored amount and stands at approved
// status. There is no approved_amount column and none is invented.
const FUND_REQUEST_COLUMNS = [
  "id", "request_number", "project_id", "authority_type", "status", "requester_id",
  "intended_custody_type", "currency", "total_requested_amount",
  "submitted_at", "decided_at",
].join(",");

export async function fetchReportFundRequests(accessToken, projectId, bounds) {
  const params = new URLSearchParams({
    select: FUND_REQUEST_COLUMNS,
    project_id: `eq.${projectId}`,
    order: "submitted_at.desc",
    limit: String(REPORT_ROW_LIMIT),
  });
  const query = `${params.toString()}&${submittedOrDecidedIn(bounds)}`;
  return get("fund_requests", new URLSearchParams(query), accessToken, "fund requests");
}

export async function fetchReportFundRequestExists(accessToken, projectId) {
  const params = new URLSearchParams({
    select: "id",
    project_id: `eq.${projectId}`,
    limit: "1",
  });
  const rows = await get("fund_requests", params, accessToken, "fund requests");
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Project approval requests
// ---------------------------------------------------------------------------
// original_values and proposed_values are JSON and are deliberately NOT
// selected. Approvals use requested_at for submitted items and decided_at for
// decision items; reviewed_at is carried because it is the authoritative event
// time for an amendment request.
const APPROVAL_COLUMNS = [
  "id", "approval_domain", "approval_type", "project_id", "requester_id",
  "state", "decision", "requested_at", "reviewed_at", "decided_at",
].join(",");

export async function fetchReportApprovals(accessToken, projectId, bounds) {
  const params = new URLSearchParams({
    select: APPROVAL_COLUMNS,
    project_id: `eq.${projectId}`,
    order: "requested_at.desc",
    limit: String(REPORT_ROW_LIMIT),
  });
  const query =
    `${params.toString()}&or=(and(requested_at.gte.${bounds.from},requested_at.lte.${bounds.to}),` +
    `and(reviewed_at.gte.${bounds.from},reviewed_at.lte.${bounds.to}),` +
    `and(decided_at.gte.${bounds.from},decided_at.lte.${bounds.to}))`;
  return get("approval_requests", new URLSearchParams(query), accessToken, "approvals and decisions");
}

// Project approvals still awaiting a decision, regardless of when they were
// raised — Needs Attention is about current state, not the period.
export async function fetchOpenReportApprovals(accessToken, projectId) {
  const params = new URLSearchParams({
    select: APPROVAL_COLUMNS,
    project_id: `eq.${projectId}`,
    state: "in.(submitted,awaiting_review,amendment_requested)",
    order: "requested_at.desc",
    limit: String(REPORT_ROW_LIMIT),
  });
  return get("approval_requests", params, accessToken, "approvals and decisions");
}

export async function fetchReportApprovalExists(accessToken, projectId) {
  const params = new URLSearchParams({
    select: "id",
    project_id: `eq.${projectId}`,
    limit: "1",
  });
  const rows = await get("approval_requests", params, accessToken, "approvals and decisions");
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Recent Activity event projections
// ---------------------------------------------------------------------------
// Each read selects only: a safe event type (mapped to a plain label before it
// is rendered), the actor, the normalised event timestamp, the originating
// record id and the project. Snapshots, payloads and previous/new JSON values
// are never selected, so they cannot be returned or rendered. Each read is
// project-scoped and bounded; there is no per-project loop.

export async function fetchProjectHistoryEvents(accessToken, projectId, bounds) {
  const params = new URLSearchParams({
    select: "id,project_id,action,actor_id,occurred_at",
    project_id: `eq.${projectId}`,
    occurred_at: `gte.${bounds.from}`,
    order: "occurred_at.desc",
    limit: String(RECENT_ACTIVITY_LIMIT),
  });
  params.append("occurred_at", `lte.${bounds.to}`);
  return get("project_activities", params, accessToken, "recent activity");
}

export async function fetchDailySiteEvents(accessToken, projectId, bounds) {
  const params = new URLSearchParams({
    select: "id,daily_site_entry_id,event_type,actor_id,occurred_at,daily_site_entries!inner(project_id)",
    "daily_site_entries.project_id": `eq.${projectId}`,
    occurred_at: `gte.${bounds.from}`,
    order: "occurred_at.desc",
    limit: String(RECENT_ACTIVITY_LIMIT),
  });
  params.append("occurred_at", `lte.${bounds.to}`);
  return get("daily_site_entry_events", params, accessToken, "recent activity");
}

export async function fetchClaimEvents(accessToken, projectId, bounds) {
  const params = new URLSearchParams({
    select: "id,claim_id,event_type,actor_id,occurred_at,internal_cost_claims!inner(project_id)",
    "internal_cost_claims.project_id": `eq.${projectId}`,
    occurred_at: `gte.${bounds.from}`,
    order: "occurred_at.desc",
    limit: String(RECENT_ACTIVITY_LIMIT),
  });
  params.append("occurred_at", `lte.${bounds.to}`);
  return get("internal_cost_claim_events", params, accessToken, "recent activity");
}

// fund_request_events stamps its event time as created_at, not occurred_at.
// The projection normalises this so ordering is consistent across domains.
export async function fetchFundRequestEvents(accessToken, projectId, bounds) {
  const params = new URLSearchParams({
    select: "id,fund_request_id,event_type,actor_id,created_at,fund_requests!inner(project_id)",
    "fund_requests.project_id": `eq.${projectId}`,
    created_at: `gte.${bounds.from}`,
    order: "created_at.desc",
    limit: String(RECENT_ACTIVITY_LIMIT),
  });
  params.append("created_at", `lte.${bounds.to}`);
  return get("fund_request_events", params, accessToken, "recent activity");
}

export async function fetchApprovalEvents(accessToken, projectId, bounds) {
  const params = new URLSearchParams({
    select: "id,approval_request_id,event_type,actor_id,occurred_at,approval_requests!inner(project_id)",
    "approval_requests.project_id": `eq.${projectId}`,
    occurred_at: `gte.${bounds.from}`,
    order: "occurred_at.desc",
    limit: String(RECENT_ACTIVITY_LIMIT),
  });
  params.append("occurred_at", `lte.${bounds.to}`);
  return get("approval_events", params, accessToken, "recent activity");
}
