// Accidental double-claiming of one Daily Site Record cost.
//
// Discovered in the hosted walkthrough of 9 August 2026: a Daily Site Record can be used to
// raise the SAME cost twice. The hand-off offered "Create cost claim" with equal prominence
// however many claims already existed, and the form pre-filled the record's own planning line,
// so a second visit produced a claim that was a strict subset of one already approved.
//
// MULTIPLE CLAIMS PER DAY REMAIN LEGITIMATE and nothing here forbids them. A labour claim and
// a materials claim on one day, a later transport cost, a correction after a rejection — all
// are real and none is blocked. What is prevented is the SILENT one: raising the record's own
// planning cost a second time without noticing it has already been claimed.
//
// The matching is deliberately STRUCTURAL, never fuzzy. There is no text similarity, no
// scoring and no guessing. Every signal below is an exact equality on a field the model
// already stores:
//
//   1. the same daily_site_entry_id                     (the claim came from this record)
//   2. the same category                                (the same kind of cost)
//   3. a line matching the record's own planning line   (description, rate type, quantity,
//      exactly as AdminSiteCostForm pre-fills it         unit rate — all equal)
//
// A claim is only ever treated as "covering" the cost when ALL THREE hold. That is why a
// different category, a different record, or a genuinely different line is never flagged.

import { SITE_COST_LIFECYCLES } from "./siteCostCapabilities";

// Lifecycles in which a claim still represents a live obligation. A rejected, withdrawn or
// cancelled claim covers nothing, so it never suppresses the ordinary create action and never
// raises a duplicate warning — re-claiming after a rejection is exactly the legitimate case.
export const LIVE_CLAIM_LIFECYCLES = ["draft", "awaiting_review", "amendment_requested", "approved"];

export function isLiveClaim(claim) {
  return LIVE_CLAIM_LIFECYCLES.includes(claim?.lifecycle);
}

function money(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null;
}

// The line AdminSiteCostForm.sourcePrefill() would generate from this record, expressed as a
// comparable fingerprint. Kept deliberately in lock-step with that function: if the pre-fill
// ever changes shape, this must change with it or the safeguard silently stops matching.
export function planningLineFingerprint(entry) {
  if (!entry || entry.disposition !== "working") return null;
  if (entry.agreedLabourTotal != null) {
    const agreed = money(entry.agreedLabourTotal);
    if (agreed == null || agreed <= 0) return null;
    return { description: "Agreed site labour", rateType: "lump_sum", quantity: 1, unitRate: agreed };
  }
  const quantity = money(entry.expectedWorkerCount);
  const unitRate = money(entry.ratePerWorker);
  if (!quantity || !unitRate) return null;
  return { description: "Planned site labour", rateType: "daily", quantity, unitRate };
}

function lineMatchesFingerprint(line, fingerprint) {
  return Boolean(fingerprint)
    && line?.description === fingerprint.description
    && line?.rateType === fingerprint.rateType
    && money(line?.quantity) === fingerprint.quantity
    && money(line?.unitRate) === fingerprint.unitRate;
}

// Does this claim already contain the record's own planning cost?
export function claimCoversPlanningLine(claim, lines, entry) {
  const fingerprint = planningLineFingerprint(entry);
  if (!fingerprint || !claim) return false;
  if (claim.dailySiteEntryId !== entry.id) return false;
  if (claim.category !== "labour") return false;
  return (lines || []).some((line) => lineMatchesFingerprint(line, fingerprint));
}

// The hand-off position for one Daily Site Record.
//
// `linesForClaim` is the provider's own accessor, so this reads the same lines the claim
// detail shows and never re-derives an amount of its own.
export function duplicateRiskForEntry(entry, claims = [], linesForClaim = () => []) {
  const fromThisRecord = claims.filter((claim) => claim?.dailySiteEntryId === entry?.id);
  const live = fromThisRecord.filter(isLiveClaim);
  const covering = live.filter((claim) => claimCoversPlanningLine(claim, linesForClaim(claim.id), entry));

  return {
    // Every live claim raised from this record, whether or not it covers the planning cost.
    liveClaims: live,
    // The live claims that already contain this record's own planning cost.
    coveringClaims: covering,
    // True only when the record's planning cost has demonstrably already been claimed.
    planningCostAlreadyClaimed: covering.length > 0,
    // What the ordinary user should be steered to. "open" never removes the additional path;
    // it only stops the duplicate being the equally prominent default.
    primaryAction: covering.length > 0 ? "open" : "create",
    // An additional claim is always reachable, and always deliberate.
    additionalRequiresReason: live.length > 0,
  };
}

// Principal-side review. Does this submitted claim structurally overlap another claim from the
// same Daily Site Record? Returns the overlapping claims, never a verdict: the Principal keeps
// the decision and nothing is auto-rejected.
export function possibleDuplicateClaims(claim, claims = [], linesForClaim = () => []) {
  if (!claim?.dailySiteEntryId) return [];
  const ownLines = linesForClaim(claim.id);
  if (!ownLines.length) return [];

  return claims
    .filter((other) => other.id !== claim.id)
    .filter((other) => other.dailySiteEntryId === claim.dailySiteEntryId)
    .filter((other) => other.category === claim.category)
    .filter(isLiveClaim)
    // Structural overlap: at least one line is identical in description, rate type, quantity
    // and unit rate. Two claims that merely share a day and a category do not qualify.
    .filter((other) => {
      const otherLines = linesForClaim(other.id);
      return ownLines.some((line) => otherLines.some((candidate) =>
        candidate.description === line.description
        && candidate.rateType === line.rateType
        && money(candidate.quantity) === money(line.quantity)
        && money(candidate.unitRate) === money(line.unitRate)));
    })
    .sort((left, right) => String(left.createdAt || "").localeCompare(String(right.createdAt || "")));
}

// One plain sentence naming what already exists, for the compact warning.
export function describeCoveringClaim(claim) {
  if (!claim) return "";
  const state = SITE_COST_LIFECYCLES[claim.lifecycle] || "raised";
  return `${state.toLowerCase()}`;
}
