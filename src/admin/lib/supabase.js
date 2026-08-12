const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "") || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const SESSION_STORAGE_KEY = "botanique_admin_supabase_session";

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export function isUsableStoredSession(session, now = Date.now()) {
  if (
    !session ||
    typeof session !== "object" ||
    typeof session.access_token !== "string" ||
    !session.access_token ||
    typeof session.user?.id !== "string" ||
    !session.user.id
  ) {
    return false;
  }

  if (session.expires_at != null) {
    const expiresAt = Number(session.expires_at);
    if (!Number.isFinite(expiresAt) || expiresAt * 1000 <= now) {
      return false;
    }
  }

  return true;
}

function getHeaders(accessToken) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}

async function readJsonResponse(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.error_description || data?.message || data?.hint || "Supabase request failed.";
    throw new Error(message);
  }

  return data;
}

export function getStoredSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw);
    if (isUsableStoredSession(session)) return session;

    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function storeSession(session) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export async function signInWithPassword({ email, password }) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ email, password }),
  });

  return readJsonResponse(response);
}

export async function signOut(accessToken) {
  if (!accessToken) {
    clearStoredSession();
    return;
  }

  await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: "POST",
    headers: getHeaders(accessToken),
  });
  clearStoredSession();
}

export async function fetchCurrentProfile(accessToken, userId) {
  const params = new URLSearchParams({
    id: `eq.${userId}`,
    select: "id,email,full_name,role,is_active",
    limit: "1",
  });

  const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?${params.toString()}`, {
    headers: getHeaders(accessToken),
  });
  const profiles = await readJsonResponse(response);
  return profiles?.[0] || null;
}

// All current operational project fields are fetched. `last_updated` is
// intentionally excluded (deprecated); `updated_at` is the authoritative
// last-modified value. No finance columns are read here.
const PROJECT_SELECT = [
  "id",
  "project_name",
  "client_site_name",
  "location",
  "county",
  "project_type",
  "status",
  "stage",
  "lead_person_id",
  "start_date",
  "actual_start_date",
  "target_completion_date",
  "actual_completion_date",
  "next_action",
  "next_action_date",
  "blocker",
  "portfolio_eligible",
  "portfolio_permission_status",
  "notes",
  "archived",
  "archived_at",
  "archived_by",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
].join(",");

export async function fetchProjects(accessToken) {
  const params = new URLSearchParams({
    select: PROJECT_SELECT,
    order: "updated_at.desc",
  });

  const response = await fetch(`${SUPABASE_URL}/rest/v1/projects?${params.toString()}`, {
    headers: getHeaders(accessToken),
  });

  return readJsonResponse(response);
}

// Profiles visible to the caller through existing RLS: owner sees all; manager
// sees himself + active staff; used to populate accountable-lead choices and to
// resolve lead/actor names in the UI. Never bypasses RLS.
export async function fetchVisibleProfiles(accessToken) {
  const params = new URLSearchParams({
    select: "id,email,full_name,role,is_active",
    order: "full_name.asc",
  });

  const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?${params.toString()}`, {
    headers: getHeaders(accessToken),
  });

  return readJsonResponse(response);
}

// Read-only access to the immutable project-change ledger for one project.
export async function fetchProjectActivities(accessToken, projectId) {
  const params = new URLSearchParams({
    select: [
      "id",
      "project_id",
      "action",
      "actor_id",
      "occurred_at",
      "changed_fields",
      "previous_values",
      "new_values",
      "reason",
    ].join(","),
    project_id: `eq.${projectId}`,
    order: "occurred_at.desc",
  });

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/project_activities?${params.toString()}`,
    { headers: getHeaders(accessToken) }
  );

  return readJsonResponse(response);
}

// Create a project. Audit/finance columns are never in `payload` (see
// projectForm helpers). Returns the created row so the UI can refetch/refresh.
export async function createProject(accessToken, payload) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/projects`, {
    method: "POST",
    headers: {
      ...getHeaders(accessToken),
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  const rows = await readJsonResponse(response);
  return Array.isArray(rows) ? rows[0] : rows;
}

// Patch only genuinely changed operational fields for one project. The edit
// form may attach `__expected_updated_at`, which is a client-side concurrency
// token rather than a database column. When present, PostgREST must match both
// the project id and the version the editor originally loaded. A newer save then
// produces zero rows instead of silently being overwritten by a stale form.
export async function updateProject(accessToken, projectId, patch) {
  const {
    __expected_updated_at: expectedUpdatedAt,
    ...databasePatch
  } = patch || {};

  const params = new URLSearchParams({ id: `eq.${projectId}` });
  if (expectedUpdatedAt) {
    params.set("updated_at", `eq.${expectedUpdatedAt}`);
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/projects?${params.toString()}`,
    {
      method: "PATCH",
      headers: {
        ...getHeaders(accessToken),
        Prefer: "return=representation",
      },
      body: JSON.stringify(databasePatch),
    }
  );

  const rows = await readJsonResponse(response);
  if (!Array.isArray(rows)) return rows;

  // A PATCH that matched nothing is not a save. With an expected timestamp it
  // means the project changed after this edit form was loaded; without one it
  // retains the generic RLS/deleted-row failure introduced by PR #105.
  if (rows.length === 0) {
    if (expectedUpdatedAt) {
      throw new Error(
        "This project changed after you opened it. Refresh the project before saving again."
      );
    }
    throw new Error("The project was not updated. Refresh and try again.");
  }
  if (rows.length > 1) {
    throw new Error("The update matched more than one project and was not applied cleanly. Refresh and check the project.");
  }
  return rows[0];
}

export async function fetchFinancialReferences(accessToken, projectIds) {
  if (!projectIds.length) return [];

  const params = new URLSearchParams({
    select: [
      "id",
      "project_id",
      "simple_invoice_client_name",
      "estimate_number",
      "invoice_number",
      "receipt_reference",
      "payment_status",
      "financial_notes",
      "updated_at",
    ].join(","),
    project_id: `in.(${projectIds.join(",")})`,
  });

  const response = await fetch(`${SUPABASE_URL}/rest/v1/project_financial_references?${params.toString()}`, {
    headers: getHeaders(accessToken),
  });

  return readJsonResponse(response);
}
