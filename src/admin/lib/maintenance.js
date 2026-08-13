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
// attached.
export async function fetchMaintenanceRegister(accessToken) {
  return read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/maintenance_register`, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({}),
  }));
}

// The projects a caller may start a NEW Maintenance relationship on — already
// restricted server-side to Ongoing/Paused/Completed, unarchived projects.
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

// The compact, read-only Project-detail indicator. Returns [] (not an error)
// when the project has no live Maintenance relationship — a truthful absence.
export async function fetchMaintenanceProjectSummary(accessToken, projectId) {
  const rows = await read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/maintenance_project_summary`, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({ target_project_id: projectId }),
  }));
  return Array.isArray(rows) ? rows[0] || null : rows;
}

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
