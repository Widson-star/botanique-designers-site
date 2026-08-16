// Operations > Maintenance V1 — database access.
//
// last_visit / next_visit are NEVER requested as stored columns because they
// are not stored columns: maintenance_register() and maintenance_project_
// summary() derive both, every time, from public.maintenance_visits.
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
    const error = new Error(data?.message || data?.hint || "Maintenance request failed.");
    error.code = data?.code || "";
    throw error;
  }
  return data;
}

const VISIT_COLUMNS = [
  "id", "maintenance_relationship_id", "scheduled_date", "status", "purpose",
  "completed_at", "completion_note", "cancellation_reason",
  "version", "created_by", "updated_by", "created_at", "updated_at",
].join(",");

const ASSIGNMENT_COLUMNS = [
  "id", "maintenance_relationship_id", "person_id", "role", "start_date", "end_date",
  "version", "created_by", "updated_by", "created_at", "updated_at",
  "people(full_name)",
].join(",");

// The compact register — one row per relationship the caller may reach, with
// the site/project and the derived last/next visit and assigned team already
// attached. Client/site identity remains in the underlying Project authority,
// but Maintenance presentation intentionally receives it blank for privacy.
export async function fetchMaintenanceRegister(accessToken) {
  const rows = await read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/maintenance_register`, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({}),
  }));
  return (rows || []).map((row) => ({ ...row, client_site_name: "" }));
}

// The projects a caller may start a NEW Maintenance relationship on — already
// restricted server-side to Ongoing/Paused/Completed, unarchived projects.
// The UI label intentionally uses only project_name; client/site identity is
// retained here only so existing duplicate-project presentation safeguards can
// still prefer the richer canonical Project row without displaying that name.
export async function fetchMaintenanceAuthorisedProjects(accessToken) {
  return read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/maintenance_authorised_projects`, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({}),
  }));
}

export async function fetchMaintenanceVisits(accessToken) {
  const params = new URLSearchParams({ select: VISIT_COLUMNS, order: "scheduled_date.desc,id.asc" });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/maintenance_visits?${params}`, { headers: headers(accessToken) }));
}

export async function fetchMaintenanceAssignments(accessToken) {
  const params = new URLSearchParams({ select: ASSIGNMENT_COLUMNS, order: "start_date.desc,id.asc" });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/maintenance_assignments?${params}`, { headers: headers(accessToken) }));
}

// There is deliberately no fetchMaintenanceProjectSummary() here. The
// Project-detail indicator derives from the already-loaded register, which
// carries the same relationship id, status and derived next visit — so a
// dedicated per-project read would be a duplicate round trip for data the
// provider already holds. The maintenance_project_summary() database function
// remains in place as the authoritative single-project read for any future
// consumer that genuinely needs it without loading the whole register.

export async function createMaintenanceRelationship(accessToken, values) {
  const rows = await read(await fetch(`${SUPABASE_URL}/rest/v1/maintenance_relationships`, {
    method: "POST",
    headers: { ...headers(accessToken), Prefer: "return=representation" },
    body: JSON.stringify({
      project_id: values.projectId,
      scope: values.scope,
      start_date: values.startDate,
      frequency: values.frequency,
    }),
  }));
  return Array.isArray(rows) ? rows[0] : rows;
}

// Ordinary correction of the relationship's own descriptive fields. Optimistic
// concurrency without an RPC: the version the reader loaded is part of the
// filter, so a relationship edited elsewhere in the meantime matches no row and
// comes back as a stale write rather than silently overwriting. project_id is
// never sent — the database freezes it on update regardless — and status is
// never sent, because lifecycle moves only through pause/resume/end.
export async function updateMaintenanceRelationship(accessToken, relationshipId, expectedVersion, values) {
  const params = new URLSearchParams({ id: `eq.${relationshipId}`, version: `eq.${expectedVersion}` });
  const rows = await read(await fetch(`${SUPABASE_URL}/rest/v1/maintenance_relationships?${params}`, {
    method: "PATCH",
    headers: { ...headers(accessToken), Prefer: "return=representation" },
    body: JSON.stringify({
      scope: values.scope,
      start_date: values.startDate,
      frequency: values.frequency,
    }),
  }));
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function pauseMaintenanceRelationship(accessToken, relationshipId, expectedVersion, reason) {
  return read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/pause_maintenance_relationship`, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({
      target_relationship_id: relationshipId, expected_version: expectedVersion, reason: reason || null,
    }),
  }));
}

export async function resumeMaintenanceRelationship(accessToken, relationshipId, expectedVersion) {
  return read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/resume_maintenance_relationship`, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({ target_relationship_id: relationshipId, expected_version: expectedVersion }),
  }));
}

export async function endMaintenanceRelationship(accessToken, relationshipId, expectedVersion, reason) {
  return read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/end_maintenance_relationship`, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({
      target_relationship_id: relationshipId, expected_version: expectedVersion, reason: reason || null,
    }),
  }));
}

export async function scheduleMaintenanceVisit(accessToken, values) {
  const rows = await read(await fetch(`${SUPABASE_URL}/rest/v1/maintenance_visits`, {
    method: "POST",
    headers: { ...headers(accessToken), Prefer: "return=representation" },
    body: JSON.stringify({
      maintenance_relationship_id: values.relationshipId,
      scheduled_date: values.scheduledDate,
      purpose: values.purpose,
    }),
  }));
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function rescheduleMaintenanceVisit(accessToken, visitId, expectedVersion, newScheduledDate) {
  return read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/reschedule_maintenance_visit`, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({
      target_visit_id: visitId, expected_version: expectedVersion, new_scheduled_date: newScheduledDate,
    }),
  }));
}

export async function completeMaintenanceVisit(accessToken, visitId, expectedVersion, completionNote) {
  return read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/complete_maintenance_visit`, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({
      target_visit_id: visitId, expected_version: expectedVersion, completion_note: completionNote,
    }),
  }));
}

export async function cancelMaintenanceVisit(accessToken, visitId, expectedVersion, cancellationReason) {
  return read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/cancel_maintenance_visit`, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({
      target_visit_id: visitId, expected_version: expectedVersion, cancellation_reason: cancellationReason,
    }),
  }));
}

export async function assignMaintenancePerson(accessToken, values) {
  const rows = await read(await fetch(`${SUPABASE_URL}/rest/v1/maintenance_assignments`, {
    method: "POST",
    headers: { ...headers(accessToken), Prefer: "return=representation" },
    body: JSON.stringify({
      maintenance_relationship_id: values.relationshipId,
      person_id: values.personId,
      role: values.role,
      start_date: values.startDate,
    }),
  }));
  return Array.isArray(rows) ? rows[0] : rows;
}

// Ending an assignment closes it. The row stays, so who covered a
// relationship and when stays readable, exactly like people_engagements.
// Ending an assignment is a one-way, database-guarded closure — once
// end_date is set the row is historical and terminal, so this goes through
// the controlled RPC rather than a plain PATCH. The end date is derived by
// the database from its own trusted clock; the client never supplies one.
export async function endMaintenanceAssignment(accessToken, assignmentId, expectedVersion) {
  return read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/end_maintenance_assignment`, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({ target_assignment_id: assignmentId, expected_version: expectedVersion }),
  }));
}

// Correcting a recorded assignment is deliberately an RPC rather than a broad
// table PATCH: the database verifies Principal authority, checks the loaded
// version, refuses an ended assignment, requires a stated reason, and writes
// the immutable before/after event — all in one transaction. Only role and
// start_date may move; person, relationship and closure are never sent.
export async function correctMaintenanceAssignment(accessToken, values) {
  return read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/correct_maintenance_assignment`, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({
      target_assignment_id: values.assignmentId,
      expected_version: values.expectedVersion,
      target_role: values.role,
      target_start_date: values.startDate,
      correction_reason: values.correctionReason,
    }),
  }));
}
