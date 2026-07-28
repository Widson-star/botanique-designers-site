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
