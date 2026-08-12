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
// The payment, release and reconciliation model now EXISTS (BD-FIN-01C), so the
// downstream position is surfaced here rather than withheld. It is still read
// only: this module reaches claim → allocation → fund request → release →
// acquittal and reports what it finds, and the Daily Site Record offers no way
// to record a release, reconcile an advance, edit an expenditure line, reverse a
// payment or decide a reconciliation. Those belong to Finance, and the only
// route to them is a link.
//
// Nothing is invented where no record exists: a day with no claim has no
// financial position, and a claim with no fund request is not "unpaid" — it is
// simply not yet requested.

import { canCopyDailySiteToCost, canSeeSiteCosts, SITE_COST_LIFECYCLES } from "./siteCostCapabilities";
import { fundingForClaims, fundingSummaryPhrase } from "./claimFunding";
import { duplicateRiskForEntry } from "./duplicateCostClaim";

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
    return "No work was planned, so no project cost follows from this record.";
  }
  if (["voided", "superseded"].includes(entry?.state)) {
    return "This record is no longer the live record for the day.";
  }
  return "A Project Cost can be raised once this record has been submitted for review.";
}

// The truthful financial-follow-up position for one Daily Site Record.
// Returns null for a role with no site-cost authority, so the interface simply
// does not show a financial area rather than showing an empty one.
// `finance` is the read-only fund-request context — { requests, allocations,
// releases, acquittals }. It is optional: without it the claim position is still
// truthful, it simply says nothing about money movement rather than guessing.
export function summariseFinancialFollowUp(entry, claims, role, finance = null, linesForClaim = null) {
  if (!entry || !canSeeSiteCosts(role)) return null;
  const related = relatedCostClaims(claims, entry);
  const canCreate = canCopyDailySiteToCost(entry, role);

  if (related.length === 0) {
    return {
      code: canCreate ? "none_yet" : "not_available",
      label: entry.disposition === "no_work" ? "No Project Cost expected" : "No Project Cost yet",
      detail: canCreate
        ? "No Project Cost has been raised for this day. Raising one is a separate, deliberate step."
        : unavailableReason(entry),
      needsAttention: false,
      canCreate,
      claims: [],
      // No claim means no authority, no release and no reconciliation. Nothing
      // downstream is asserted rather than an empty financial position shown.
      funding: null,
      duplicateRisk: null,
    };
  }

  const headline = [...related].sort(
    (left, right) => attentionRank(left.lifecycle) - attentionRank(right.lifecycle)
  )[0];

  const funding = finance
    ? fundingForClaims(related.map((claim) => claim.id), finance)
    : null;
  // Money that has actually moved, or is owed an account, outranks a claim still
  // waiting for a decision — but neither replaces the other.
  const showsFunding = Boolean(funding) && funding.fundingPosition !== "not_requested";

  return {
    code: headline.lifecycle,
    label: related.length > 1
      ? `${related.length} related Project Costs`
      : SITE_COST_LIFECYCLES[headline.lifecycle] || "Project Cost",
    detail: CLAIM_POSITION_DETAIL[headline.lifecycle] || "A related Project Cost exists.",
    needsAttention: ["draft", "awaiting_review", "amendment_requested"].includes(headline.lifecycle)
      || (showsFunding && funding.needsAttention),
    canCreate,
    claims: related,
    funding: showsFunding ? funding : null,
    // Whether this record's OWN planning cost has already been claimed. Derived
    // only when the caller supplies the claim lines, because the match is a
    // structural line comparison and never a guess from headline totals.
    duplicateRisk: linesForClaim
      ? duplicateRiskForEntry(entry, claims, linesForClaim)
      : null,
  };
}

// A single short phrase for the list, where only one line of space exists. Once
// money is involved the financial position is the more useful half, so it is
// what the one line spends itself on.
export function financialFollowUpSummary(entry, claims, role, finance = null) {
  const position = summariseFinancialFollowUp(entry, claims, role, finance);
  if (!position) return "";
  const fundingPhrase = fundingSummaryPhrase(position.funding);
  if (fundingPhrase) return fundingPhrase;
  if (position.claims.length > 1) return `${position.claims.length} Project Costs`;
  if (position.claims.length === 1) {
    return `Project Cost: ${SITE_COST_LIFECYCLES[position.claims[0].lifecycle] || "raised"}`;
  }
  return position.code === "none_yet" ? "No Project Cost yet" : "";
}
