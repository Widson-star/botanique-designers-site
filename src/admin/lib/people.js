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
    const error = new Error(data?.message || data?.hint || "People request failed.");
    error.code = data?.code || "";
    throw error;
  }
  return data;
}

// Every column here is operational. There is deliberately no identity document,
// bank detail, address, date of birth or any authentication field to select,
// because the People tables hold none.
const PERSON_COLUMNS = [
  "id", "full_name", "relationship_type", "phone", "note", "is_active",
  "profile_id", "version", "created_by", "updated_by", "created_at", "updated_at",
].join(",");

const ENGAGEMENT_COLUMNS = [
  "id", "person_id", "project_id", "engagement_role", "start_date", "end_date",
  "end_reason", "version", "created_by", "updated_by", "created_at", "updated_at",
].join(",");

export async function fetchPeople(accessToken) {
  const params = new URLSearchParams({ select: PERSON_COLUMNS, order: "full_name.asc" });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/people?${params}`, { headers: headers(accessToken) }));
}

// Engagements arrive already narrowed by row level security: a reader receives
// engagements only for projects they may reach, so an inaccessible project's
// resourcing is never fetched, let alone filtered out in the browser.
export async function fetchPeopleEngagements(accessToken) {
  const params = new URLSearchParams({ select: ENGAGEMENT_COLUMNS, order: "start_date.desc,id.asc" });
  return read(await fetch(`${SUPABASE_URL}/rest/v1/people_engagements?${params}`, { headers: headers(accessToken) }));
}

export async function fetchPeopleEngagementProjects(accessToken) {
  return read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/people_engagement_projects`, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({}),
  }));
}

// profile_id is never sent on create. The database refuses it outright, because
// creating a person must never be a way to grant portal access.
export async function createPerson(accessToken, values) {
  const rows = await read(await fetch(`${SUPABASE_URL}/rest/v1/people`, {
    method: "POST",
    headers: { ...headers(accessToken), Prefer: "return=representation" },
    body: JSON.stringify({
      full_name: values.fullName,
      relationship_type: values.relationshipType,
      phone: values.phone || null,
      note: values.note || null,
    }),
  }));
  return Array.isArray(rows) ? rows[0] : rows;
}

// Optimistic concurrency without an RPC: the version the reader loaded is part
// of the filter, so a person edited elsewhere in the meantime matches no row and
// comes back as a stale-write rather than silently overwriting.
export async function updatePerson(accessToken, personId, expectedVersion, patch) {
  const params = new URLSearchParams({ id: `eq.${personId}`, version: `eq.${expectedVersion}` });
  const rows = await read(await fetch(`${SUPABASE_URL}/rest/v1/people?${params}`, {
    method: "PATCH",
    headers: { ...headers(accessToken), Prefer: "return=representation" },
    body: JSON.stringify(patch),
  }));
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function createEngagement(accessToken, values) {
  const rows = await read(await fetch(`${SUPABASE_URL}/rest/v1/people_engagements`, {
    method: "POST",
    headers: { ...headers(accessToken), Prefer: "return=representation" },
    body: JSON.stringify({
      person_id: values.personId,
      project_id: values.projectId,
      engagement_role: values.engagementRole,
      start_date: values.startDate,
    }),
  }));
  return Array.isArray(rows) ? rows[0] : rows;
}

// Ending an engagement closes it. The row stays, so the project's history keeps
// its answer, and no operational record anywhere is rewritten.
export async function endEngagement(accessToken, engagementId, expectedVersion, endDate, endReason) {
  const params = new URLSearchParams({ id: `eq.${engagementId}`, version: `eq.${expectedVersion}` });
  const rows = await read(await fetch(`${SUPABASE_URL}/rest/v1/people_engagements?${params}`, {
    method: "PATCH",
    headers: { ...headers(accessToken), Prefer: "return=representation" },
    body: JSON.stringify({ end_date: endDate, end_reason: endReason || null }),
  }));
  return Array.isArray(rows) ? rows[0] : rows;
}

// Historical correction is deliberately an RPC rather than a broad table
// PATCH. The database verifies Principal authority, checks the loaded version,
// writes the immutable before/after event and updates the engagement in one
// transaction. Reopening changes this row; it never creates a replacement.
export async function correctEngagement(accessToken, values) {
  return read(await fetch(`${SUPABASE_URL}/rest/v1/rpc/correct_people_engagement`, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({
      target_engagement_id: values.engagementId,
      expected_version: values.expectedVersion,
      target_engagement_role: values.engagementRole,
      target_start_date: values.startDate,
      target_end_date: values.endDate || null,
      target_end_reason: values.endReason || null,
      reopen_engagement: Boolean(values.reopen),
      correction_reason: values.correctionReason,
    }),
  }));
}
