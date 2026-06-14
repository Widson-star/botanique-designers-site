const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "") || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const SESSION_STORAGE_KEY = "botanique_admin_supabase_session";

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

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
    return raw ? JSON.parse(raw) : null;
  } catch {
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

export async function fetchProjects(accessToken) {
  const params = new URLSearchParams({
    select: [
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
      "last_updated",
      "next_action",
      "next_action_date",
      "portfolio_eligible",
      "portfolio_permission_status",
      "notes",
      "archived",
      "archived_at",
      "created_at",
      "updated_at",
    ].join(","),
    order: "updated_at.desc",
  });

  const response = await fetch(`${SUPABASE_URL}/rest/v1/projects?${params.toString()}`, {
    headers: getHeaders(accessToken),
  });

  return readJsonResponse(response);
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
