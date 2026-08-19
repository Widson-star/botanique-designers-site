// FOUNDER RULING, 19 Aug 2026. The Project Costs register must answer one
// question at a glance: IS THIS COST STILL OWED?
//
// Approval remains the underlying lifecycle and is untouched in the database,
// in decision history and in approval provenance. But "Approved" is a poor
// answer to the register's question — a fully settled cost and a cost with its
// whole balance outstanding both read "Approved" — so once a Project Cost is
// approved, the visible row status becomes its CURRENT PAYMENT POSITION.
//
// Records that have not been approved keep their lifecycle label, because for
// them the approval decision IS the working status.
//
// This mirrors staffPayStatus.js exactly, so the two Finance registers cannot
// describe the same situation in two different vocabularies.
import { SITE_COST_LIFECYCLES } from "./siteCostCapabilities";
import { PAYMENT_KNOWLEDGE } from "./costPaymentTruth";

const LIFECYCLE_TONES = {
  draft: "neutral",
  awaiting_review: "waiting",
  amendment_requested: "waiting",
  approved: "settled",
  rejected: "attention",
  withdrawn: "neutral",
  cancelled: "neutral",
};

// Settled Founder vocabulary. Not "Part paid", "Part-paid", "Nothing paid",
// "Paid in full" or "Payment not recorded" — those read as four different
// products. The keys are the EXISTING filter/URL values and must not change:
// report drill-through links already carry ?payment=part_paid and
// ?payment=unrecorded.
export const PROJECT_COST_PAYMENT_LABELS = {
  unpaid: "Unpaid",
  part_paid: "Partially Paid",
  paid: "Paid",
  unrecorded: "Payment history to confirm",
};

// Restrained on purpose: an unpaid obligation is ordinary business, not an
// alarm, so nothing here reaches for red or amber.
const PAYMENT_TONES = {
  unpaid: "waiting",
  part_paid: "waiting",
  paid: "settled",
  unrecorded: "neutral",
};

// The register's Payment position filter offers exactly what the register
// displays, so an operator never filters for a word no row shows.
export const PROJECT_COST_PAYMENT_FILTERS = [
  { value: "unpaid", label: PROJECT_COST_PAYMENT_LABELS.unpaid },
  { value: "part_paid", label: PROJECT_COST_PAYMENT_LABELS.part_paid },
  { value: "paid", label: PROJECT_COST_PAYMENT_LABELS.paid },
  { value: "unrecorded", label: PROJECT_COST_PAYMENT_LABELS.unrecorded },
];

// The payment position of ONE approved cost, from canonical Project Cost
// payment truth only — never from Fund Requests, Advances, allocations,
// releases, Daily Site Records or Staff Pay. Returns "" when the record is not
// approved, or when its truth has not arrived yet.
export function projectCostPaymentKey(claim, truth) {
  if (claim?.lifecycle !== "approved" || !truth) return "";
  if (truth.knowledge === PAYMENT_KNOWLEDGE.unrecorded) return "unrecorded";
  if (truth.knowledge !== PAYMENT_KNOWLEDGE.known) return "";
  if (truth.balance === 0) return "paid";
  return truth.paid > 0 ? "part_paid" : "unpaid";
}

// One derivation, used by the desktop row, the mobile card, the filter, the
// detail header and Finance activity, so those five can never disagree about
// what a Project Cost's working status is.
export function projectCostRegisterStatus(claim, truth) {
  const key = projectCostPaymentKey(claim, truth);
  if (key) {
    return { key: `payment:${key}`, label: PROJECT_COST_PAYMENT_LABELS[key], tone: PAYMENT_TONES[key] };
  }
  // Not approved — or approved with no payment truth loaded yet, in which case
  // it is still approved and saying so beats inventing a payment answer.
  const lifecycle = claim?.lifecycle || "";
  return {
    key: `lifecycle:${lifecycle}`,
    label: SITE_COST_LIFECYCLES[lifecycle] || lifecycle,
    tone: LIFECYCLE_TONES[lifecycle] || "neutral",
  };
}

// Filtering runs off the same derivation as the chip, so filtering for
// Partially Paid returns exactly the rows the register shows as Partially Paid.
export function matchesProjectCostPayment(filter, claim, truth) {
  if (!filter || filter === "all") return true;
  return projectCostPaymentKey(claim, truth) === filter;
}
