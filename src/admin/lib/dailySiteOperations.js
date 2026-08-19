// Daily Site Operations data access. Reads go through PostgREST (RLS-guarded);
// every mutation goes through a narrow SECURITY DEFINER RPC — the client never
// writes the tables directly. Mirrors the discipline of lib/approvals.js.
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
    const message = data?.message || data?.hint || "Site operations request failed.";
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

const ENTRY_COLUMNS = [
  "id", "site_id", "project_id", "maintenance_visit_id", "work_date", "disposition", "no_work_reason", "reason_detail",
  "expected_worker_count", "crew_reference", "rate_per_worker", "agreed_labour_total",
  "planned_labour_cost", "work_planned", "funds_available", "additional_amount_requested",
  "notes", "evidence_status", "state", "version", "supersedes_entry_id",
  "returned_reason", "void_reason", "supersession_reason", "created_by", "updated_by",
  "submitted_by", "reviewed_by", "created_at", "updated_at", "submitted_at",
  "reviewed_at", "is_late",
].join(",");

export async function fetchDailySiteEntries(accessToken) {
  const params = new URLSearchParams({
    select: ENTRY_COLUMNS,
    order: "work_date.desc,version.desc",
  });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/daily_site_entries?${params}`, {
    headers: headers(accessToken),
  }));
}

export async function fetchDailySiteEntryEvents(accessToken, entryId) {
  const params = new URLSearchParams({
    select: [
      "id", "daily_site_entry_id", "event_type", "actor_id", "from_state",
      "to_state", "version_number", "event_notes", "occurred_at",
    ].join(","),
    daily_site_entry_id: `eq.${entryId}`,
    order: "occurred_at.asc",
  });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/daily_site_entry_events?${params}`, {
    headers: headers(accessToken),
  }));
}

export async function fetchDailySiteWaivers(accessToken) {
  const params = new URLSearchParams({
    select: [
      "id", "project_id", "work_date", "reason", "state", "created_by",
      "created_at", "revoked_by", "revoked_at", "revoke_reason",
    ].join(","),
    order: "work_date.desc",
  });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/daily_site_compliance_waivers?${params}`, {
    headers: headers(accessToken),
  }));
}

export async function fetchMorningCompliance(accessToken, workDate = null) {
  return rpc(accessToken, "daily_site_morning_compliance", { target_date: workDate });
}

// Projects the caller may record a Daily Site Entry for — owner: all; manager:
// only project-authority-scoped. Backs the entry-form selector so an
// unauthorised project is never offered. Authority is enforced in the database;
// this is the matching UI boundary.
export async function fetchAuthorisedProjects(accessToken) {
  return rpc(accessToken, "daily_site_authorised_projects", {});
}

// Map a camelCase entry-plan object to the RPC's target_* parameters. Numeric
// fields are passed as-is; empty strings become null so the database sees a
// clean absence rather than a blank.
function planParams(values) {
  const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
  return {
    target_disposition: values.disposition,
    target_no_work_reason: values.noWorkReason || null,
    target_reason_detail: values.reasonDetail || null,
    target_worker_count: values.expectedWorkerCount === "" || values.expectedWorkerCount === null || values.expectedWorkerCount === undefined
      ? null
      : Number(values.expectedWorkerCount),
    target_crew_reference: values.crewReference || null,
    target_rate: num(values.ratePerWorker),
    target_agreed: num(values.agreedLabourTotal),
    target_work_planned: values.workPlanned || null,
    target_funds_available: num(values.fundsAvailable),
    target_additional_requested: num(values.additionalAmountRequested),
    target_notes: values.notes || null,
    target_evidence_status: values.evidenceStatus || "none",
  };
}

// Site-first creation. The Project stays optional context and is omitted
// entirely for maintenance-only work.
export function createDailySiteEntryDraft(accessToken, values) {
  return rpc(accessToken, "create_daily_site_entry_draft_for_site", {
    target_site_id: values.siteId,
    target_project_id: values.projectId || null,
    target_maintenance_visit_id: values.maintenanceVisitId || null,
    target_work_date: values.workDate,
    ...planParams(values),
  });
}

// Sites that may receive a new field record, each carrying any Ongoing Projects
// the caller may record against.
export function fetchAuthorisedSites(accessToken) {
  return rpc(accessToken, "daily_site_authorised_sites", {});
}

export function updateDailySiteEntryDraft(accessToken, entryId, values) {
  return rpc(accessToken, "update_daily_site_entry_draft", {
    target_entry_id: entryId,
    ...planParams(values),
  });
}

export function submitDailySiteEntry(accessToken, entryId) {
  return rpc(accessToken, "submit_daily_site_entry", { target_entry_id: entryId });
}

export function returnDailySiteEntry(accessToken, entryId, reason) {
  return rpc(accessToken, "return_daily_site_entry_for_correction", {
    target_entry_id: entryId,
    target_reason: reason,
  });
}

export function correctAndResubmitDailySiteEntry(accessToken, entryId, values) {
  return rpc(accessToken, "correct_and_resubmit_daily_site_entry", {
    target_entry_id: entryId,
    ...planParams(values),
  });
}

export function acceptDailySiteEntry(accessToken, entryId, notes = "") {
  return rpc(accessToken, "accept_daily_site_entry", {
    target_entry_id: entryId,
    target_notes: notes || null,
  });
}

export function voidDailySiteEntry(accessToken, entryId, reason) {
  return rpc(accessToken, "void_daily_site_entry", {
    target_entry_id: entryId,
    target_reason: reason,
  });
}

export function supersedeDailySiteEntry(accessToken, entryId, reason, values) {
  return rpc(accessToken, "supersede_daily_site_entry", {
    target_entry_id: entryId,
    target_reason: reason,
    ...planParams(values),
  });
}

export function createComplianceWaiver(accessToken, projectId, workDate, reason) {
  return rpc(accessToken, "create_daily_site_compliance_waiver", {
    target_project_id: projectId,
    target_work_date: workDate,
    target_reason: reason,
  });
}

export function revokeComplianceWaiver(accessToken, waiverId, reason = "") {
  return rpc(accessToken, "revoke_daily_site_compliance_waiver", {
    target_waiver_id: waiverId,
    target_reason: reason || null,
  });
}
