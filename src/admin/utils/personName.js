export const FOUNDER_FORMAL_NAME = "Widson Omutelema Ambaisi";
export const FOUNDER_COMPACT_NAME = "Widson O. Ambaisi";
export const FOUNDER_AUTH_EMAIL = "widson@botaniquedesigners.com";

export function isFounderProfile(profile) {
  return (
    profile?.role === "owner" &&
    profile?.email?.trim().toLowerCase() === FOUNDER_AUTH_EMAIL
  );
}

export function compactPersonName(name, profile) {
  return name === FOUNDER_FORMAL_NAME || isFounderProfile(profile)
    ? FOUNDER_COMPACT_NAME
    : name;
}

export function profilePresentationName(profile, fallback = "Authenticated admin") {
  const name = profile?.full_name || profile?.email || fallback;
  return compactPersonName(name, profile);
}

export function formalProfileName(profile, fallback = "Team member") {
  if (isFounderProfile(profile)) return FOUNDER_FORMAL_NAME;
  return profile?.full_name || profile?.email || fallback;
}

// The shared identity resolution AdminLayout and AdminDashboard both need: the
// authenticated Supabase profile when one exists, otherwise the demo-preview
// label, otherwise a generic fallback. Never widens what either already showed.
export function resolveDisplayName(profile, profileLabel, fallback = "Authenticated admin") {
  return profile ? profilePresentationName(profile, fallback) : profileLabel || fallback;
}

// The first given name for the Dashboard greeting, or "" when nothing usable
// can be resolved — callers fall back to a name-less greeting rather than a
// placeholder like "Authenticated".
export function greetingFirstName(profile, profileLabel) {
  const source = profile ? profilePresentationName(profile, "") : profileLabel || "";
  const first = String(source).trim().split(/\s+/)[0];
  return first || "";
}
