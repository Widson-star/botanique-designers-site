// How a Project Cost describes itself — after real use in production showed
// three places where the interface said something it did not mean.
//
// Nothing here computes money or authority. These are labels only: the amount
// itself, the lifecycle, the stored payment channel and every guard are
// unchanged. Only what a reader sees changes.

// A Draft that has never been decided was still labelled "Approved amount",
// which is the one thing it certainly is not. The label now follows lifecycle
// truth while the figure behind it is computed exactly as before.
const AMOUNT_LABELS = {
  draft: "Current amount",
  amendment_requested: "Current amount",
  awaiting_review: "Submitted amount",
  approved: "Approved amount",
  rejected: "Final amount",
  withdrawn: "Final amount",
  cancelled: "Final amount",
};

export function costAmountLabel(claim) {
  return AMOUNT_LABELS[claim?.lifecycle] || "Current amount";
}

// The register's secondary line answers "what is this cost for?". The
// recipient/crew field is often raw site arithmetic — "(Mason 1200 and 2
// casuals @500} Ksh 2200, Waweru {1000}…" — which is genuine detail but not a
// description, and it belongs on the detail page where it is already shown in
// full. Purpose is preferred; a recipient fallback is trimmed rather than
// reinterpreted, because shortening is safe and guessing is not.
// The row stays compact either way: the standing ruling is that the full text
// belongs to the drill-through, so a long purpose is shortened exactly as a
// long recipient is. Shortening is safe; reinterpreting would not be.
const COMPACT_LIMIT = 60;

function compact(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= COMPACT_LIMIT) return text;
  return `${text.slice(0, COMPACT_LIMIT).trimEnd()}…`;
}

export function costSecondaryDescription(claim) {
  const purpose = String(claim?.purpose || "")
    .split("\n")
    .map((part) => part.trim())
    .filter(Boolean);
  if (purpose.length) return compact(purpose.join(" — "));
  return compact(claim?.recipientLabel);
}

// Stored channel values are database enums and are never rewritten. This is the
// reader's version of them. Project Cost payments keep their own map rather
// than borrowing the Advances one: the two are separate columns on separate
// tables, and a Project Cost payment deliberately does not depend on Advances.
const PAYMENT_CHANNEL_LABELS = {
  mpesa: "M-Pesa",
  bank_transfer: "Bank transfer",
  cash: "Cash",
  other: "Other",
};

export function paymentChannelLabel(channel) {
  if (!channel) return "";
  return PAYMENT_CHANNEL_LABELS[channel] || String(channel).replaceAll("_", " ");
}

export const PROJECT_COST_PAYMENT_CHANNELS = PAYMENT_CHANNEL_LABELS;
