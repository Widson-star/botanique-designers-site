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
  "completed_at", "completion_note", "cancellation_reason", "daily_site_entry_id",
  "completion_outcome", "follow_up_required", "follow_up_note",
  "version", "created_by", "updated_by", "created_at", "updated_at",
].join(",");

const ASSIGNMENT_COLUMNS = [
  "id", "maintenance_relationship_id", "person_id", "role", "start_date", "end_date",
  "version", "created_by", "updated_by", "created_at", "updated_at",
  "people(full_name)",
].join(",");

export async function fetchMaintenanceRegister(accessToken) {
  const rows = await read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/maintenance_register`, {
    method: "POST", headers: headers(accessToken), body: JSON.stringify({}),
  }));
  return (rows || []).map((row) => ({ ...row, client_site_name: "" }));
}

export async function fetchMaintenanceAuthorisedProjects(accessToken) {
  return read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/maintenance_authorised_projects`, {
    method: "POST", headers: headers(accessToken), body: JSON.stringify({}),
  }));
}

// Sites eligible to START Maintenance, each carrying any related Botanique
// Projects as optional origin context. A Site with no Project is a valid choice.
export async function fetchMaintenanceAuthorisedSites(accessToken) {
  return read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/maintenance_authorised_sites`, {
    method: "POST", headers: headers(accessToken), body: JSON.stringify({}),
  }));
}

// Controlled Site creation for Maintenance. This does NOT give a manager generic
// Site-update authority; the database RPC owns that boundary.
export async function createMaintenanceSite(accessToken, values) {
  return read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_maintenance_site`, {
    method: "POST", headers: headers(accessToken),
    body: JSON.stringify({
      target_site_name: values.siteName,
      target_location: values.location || null,
      target_county: values.county || null,
    }),
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

export async function createMaintenanceRelationship(accessToken, values) {
  const rows = await read(await fetch(`${SUPABASE_URL}/rest/v1/maintenance_relationships`, {
    method: "POST", headers: { ...headers(accessToken), Prefer: "return=representation" },
    // Site is the durable owner; the originating Project is optional context.
    body: JSON.stringify({
      site_id: values.siteId,
      project_id: values.projectId || null,
      scope: values.scope, start_date: values.startDate, frequency: values.frequency,
    }),
  }));
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function updateMaintenanceRelationship(accessToken, relationshipId, expectedVersion, values) {
  const params = new URLSearchParams({ id: `eq.${relationshipId}`, version: `eq.${expectedVersion}` });
  const rows = await read(await fetch(`${SUPABASE_URL}/rest/v1/maintenance_relationships?${params}`, {
    method: "PATCH", headers: { ...headers(accessToken), Prefer: "return=representation" },
    body: JSON.stringify({ scope: values.scope, start_date: values.startDate, frequency: values.frequency }),
  }));
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function pauseMaintenanceRelationship(accessToken, relationshipId, expectedVersion, reason) {
  return read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/pause_maintenance_relationship`, {
    method: "POST", headers: headers(accessToken),
    body: JSON.stringify({ target_relationship_id: relationshipId, expected_version: expectedVersion, reason: reason || null }),
  }));
}

export async function resumeMaintenanceRelationship(accessToken, relationshipId, expectedVersion) {
  return read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/resume_maintenance_relationship`, {
    method: "POST", headers: headers(accessToken),
    body: JSON.stringify({ target_relationship_id: relationshipId, expected_version: expectedVersion }),
  }));
}

export async function endMaintenanceRelationship(accessToken, relationshipId, expectedVersion, reason) {
  return read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/end_maintenance_relationship`, {
    method: "POST", headers: headers(accessToken),
    body: JSON.stringify({ target_relationship_id: relationshipId, expected_version: expectedVersion, reason: reason || null }),
  }));
}

export async function scheduleMaintenanceVisit(accessToken, values) {
  const rows = await read(await fetch(`${SUPABASE_URL}/rest/v1/maintenance_visits`, {
    method: "POST", headers: { ...headers(accessToken), Prefer: "return=representation" },
    body: JSON.stringify({ maintenance_relationship_id: values.relationshipId, scheduled_date: values.scheduledDate, purpose: values.purpose }),
  }));
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function rescheduleMaintenanceVisit(accessToken, visitId, expectedVersion, newScheduledDate) {
  return read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/reschedule_maintenance_visit`, {
    method: "POST", headers: headers(accessToken),
    body: JSON.stringify({ target_visit_id: visitId, expected_version: expectedVersion, new_scheduled_date: newScheduledDate }),
  }));
}

// Compatibility path retained for older callers. New Maintenance UI uses the
// full cycle action below so outcome, DSR evidence, follow-up and next visit
// are recorded together.
export async function completeMaintenanceVisit(accessToken, visitId, expectedVersion, completionNote) {
  return read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/complete_maintenance_visit`, {
    method: "POST", headers: headers(accessToken),
    body: JSON.stringify({ target_visit_id: visitId, expected_version: expectedVersion, completion_note: completionNote }),
  }));
}

export async function completeMaintenanceVisitCycle(accessToken, values) {
  return read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/complete_maintenance_visit_cycle`, {
    method: "POST", headers: headers(accessToken),
    body: JSON.stringify({
      target_visit_id: values.visitId,
      expected_version: values.expectedVersion,
      target_daily_site_entry_id: values.dailySiteEntryId || null,
      target_outcome: values.outcome,
      completion_note: values.completionNote,
      target_follow_up_required: Boolean(values.followUpRequired),
      target_follow_up_note: values.followUpRequired ? values.followUpNote || null : null,
      next_scheduled_date: values.nextScheduledDate || null,
      next_purpose: values.nextScheduledDate ? values.nextPurpose || null : null,
    }),
  }));
}

export async function cancelMaintenanceVisit(accessToken, visitId, expectedVersion, cancellationReason) {
  return read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/cancel_maintenance_visit`, {
    method: "POST", headers: headers(accessToken),
    body: JSON.stringify({ target_visit_id: visitId, expected_version: expectedVersion, cancellation_reason: cancellationReason }),
  }));
}

export async function assignMaintenancePerson(accessToken, values) {
  const rows = await read(await fetch(`${SUPABASE_URL}/rest/v1/maintenance_assignments`, {
    method: "POST", headers: { ...headers(accessToken), Prefer: "return=representation" },
    body: JSON.stringify({ maintenance_relationship_id: values.relationshipId, person_id: values.personId, role: values.role, start_date: values.startDate }),
  }));
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function endMaintenanceAssignment(accessToken, assignmentId, expectedVersion) {
  return read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/end_maintenance_assignment`, {
    method: "POST", headers: headers(accessToken),
    body: JSON.stringify({ target_assignment_id: assignmentId, expected_version: expectedVersion }),
  }));
}

export async function correctMaintenanceAssignment(accessToken, values) {
  return read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/correct_maintenance_assignment`, {
    method: "POST", headers: headers(accessToken),
    body: JSON.stringify({
      target_assignment_id: values.assignmentId, expected_version: values.expectedVersion,
      target_role: values.role, target_start_date: values.startDate, correction_reason: values.correctionReason,
    }),
  }));
}
