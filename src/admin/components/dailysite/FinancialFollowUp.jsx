import { Link } from "react-router-dom";
import {
  canSubmitCostFromDailySite, canSubmitSiteCost, costSubmissionBlockedReason,
  SITE_COST_LIFECYCLES,
} from "../../utils/siteCostCapabilities";
import { costTotal } from "../../utils/costPaymentTruth";
import { costReference } from "../../utils/costReference";
import { formatKes } from "../../utils/dailySiteFormatters";
import { FUNDING_POSITIONS } from "../../utils/claimFunding";
import { RECONCILIATION_STATES } from "../../utils/fundReleaseCapabilities";
import { Chip } from "../ui/Surfaces";

// A Project Cost is identified by what it was for, not by a machine-generated
// recipient string. The recipient stays available on the cost's own page.
function costTitle(claim) {
  const purpose = String(claim.purpose || "").split("\n")[0].trim();
  return purpose || claim.recipientLabel || costReference(claim);
}

// The related cost claim, as a NEUTRAL section of the Daily Site Record.
//
// CORRECTION, 10 August 2026. This used to lead with a warning whenever a claim
// already covered the day's planning cost:
//
//   "This day's site labour has already been claimed (KES 5,950). Open that
//    claim rather than raising it a second time."
//
// Two things were wrong with it. First, an existing approved claim is the NORMAL
// downstream state of an accepted record, not an error, and presenting it as one
// nagged the reader on every single view. Second, KES 5,950 was the whole claim
// total — a claim that also contained a KES 950 non-labour line — so calling all
// of it "site labour" overstated what had actually been claimed.
//
// So the normal state is now a plain related-claim summary: what it is, how
// much, its lifecycle, and a way in. The duplicate warning has moved to the
// moment it is useful — when someone actually chooses to raise another
// overlapping claim — and lives on AdminSiteCostForm. The structural detection
// from PR #100 is unchanged; only when it speaks has changed.
export default function FinancialFollowUp({
  position, entry = null, role = "", currentUserId = "",
  linesForClaim = null, onSubmitClaim = null, submitting = false, profilesById = null,
}) {
  if (!position) return null;
  const { canCreate, claims, funding, duplicateRisk } = position;
  const alreadyClaimed = Boolean(duplicateRisk?.planningCostAlreadyClaimed);
  const coveringClaim = duplicateRisk?.coveringClaims?.[0] || null;

  const requesterName = (claim) =>
    profilesById?.[claim.requesterId]?.full_name || "the requesting manager";

  return (
    <section aria-label="Financial follow-up" className="border-t border-stone-100 px-4 py-3.5">
      <h3 className="text-[12.5px] font-semibold text-botanique-charcoal">
        {claims.length > 1 ? `${claims.length} related Project Costs` : "Related Project Cost"}
      </h3>

      {claims.length === 0 ? (
        <>
          <p className="mt-1 text-[12.5px] font-medium text-gray-600">{position.label}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-gray-500">{position.detail}</p>
        </>
      ) : (
        <ul className="mt-2 space-y-3">
          {claims.map((claim) => {
            // The accepted record's next move. The manager who raised a draft may
            // send it for a decision from here; the Principal may not approve a
            // draft, so they are told plainly who it is waiting on.
            const maySubmit = canSubmitSiteCost(claim, role, currentUserId) &&
              canSubmitCostFromDailySite(entry);
            const blockedReason = canSubmitSiteCost(claim, role, currentUserId)
              ? costSubmissionBlockedReason(entry)
              : "";
            const awaitingSubmission = role === "owner" && claim.lifecycle === "draft";
            return (
              <li key={claim.id}>
                <Link
                  to={`/admin/site-costs/${claim.id}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 hover:underline"
                >
                  <span className="min-w-0 break-words text-[12.5px] font-semibold text-botanique-green">
                    {costTitle(claim)}
                  </span>
                  <span className="shrink-0 text-[13px] font-semibold tabular-nums text-botanique-charcoal">
                    {formatKes(costTotal(claim, linesForClaim?.(claim.id)))}
                  </span>
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Chip tone={claim.lifecycle === "approved" ? "settled" : claim.lifecycle === "awaiting_review" ? "waiting" : "neutral"}>
                    {SITE_COST_LIFECYCLES[claim.lifecycle] || "Project Cost"}
                  </Chip>
                  <span className="text-[11px] text-gray-500">{costReference(claim)}</span>
                </div>

                {maySubmit && onSubmitClaim && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => onSubmitClaim(claim)}
                    className="mt-2 inline-flex min-h-10 items-center rounded-lg bg-botanique-green px-3.5 text-[12.5px] font-semibold text-white hover:bg-botanique-dark disabled:opacity-60"
                  >
                    {claim.lifecycle === "draft" ? "Submit Project Cost for review" : "Resubmit Project Cost for review"}
                  </button>
                )}

                {blockedReason && (
                  <p className="mt-1.5 text-[11.5px] leading-snug text-gray-500">{blockedReason}</p>
                )}

                {awaitingSubmission && (
                  <p className="mt-1.5 text-[11.5px] leading-snug text-gray-500">
                    Project Cost awaiting submission by {requesterName(claim)}.{" "}
                    <Link to={`/admin/site-costs/${claim.id}`} className="font-semibold text-botanique-green hover:underline">
                      View Project Cost
                    </Link>
                  </p>
                )}

                {role === "owner" && claim.lifecycle === "awaiting_review" && (
                  <Link
                    to={`/admin/site-costs/${claim.id}`}
                    className="mt-2 inline-flex min-h-10 items-center rounded-lg bg-botanique-green px-3.5 text-[12.5px] font-semibold text-white hover:bg-botanique-dark"
                  >
                    Review Project Cost
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* The money position, when money has actually been authorised against
          these claims. Both dimensions are named whenever both say something,
          so a funding label can never conceal an unaccounted advance. The fund
          request owns the full ledger; this is a summary and a way through. */}
      {funding && (
        <div className="mt-2.5 border-t border-stone-100 pt-2.5">
          <div className="flex flex-wrap gap-1.5">
            <Chip tone={funding.fundingPosition === "fully_funded" ? "settled" : funding.fundingPosition === "partially_funded" ? "waiting" : "neutral"}>
              {FUNDING_POSITIONS[funding.fundingPosition]}
            </Chip>
            {funding.reconciliationApplies && (
              <Chip tone={["outstanding", "amendment_requested"].includes(funding.reconciliationPosition) ? "waiting" : funding.reconciliationPosition === "accepted" ? "settled" : "info"}>
                {RECONCILIATION_STATES[funding.reconciliationPosition]}
              </Chip>
            )}
          </div>
          {funding.requests.map((entry) => (
            <Link
              key={entry.request.id}
              to={`/admin/fund-requests/${entry.request.id}`}
              className="mt-1.5 inline-block text-[12px] font-semibold text-botanique-green hover:underline"
            >
              {entry.request.requestNumber}
            </Link>
          ))}
        </div>
      )}

      {/* The create/raise action lives in the page header, where the authority
          image puts it. Stated here only as quiet context — never as a warning,
          because an existing claim is the normal downstream state. The real
          duplicate check runs on the claim form, where an overlapping claim
          would actually be created. */}
      {canCreate && alreadyClaimed && coveringClaim && (
        <p className="mt-2.5 border-t border-stone-100 pt-2.5 text-[11px] leading-snug text-gray-500">
          This day&rsquo;s planned cost is already covered by the claim above.
        </p>
      )}
    </section>
  );
}
