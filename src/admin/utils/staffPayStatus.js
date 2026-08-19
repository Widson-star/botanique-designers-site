// The Staff Pay register answers one operational question: do we still owe this
// person money? Approval is decision history and keeps its own lifecycle in the
// database and on the detail/history surfaces — but "Approved" is a poor answer
// to the register's question, so an approved row shows its canonical payment
// position instead. Nothing here mutates the lifecycle; the status is derived.
export const STAFF_PAY_LIFECYCLE_LABELS = {
  draft: "Draft",
  awaiting_review: "Awaiting review",
  amendment_requested: "Amendment requested",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  cancelled: "Cancelled",
};

const LIFECYCLE_TONES = {
  draft: "neutral",
  awaiting_review: "decision",
  amendment_requested: "waiting",
  approved: "settled",
  rejected: "attention",
  withdrawn: "neutral",
  cancelled: "neutral",
};

// Values come from staff_compensation_payment_positions(). "Partially Paid" is
// the settled Founder wording — not "Part-paid" or "Partially received".
export const STAFF_PAY_PAYMENT_LABELS = {
  unpaid: "Unpaid",
  part_paid: "Partially Paid",
  paid: "Paid",
  payment_history_unknown: "Payment history to confirm",
};

// Restrained on purpose: an unpaid obligation is ordinary business, not an
// alarm, so nothing here reaches for a warning colour.
const PAYMENT_TONES = {
  unpaid: "waiting",
  part_paid: "waiting",
  paid: "settled",
  payment_history_unknown: "neutral",
};

// The register's Status filter must offer exactly what the register displays,
// so an operator never filters for a word no row shows. The internal values
// stay namespaced; only the labels are read by a human.
export const STAFF_PAY_STATUS_FILTERS = [
  { value: "lifecycle:draft", label: STAFF_PAY_LIFECYCLE_LABELS.draft },
  { value: "lifecycle:awaiting_review", label: STAFF_PAY_LIFECYCLE_LABELS.awaiting_review },
  { value: "lifecycle:amendment_requested", label: STAFF_PAY_LIFECYCLE_LABELS.amendment_requested },
  { value: "payment:unpaid", label: STAFF_PAY_PAYMENT_LABELS.unpaid },
  { value: "payment:part_paid", label: STAFF_PAY_PAYMENT_LABELS.part_paid },
  { value: "payment:paid", label: STAFF_PAY_PAYMENT_LABELS.paid },
  { value: "payment:payment_history_unknown", label: STAFF_PAY_PAYMENT_LABELS.payment_history_unknown },
  { value: "lifecycle:rejected", label: STAFF_PAY_LIFECYCLE_LABELS.rejected },
  { value: "lifecycle:withdrawn", label: STAFF_PAY_LIFECYCLE_LABELS.withdrawn },
  { value: "lifecycle:cancelled", label: STAFF_PAY_LIFECYCLE_LABELS.cancelled },
];

// One derivation, used by the desktop row, the mobile card and the filter, so
// the three can never disagree about what a record's status is.
export function staffPayRegisterStatus(item, position) {
  const lifecycle = item?.lifecycle || "";
  if (lifecycle === "approved") {
    const paymentStatus = position?.paymentStatus || "";
    if (STAFF_PAY_PAYMENT_LABELS[paymentStatus]) {
      return {
        key: `payment:${paymentStatus}`,
        label: STAFF_PAY_PAYMENT_LABELS[paymentStatus],
        tone: PAYMENT_TONES[paymentStatus] || "neutral",
      };
    }
    // An approved record whose payment position has not arrived yet is still
    // approved. Say so rather than inventing a payment answer.
  }
  return {
    key: `lifecycle:${lifecycle}`,
    label: STAFF_PAY_LIFECYCLE_LABELS[lifecycle] || lifecycle,
    tone: LIFECYCLE_TONES[lifecycle] || "neutral",
  };
}

export function matchesStaffPayStatus(filter, item, position) {
  if (!filter || filter === "all") return true;
  return staffPayRegisterStatus(item, position).key === filter;
}

// Balance is the reconciliation answer, so it outranks Paid when money is still
// owed and steps back to ordinary weight when nothing is.
export function staffPayBalanceEmphasis(position) {
  if (!position || position.paymentStatus === "payment_history_unknown") return "quiet";
  if (position.balanceAmount == null) return "quiet";
  return Number(position.balanceAmount) > 0 ? "strong" : "quiet";
}
