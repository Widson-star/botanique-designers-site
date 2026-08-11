// The day's five status metrics, exactly as the committed authority defines them.
//
// AUTHORITY: 08-daily-site-record-list-working-authority.png. The image shows
// five metric cards across the top of the page, in this order, each with an icon
// disc, a label, a count and a sub-line naming how many sites it covers:
//
//   Due today · Awaiting review · Late · Accepted · Not required
//
// PR #102's first pass DELETED these five cards and replaced them with a single
// invented "day banner", on the reasoning that five equal cards were generic
// clutter. That was a design heuristic overriding a committed authority image,
// which is exactly backwards. The cards are restored here and the heuristic is
// discarded: where the PNG settles a question, the PNG wins.
//
// Every count is derived from records the reader can already see. Nothing is
// stored and nothing is estimated. Two sources, each used for what it is
// authoritative about: `compliance` rows answer "was a record DUE, and did one
// arrive" — the database computes due-ness, weekends and not-required in EAT;
// `entries` answer "what state is the record in". They are never mixed.

const AWAITING_REVIEW_STATES = ["submitted", "resubmitted"];

function countSites(rows, pick) {
  return new Set(rows.map(pick).filter(Boolean)).size;
}

// "Across N sites", as the authority's sub-line reads.
function acrossSites(count) {
  return count === 1 ? "Across 1 site" : `Across ${count} sites`;
}

// The five cards of the authority image, in the authority's order.
export function dayMetrics(entries = [], compliance = [], today = "") {
  const todays = entries.filter((entry) => entry.workDate === today);
  const due = compliance.filter((row) => row.due);
  const late = compliance.filter((row) => row.complianceStatus === "entry_late");
  const notRequired = compliance.filter((row) => row.complianceStatus === "waived");
  const awaiting = todays.filter((entry) => AWAITING_REVIEW_STATES.includes(entry.state));
  const accepted = todays.filter((entry) => entry.state === "accepted");

  return [
    {
      key: "due", label: "Due today", icon: "calendar", tone: "neutral",
      value: due.length, hint: acrossSites(countSites(due, (row) => row.projectId)),
    },
    {
      key: "awaiting_review", label: "Awaiting review", icon: "clock",
      tone: awaiting.length > 0 ? "waiting" : "neutral",
      value: awaiting.length, hint: acrossSites(countSites(awaiting, (entry) => entry.projectId)),
    },
    {
      key: "late", label: "Late", icon: "alert",
      tone: late.length > 0 ? "attention" : "neutral",
      value: late.length, hint: acrossSites(countSites(late, (row) => row.projectId)),
    },
    {
      key: "accepted", label: "Accepted", icon: "check",
      tone: accepted.length > 0 ? "settled" : "neutral",
      value: accepted.length, hint: acrossSites(countSites(accepted, (entry) => entry.projectId)),
    },
    {
      key: "not_required", label: "Not required", icon: "pause", tone: "neutral",
      value: notRequired.length, hint: "No work planned",
    },
  ];
}

// Sites that are due today and have no record at all. The authority image has no
// missing state in its illustrative data, so it settles no treatment for one;
// this is real compliance truth the product must still surface, and it is shown
// in the authority's own contextual bottom bar rather than as an invented banner.
export function missingSites(compliance = []) {
  return compliance.filter((row) => row.complianceStatus === "missing");
}

// The one action a row is actually waiting for. The authority puts a verb in
// every row; the verb has to be the reader's verb, so a manager is never offered
// a decision they do not hold. Nothing here grants anything — it only labels the
// link to the record, where the real capability checks live.
export function nextActionLabel(entry, canReview) {
  if (!entry) return "Open record";
  if (entry.state === "draft") return "Open draft";
  if (entry.state === "returned_for_correction") return "Update record";
  if (AWAITING_REVIEW_STATES.includes(entry.state)) return canReview ? "Review record" : "View record";
  return "View record";
}

// Two-letter monogram for the row's project, as the authority's list uses. It is
// presentation only and never an identity: an unnamed project falls back to a
// neutral mark rather than inventing initials.
export function projectMonogram(name) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "··";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
