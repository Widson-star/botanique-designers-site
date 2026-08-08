// Operating-model authority — the Dashboard greeting.
//
// East Africa Time (Africa/Nairobi, UTC+03:00, no daylight saving) is the same
// fixed offset already used for the reporting calendar (see ./reportPeriod.js).
// The viewer's own device clock/timezone determines nothing about which
// greeting shows — a Principal checking the Dashboard from any timezone sees
// the same Nairobi-local greeting a colleague standing in the office would.
const EAT_OFFSET_MINUTES = 180;

// The EAT hour (0-23) for a given instant.
export function eatHour(instant = Date.now()) {
  const millis = instant instanceof Date ? instant.getTime() : Number(instant);
  if (!Number.isFinite(millis)) return null;
  return new Date(millis + EAT_OFFSET_MINUTES * 60000).getUTCHours();
}

// Morning 05:00–11:59, afternoon 12:00–16:59, evening 17:00–04:59.
export function timeOfDayGreeting(hour) {
  if (hour === null || hour === undefined || Number.isNaN(hour)) return "Hello";
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

// `firstName` is the authenticated profile's first given name, or "" when
// nothing usable could be resolved (see personName.js#greetingFirstName) — the
// greeting degrades to the plain time-of-day phrase rather than a placeholder
// name.
export function dashboardGreeting(firstName, instant = Date.now()) {
  const phrase = timeOfDayGreeting(eatHour(instant));
  return firstName ? `${phrase}, ${firstName}` : phrase;
}
