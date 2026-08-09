// The Daily Site Record → cost claim hand-off, derived only.
//
// The Daily Site Record is an operational record and never a financial ledger.
// Nothing here creates, mutates or implies a liability, payment, fund release,
// reimbursement, approval, invoice or expenditure transaction: every value is
// read from claims that a person deliberately created in the Site Costs module.
//
// The relationship already exists in the schema — `internal_cost_claims`
// carries `daily_site_entry_id`, `project_id` and `service_date` — so no new
// relationship is invented here. A same-day second claim and a next-day
// correction claim are both legitimate, so no one-claim-per-day rule is
// imposed.
//
// Payment, release and reconciliation are NOT implemented anywhere in the
// repository, so no "paid", "released", "settled" or "reconciled" position is
// derived or displayed. Those belong to the payment/reconciliation model
// authorised by BD-FIN-01C and not yet built.

import { canCopyDailySiteToCost, canSeeSiteCosts, SITE_COST_LIFECYCLES } from "./siteCostCapabilities";

// Order of attention: what a reader has to deal with first.
const ATTENTION_ORDER = [
  "amendment_requested",
  "draft",
  "awaiting_review",
  "approved",
  "rejected",
  "withdrawn",
  "cancelled",
];

// One plain sentence per claim lifecycle. Deliberately silent about money
// movement — approval is authority to incur, not payment.
export const CLAIM_POSITION_DETAIL = {
  draft: "A draft claim exists but has not been submitted for a decision.",
  awaiting_review: "The claim is with the Principal for a decision.",
  amendment_requested: "The Principal asked for an amendment before deciding.",
  approved: "The claim was approved. Approval is authority to incur — it is not a payment.",
  rejected: "The claim was declined.",
  withdrawn: "The claim was withdrawn by the requester.",
  cancelled: "The claim was cancelled after approval.",
};

function attentionRank(lifecycle) {
  const index = ATTENTION_ORDER.indexOf(lifecycle);
  return index === -1 ? ATTENTION_ORDER.length : index;
}

// Claims that genuinely relate to this site and day: those created from this
// record, plus any other claim for the same project and service date. The
// second case is what keeps a same-day correction claim, or a claim raised
// straight from Site Costs, visible on the operational record it belongs to.
export function relatedCostClaims(claims, entry) {
  if (!entry || !Array.isArray(claims)) return [];
  return claims
    .filter((claim) => claim.dailySiteEntryId === entry.id ||
      (claim.projectId === entry.projectId && claim.serviceDate === entry.workDate))
    .map((claim) => ({ ...claim, linkedToEntry: claim.dailySiteEntryId === entry.id }))
    .sort((left, right) => {
      if (left.linkedToEntry !== right.linkedToEntry) return left.linkedToEntry ? -1 : 1;
      return String(left.createdAt || "").localeCompare(String(right.createdAt || ""));
    });
}

// Why a claim cannot be raised from this record yet, in the reader's language.
function unavailableReason(entry) {
  if (entry?.disposition === "no_work") {
    return "No work was planned, so no site cost follows from this record.";
  }
  if (["voided", "superseded"].includes(entry?.state)) {
    return "This record is no longer the live record for the day.";
  }
  return "A cost claim can be raised once this record has been submitted for review.";
}

// The truthful financial-follow-up position for one Daily Site Record.
// Returns null for a role with no site-cost authority, so the interface simply
// does not show a financial area rather than showing an empty one.
export function summariseFinancialFollowUp(entry, claims, role) {
  if (!entry || !canSeeSiteCosts(role)) return null;
  const related = relatedCostClaims(claims, entry);
  const canCreate = canCopyDailySiteToCost(entry, role);

  if (related.length === 0) {
    return {
      code: canCreate ? "none_yet" : "not_available",
      label: entry.disposition === "no_work" ? "No cost claim expected" : "No cost claim yet",
      detail: canCreate
        ? "No site cost has been claimed for this day. Raising a claim is a separate, deliberate step."
        : unavailableReason(entry),
      needsAttention: false,
      canCreate,
      claims: [],
    };
  }

  const headline = [...related].sort(
    (left, right) => attentionRank(left.lifecycle) - attentionRank(right.lifecycle)
  )[0];

  return {
    code: headline.lifecycle,
    label: related.length > 1
      ? `${related.length} related cost claims`
      : SITE_COST_LIFECYCLES[headline.lifecycle] || "Cost claim",
    detail: CLAIM_POSITION_DETAIL[headline.lifecycle] || "A related cost claim exists.",
    needsAttention: ["draft", "awaiting_review", "amendment_requested"].includes(headline.lifecycle),
    canCreate,
    claims: related,
  };
}

// A single short phrase for the list, where only one line of space exists.
export function financialFollowUpSummary(entry, claims, role) {
  const position = summariseFinancialFollowUp(entry, claims, role);
  if (!position) return "";
  if (position.claims.length > 1) return `${position.claims.length} cost claims`;
  if (position.claims.length === 1) {
    return `Cost claim: ${SITE_COST_LIFECYCLES[position.claims[0].lifecycle] || "raised"}`;
  }
  return position.code === "none_yet" ? "No cost claim yet" : "";
}
