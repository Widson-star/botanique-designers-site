// The day's operational position.
//
// Visual Authority Tranche 1 rendered this as five equal statistic cards
// followed by a separate alert strip. The Founder's review of the hosted result
// was that five equal cards give every count the same weight, so nothing leads,
// and that when sites are missing a record "the missing-site requirement should
// feel like the central operational task, not just another yellow strip beneath
// five cards".
//
// So the counts are no longer a set of cards. They are:
//
//   * ONE HEADLINE — the single sentence that is the day's position, chosen by
//     what actually needs doing, not by a fixed slot order;
//   * COUNTS ATTACHED TO THE FILTERS that select them, so a number is a way of
//     getting somewhere rather than a decoration.
//
// Every count is derived from records the reader can already see. Nothing is
// stored and nothing is estimated. Two sources, each used for what it is
// authoritative about: `compliance` rows answer "was a record DUE, and did one
// arrive" (the database computes due-ness, weekends and not-required in EAT);
// `entries` answer "what state is the record in". They are never mixed.

const AWAITING_REVIEW_STATES = ["submitted", "resubmitted"];

function sites(rows, pick) {
  return new Set(rows.map(pick).filter(Boolean)).size;
}

export function dayCounts(entries = [], compliance = [], today = "") {
  const todays = entries.filter((entry) => entry.workDate === today);
  const due = compliance.filter((row) => row.due);
  const missingRows = compliance.filter((row) => row.complianceStatus === "missing");

  return {
    due: due.length,
    dueSites: sites(due, (row) => row.projectId),
    missing: missingRows.length,
    missingProjects: missingRows,
    late: compliance.filter((row) => row.complianceStatus === "entry_late").length,
    notRequired: compliance.filter((row) => row.complianceStatus === "waived").length,
    awaitingReview: todays.filter((entry) => AWAITING_REVIEW_STATES.includes(entry.state)).length,
    accepted: todays.filter((entry) => entry.state === "accepted").length,
    returned: todays.filter((entry) => entry.state === "returned_for_correction").length,
    recorded: todays.length,
  };
}

// The day in one sentence, chosen by what needs doing. Worst first: a site with
// no record at all outranks a record waiting for review, which outranks a day
// where everything is done.
export function dayHeadline(counts, { ready = true } = {}) {
  if (!ready) {
    return { tone: "neutral", icon: "clock", headline: "Loading today's site records…", detail: "" };
  }
  if (counts.missing > 0) {
    return {
      tone: "attention",
      icon: "alert",
      headline: counts.missing === 1
        ? "1 site still needs a morning record"
        : `${counts.missing} sites still need a morning record`,
      detail: "Recording the morning position is the first task of the day.",
    };
  }
  if (counts.due === 0) {
    return {
      tone: "neutral",
      icon: "pause",
      headline: "No site record is due today",
      detail: counts.notRequired > 0
        ? `${counts.notRequired} ${counts.notRequired === 1 ? "site is" : "sites are"} marked not required.`
        : "No active site has work planned that requires a record.",
    };
  }
  if (counts.awaitingReview > 0) {
    return {
      tone: "waiting",
      icon: "clock",
      headline: counts.awaitingReview === 1
        ? "1 record is waiting for review"
        : `${counts.awaitingReview} records are waiting for review`,
      detail: "Every active site has recorded its morning position.",
    };
  }
  return {
    tone: "settled",
    icon: "check",
    headline: "Every active site has recorded today",
    detail: counts.notRequired > 0
      ? `${counts.notRequired} ${counts.notRequired === 1 ? "site was" : "sites were"} marked not required.`
      : "Nothing is outstanding on the morning record.",
  };
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
