// BD-REPORTS-01A — reporting-period arithmetic.
//
// Africa/Nairobi (EAT) is the authoritative reporting calendar. EAT is UTC+03:00
// with no daylight saving, which lets every boundary here be derived exactly
// from a UTC instant without a timezone database.
//
// The browser's local timezone determines NOTHING: not which day "today" is,
// not period membership, not overdue or approaching state, not Daily Site
// compliance, and not report ordering. A viewer in any timezone sees the same
// Botanique reporting week.

export const REPORT_TIMEZONE = "Africa/Nairobi";
export const REPORT_TIMEZONE_LABEL = "East Africa Time";
const EAT_OFFSET_MINUTES = 180;
const EAT_OFFSET_SUFFIX = "+03:00";
const DAY_MS = 86400000;

// The EAT calendar date (YYYY-MM-DD) for a given instant.
export function eatDate(instant = Date.now()) {
  const millis = instant instanceof Date ? instant.getTime() : Number(instant);
  if (!Number.isFinite(millis)) return "";
  return new Date(millis + EAT_OFFSET_MINUTES * 60000).toISOString().slice(0, 10);
}

export function eatToday(now = Date.now()) {
  return eatDate(now);
}

// Parse a YYYY-MM-DD calendar date into the UTC instant of EAT midnight.
function calendarMillis(isoDate) {
  if (!isValidCalendarDate(isoDate)) return NaN;
  return Date.parse(`${isoDate}T00:00:00${EAT_OFFSET_SUFFIX}`);
}

export function isValidCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00${EAT_OFFSET_SUFFIX}`);
  if (Number.isNaN(parsed)) return false;
  // Reject impossible calendar dates that Date.parse would roll over.
  return new Date(parsed + EAT_OFFSET_MINUTES * 60000).toISOString().slice(0, 10) === value;
}

export function addCalendarDays(isoDate, days) {
  const base = calendarMillis(isoDate);
  if (Number.isNaN(base)) return "";
  return eatDate(base + days * DAY_MS);
}

// Day of week on the EAT calendar: 0 = Sunday … 6 = Saturday.
export function eatDayOfWeek(isoDate) {
  const base = calendarMillis(isoDate);
  if (Number.isNaN(base)) return NaN;
  return new Date(base + EAT_OFFSET_MINUTES * 60000).getUTCDay();
}

export function daysBetween(startDate, endDate) {
  const start = calendarMillis(startDate);
  const end = calendarMillis(endDate);
  if (Number.isNaN(start) || Number.isNaN(end)) return NaN;
  return Math.round((end - start) / DAY_MS);
}

// Inclusive EAT week, Monday through Sunday.
export function thisWeekRange(today) {
  const dow = eatDayOfWeek(today);
  if (Number.isNaN(dow)) return null;
  const backToMonday = dow === 0 ? 6 : dow - 1;
  const startDate = addCalendarDays(today, -backToMonday);
  return { preset: "this_week", startDate, endDate: addCalendarDays(startDate, 6) };
}

// Inclusive EAT calendar month.
export function thisMonthRange(today) {
  if (!isValidCalendarDate(today)) return null;
  const startDate = `${today.slice(0, 7)}-01`;
  const [year, month] = startDate.split("-").map(Number);
  const nextMonthStart = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return { preset: "this_month", startDate, endDate: addCalendarDays(nextMonthStart, -1) };
}

export const MAX_CUSTOM_RANGE_DAYS = 366;

// Validate a custom range. Returns { range } or { error } — never a silently
// clamped range, because a silently changed period would misstate the report.
export function customRange(startDate, endDate) {
  if (!isValidCalendarDate(startDate) || !isValidCalendarDate(endDate)) {
    return { error: "Choose a start date and an end date." };
  }
  const span = daysBetween(startDate, endDate);
  if (span < 0) return { error: "The end date cannot be before the start date." };
  if (span > MAX_CUSTOM_RANGE_DAYS) {
    return { error: `A reporting period may not be longer than ${MAX_CUSTOM_RANGE_DAYS + 1} days.` };
  }
  return { range: { preset: "custom", startDate, endDate } };
}

export function defaultRange(today = eatToday()) {
  return thisMonthRange(today);
}

// The inclusive instant window for timestamptz predicates. The end boundary is
// the last representable millisecond of the final EAT day, so a record stamped
// at 23:59 EAT on the closing day is inside the period and a record stamped one
// millisecond into the next EAT day is outside it.
export function periodInstants(range) {
  if (!range || !isValidCalendarDate(range.startDate) || !isValidCalendarDate(range.endDate)) {
    return null;
  }
  return {
    from: `${range.startDate}T00:00:00.000${EAT_OFFSET_SUFFIX}`,
    to: `${range.endDate}T23:59:59.999${EAT_OFFSET_SUFFIX}`,
  };
}

// Is a stored timestamp inside the period, judged on the EAT calendar?
export function isWithinPeriod(timestamp, range) {
  if (!timestamp || !range) return false;
  const instant = Date.parse(timestamp);
  if (Number.isNaN(instant)) return false;
  const bounds = periodInstants(range);
  if (!bounds) return false;
  return instant >= Date.parse(bounds.from) && instant <= Date.parse(bounds.to);
}

// Is a stored calendar date (e.g. a Daily Site work_date) inside the period?
export function isCalendarDateWithinPeriod(isoDate, range) {
  if (!isValidCalendarDate(isoDate) || !range) return false;
  return isoDate >= range.startDate && isoDate <= range.endDate;
}

// Plain-language period description for the report header. No technical
// timezone identifiers are shown to the reader.
export function describeRange(range) {
  if (!range) return "";
  if (range.startDate === range.endDate) return formatReportDate(range.startDate);
  return `${formatReportDate(range.startDate)} – ${formatReportDate(range.endDate)}`;
}

export function formatReportDate(isoDate) {
  if (!isValidCalendarDate(isoDate)) return "Not recorded";
  const base = calendarMillis(isoDate);
  return new Date(base + EAT_OFFSET_MINUTES * 60000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Format a stored timestamp as its EAT calendar DATE. Slicing the raw ISO
// string would report the UTC day, which is the wrong day for anything stamped
// between midnight and 03:00 EAT.
export function formatReportTimestampDate(timestamp, fallback = "Not recorded") {
  if (!timestamp) return fallback;
  const instant = Date.parse(timestamp);
  if (Number.isNaN(instant)) return fallback;
  return formatReportDate(eatDate(instant));
}

// Format a stored timestamp on the EAT calendar. The viewer's clock never
// changes which day an event is reported under.
export function formatReportDateTime(timestamp) {
  if (!timestamp) return "Not recorded";
  const instant = Date.parse(timestamp);
  if (Number.isNaN(instant)) return "Not recorded";
  const shifted = new Date(instant + EAT_OFFSET_MINUTES * 60000);
  const day = shifted.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const time = shifted.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: false,
  });
  return `${day}, ${time}`;
}
