// Where one day's record has actually got to, as the three stages the product
// really holds.
//
// The working authority (09-daily-site-record-detail-working-authority.png)
// draws a four-step rhythm ending in a "Day close-out" step. That fourth step is
// NOT implemented and is not implied here: the settled decision is that
// operational close and financial settlement are distinct, and no day-close
// action, state or record exists in this product. Inventing one because a
// picture has four boxes would be the picture inventing a workflow.
//
// So the rail states the three transitions that genuinely exist:
//
//   1. the site record itself      (daily_site_entries lifecycle)
//   2. the Project Cost            (internal_cost_claims, deliberately raised)
//   3. payment / advance           (fund_requests → releases → acquittals)
//
// Every stage reads from a record. Nothing here is stored, and stage 3 is
// silent — not "pending" — when no claim exists, because a day with no cost is
// not a day with an unpaid one.

const DONE = "done";
const CURRENT = "current";
const WAITING = "waiting";
const ATTENTION = "attention";

function recordStage(entry) {
  switch (entry.state) {
    case "accepted":
      return { status: DONE, detail: "Recorded and accepted" };
    case "submitted":
    case "resubmitted":
      return {
        status: entry.isLate ? ATTENTION : CURRENT,
        detail: entry.isLate ? "Submitted late — awaiting review" : "Awaiting review",
      };
    case "returned_for_correction":
      return { status: ATTENTION, detail: "Returned for correction" };
    case "draft":
      return { status: CURRENT, detail: "Draft — not yet submitted" };
    case "voided":
      return { status: WAITING, detail: "Voided" };
    case "superseded":
      return { status: WAITING, detail: "Replaced by a later correction" };
    default:
      return { status: WAITING, detail: "" };
  }
}

function claimStage(entry, position) {
  if (entry.disposition === "no_work") {
    return { status: WAITING, detail: "No work planned — no cost follows" };
  }
  if (!position || position.claims.length === 0) {
    return {
      status: entry.state === "accepted" ? CURRENT : WAITING,
      detail: "No Project Cost raised yet",
    };
  }
  const count = position.claims.length;
  const approved = position.claims.filter((claim) => claim.lifecycle === "approved").length;
  if (approved === count) {
    return {
      status: DONE,
      detail: count === 1 ? "Approved" : `All ${count} Project Costs approved`,
    };
  }
  return {
    status: ["draft", "awaiting_review", "amendment_requested"].includes(position.code)
      ? CURRENT
      : WAITING,
    detail: count === 1 ? position.label : `${approved} of ${count} Project Costs approved`,
  };
}

// The rail summarises; the funding panel below states the position in full. The
// two deliberately use different wording, so a reader never has to work out
// whether they are looking at one fact twice or two facts that agree.
const RAIL_FUNDING_DETAIL = {
  not_requested: "Not yet recorded",
  awaiting_authority: "Awaiting the Principal's decision",
  unpaid: "Authorised, nothing released",
  partially_funded: "Part of the authority released",
  fully_funded: "Whole authority released",
};

function moneyStage(position) {
  const funding = position?.funding;
  if (!funding) {
    return {
      status: WAITING,
      detail: position?.claims?.length
        ? "Not yet recorded"
        : "",
    };
  }
  if (funding.settled) return { status: DONE, detail: "Settled in full" };
  const detail = RAIL_FUNDING_DETAIL[funding.fundingPosition] || "";
  // An unaccounted advance is the half a funding label would hide, so the rail
  // carries it too — in its own words.
  const owing = funding.reconciliationApplies
    && ["outstanding", "amendment_requested"].includes(funding.reconciliationPosition);
  return {
    status: funding.needsAttention ? ATTENTION : CURRENT,
    detail: owing ? `${detail} · advance not accounted for` : detail,
  };
}

export function recordProgressSteps(entry, position) {
  if (!entry) return [];
  return [
    { key: "record", label: "Site record", ...recordStage(entry) },
    { key: "claim", label: "Project Cost", ...claimStage(entry, position) },
    {
      key: "money",
      label: "Payment / Advance",
      ...moneyStage(position),
    },
  ];
}

// The single sentence the foot of the record ends on: what this record is
// waiting for, in the reader's language. Null when nothing is waiting on anyone,
// so the page does not manufacture urgency.
export function recordNextStep(entry, position) {
  if (!entry) return null;
  if (entry.state === "draft") return "This record is still a draft. Submit it for review.";
  if (entry.state === "returned_for_correction") {
    return "This record was returned. Correct it and resubmit.";
  }
  if (["submitted", "resubmitted"].includes(entry.state)) {
    return "This record is with the Principal for review.";
  }
  if (entry.state !== "accepted") return null;
  if (entry.disposition === "no_work") return null;
  if (!position) return null;
  if (position.claims.length === 0) {
    return position.canCreate
      ? "The record is accepted. The day's known costs normally move into a Project Cost by 4:00 pm."
      : null;
  }
  return null;
}
