// Phase 1B-A2 Activity-History formatting — PURE functions.
//
// Reads the immutable public.project_activities ledger (never writes it). Turns
// a stored event into human-readable rows: snake_case field names -> labels,
// booleans -> Yes/No, null -> "Not set", dates/timestamps formatted, and
// profile references resolved to names where profile RLS permits. UUIDs are
// NEVER surfaced, and raw JSON is never the primary interface.

// Human labels for the operational fields the ledger diffs.
export const FIELD_LABELS = {
  project_name: "Project name",
  client_site_name: "Client / site label",
  location: "Location",
  county: "County",
  project_type: "Project type",
  status: "Status",
  stage: "Stage",
  lead_person_id: "Accountable lead",
  start_date: "Planned start",
  actual_start_date: "Actual start",
  target_completion_date: "Target completion",
  actual_completion_date: "Actual completion",
  next_action: "Next action",
  next_action_date: "Due date",
  blocker: "Blocker",
  notes: "Notes",
  portfolio_eligible: "Portfolio eligible",
  portfolio_permission_status: "Portfolio permission status",
  archived: "Archived",
};

export const ACTION_LABELS = {
  created: "Project created",
  updated: "Project updated",
  archived: "Project archived",
  restored: "Project restored",
};

export function fieldLabel(field) {
  return FIELD_LABELS[field] || field.replace(/_/g, " ");
}

export function actionLabel(action) {
  return ACTION_LABELS[action] || action;
}

// A lead/actor label that never exposes a UUID. Resolves via profile RLS map
// when readable; otherwise a safe role-neutral fallback.
export function resolveProfileLabel(userId, profilesById = {}) {
  if (!userId) return "Not set";
  const profile = profilesById[userId];
  if (profile) return profile.full_name || profile.email || "Team member";
  // Profile not readable through RLS — never show the raw id.
  return "Protected profile";
}

// Actor label with a role-aware fallback (used for the "actor" of an event).
export function resolveActorLabel(actorId, profilesById = {}) {
  if (!actorId) return "System";
  const profile = profilesById[actorId];
  if (profile) return profile.full_name || profile.email || "Team member";
  // An owner activity whose profile row is not readable to a manager shows a
  // safe label rather than the id (see product requirements §19).
  return "Owner or authorised manager";
}

export function formatDateTime(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DATE_FIELDS = new Set([
  "start_date",
  "actual_start_date",
  "target_completion_date",
  "actual_completion_date",
  "next_action_date",
]);

const BOOLEAN_FIELDS = new Set(["portfolio_eligible", "archived"]);

// Format a single before/after value for a given field. Booleans -> Yes/No,
// null -> "Not set", lead_person_id -> resolved name (never a UUID), dates left
// as their ISO calendar value.
export function formatFieldValue(field, value, profilesById = {}) {
  if (field === "lead_person_id") {
    return resolveProfileLabel(value, profilesById);
  }
  if (value === null || value === undefined || value === "") {
    return "Not set";
  }
  if (BOOLEAN_FIELDS.has(field)) {
    return value === true || value === "true" ? "Yes" : "No";
  }
  if (DATE_FIELDS.has(field)) {
    return String(value);
  }
  return String(value);
}

// Turn one ledger activity row into a readable summary object. Groups every
// changed field into a before/after row; never returns raw JSON or UUIDs.
export function formatActivity(activity, profilesById = {}) {
  const previous = activity.previous_values || {};
  const next = activity.new_values || {};
  const changed = Array.isArray(activity.changed_fields)
    ? activity.changed_fields
    : [];

  // `last_updated` is deprecated and never returns to the UI, including when
  // an older ledger event contains it.
  const changes = changed.filter((field) => field !== "last_updated").map((field) => ({
    field,
    label: fieldLabel(field),
    before: formatFieldValue(field, previous[field] ?? null, profilesById),
    after: formatFieldValue(
      field,
      Object.prototype.hasOwnProperty.call(next, field) ? next[field] : null,
      profilesById
    ),
  }));

  return {
    id: activity.id,
    action: activity.action,
    actionLabel: actionLabel(activity.action),
    actor: resolveActorLabel(activity.actor_id, profilesById),
    occurredAt: formatDateTime(activity.occurred_at),
    reason: activity.reason || null,
    changes,
  };
}
