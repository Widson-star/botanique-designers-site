// The day's operational position, in the five counts the working authority
// (08-daily-site-record-list-working-authority.png) puts in the first viewport.
//
// Every count is derived from records the reader can already see. Nothing is
// stored, nothing is estimated, and a count of zero is a real answer rather than
// a reason to hide the cell — "no site record is late today" is exactly the
// thing a Principal opens this page to learn.
//
// Two sources, each used for what it is authoritative about:
//   * `compliance` rows answer "was a record DUE, and did one arrive" — the
//     database computes due-ness, weekends and not-required in EAT.
//   * `entries` answer "what state is the record in" — accepted, awaiting
//     review, returned.
// They are never mixed: a due count is never inferred from entries, and a state
// count is never inferred from a compliance status.

const AWAITING_REVIEW_STATES = ["submitted", "resubmitted"];

function countSites(rows, pick) {
  return new Set(rows.map(pick).filter(Boolean)).size;
}

// `n sites` / `n site`, or the authority's own phrasing for the not-required
// cell, where the number of sites is not the interesting part.
function acrossSites(count) {
  return count === 1 ? "Across 1 site" : `Across ${count} sites`;
}

export function summariseDay(entries = [], compliance = [], today = "") {
  const todaysEntries = entries.filter((entry) => entry.workDate === today);
  const due = compliance.filter((row) => row.due);
  const late = compliance.filter((row) => row.complianceStatus === "entry_late");
  const notRequired = compliance.filter((row) => row.complianceStatus === "waived");
  const awaiting = todaysEntries.filter((entry) => AWAITING_REVIEW_STATES.includes(entry.state));
  const accepted = todaysEntries.filter((entry) => entry.state === "accepted");

  return [
    {
      key: "due",
      label: "Due today",
      value: due.length,
      hint: acrossSites(countSites(due, (row) => row.projectId)),
      tone: "default",
    },
    {
      key: "awaiting_review",
      label: "Awaiting review",
      value: awaiting.length,
      hint: acrossSites(countSites(awaiting, (entry) => entry.projectId)),
      tone: awaiting.length > 0 ? "waiting" : "default",
    },
    {
      key: "late",
      label: "Late",
      value: late.length,
      hint: acrossSites(countSites(late, (row) => row.projectId)),
      tone: late.length > 0 ? "attention" : "default",
    },
    {
      key: "accepted",
      label: "Accepted",
      value: accepted.length,
      hint: acrossSites(countSites(accepted, (entry) => entry.projectId)),
      tone: accepted.length > 0 ? "settled" : "default",
    },
    {
      key: "not_required",
      label: "Not required",
      value: notRequired.length,
      hint: "No work planned",
      tone: "default",
    },
  ];
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
