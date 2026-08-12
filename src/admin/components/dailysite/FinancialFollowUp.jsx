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

function costTitle(claim) {
  const purpose = String(claim.purpose || "").split("\n")[0].trim();
  return purpose || claim.recipientLabel || costReference(claim);
}

export default function FinancialFollowUp({
  position, entry = null, entries = [], role = "", currentUserId = "",
  linesForClaim = null, onSubmitClaim = null, submitting = false, profilesById = null,
}) {
  if (!position) return null;
  const { canCreate, claims, funding, duplicateRisk } = position;
  const alreadyClaimed = Boolean(duplicateRisk?.planningCostAlreadyClaimed);
  const coveringClaim = duplicateRisk?.coveringClaims?.[0] || null;
  const requesterName = (claim) => profilesById?.[claim.requesterId]?.full_name || "the requesting manager";

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
            // The DSR ordering gate follows THIS Project Cost's own source record.
            // Same-day costs can appear on another record by project/date, but that
            // must never grant submission authority. Direct Project Costs have no
            // DSR source and are therefore not subject to the DSR acceptance gate.
            const sourceEntry = claim.dailySiteEntryId
              ? entries.find((candidate) => candidate.id === claim.dailySiteEntryId) || null
              : null;
            const maySubmitByRole = canSubmitSiteCost(claim, role, currentUserId);
            const sourceAllowsSubmission = claim.dailySiteEntryId
              ? Boolean(sourceEntry && canSubmitCostFromDailySite(sourceEntry))
              : true;
            const maySubmit = maySubmitByRole && sourceAllowsSubmission;
            const blockedReason = maySubmitByRole && claim.dailySiteEntryId && sourceEntry
              ? costSubmissionBlockedReason(sourceEntry)
              : "";
            const sourceUnavailable = maySubmitByRole && claim.dailySiteEntryId && !sourceEntry;
            const awaitingSubmission = role === "owner" && claim.lifecycle === "draft";

            return (
              <li key={claim.id}>
                <Link to={`/admin/site-costs/${claim.id}`} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 hover:underline">
                  <span className="min-w-0 break-words text-[12.5px] font-semibold text-botanique-green">{costTitle(claim)}</span>
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
                  <button type="button" disabled={submitting} onClick={() => onSubmitClaim(claim)} className="mt-2 inline-flex min-h-10 items-center rounded-lg bg-botanique-green px-3.5 text-[12.5px] font-semibold text-white hover:bg-botanique-dark disabled:opacity-60">
                    {claim.lifecycle === "draft" ? "Submit Project Cost for review" : "Resubmit Project Cost for review"}
                  </button>
                )}

                {blockedReason && <p className="mt-1.5 text-[11.5px] leading-snug text-gray-500">{blockedReason}</p>}
                {sourceUnavailable && (
                  <p className="mt-1.5 text-[11.5px] leading-snug text-gray-500">
                    This Project Cost's source site record is not available here. Open the Project Cost before submitting it.
                  </p>
                )}

                {awaitingSubmission && (
                  <p className="mt-1.5 text-[11.5px] leading-snug text-gray-500">
                    Project Cost awaiting submission by {requesterName(claim)}.{" "}
                    <Link to={`/admin/site-costs/${claim.id}`} className="font-semibold text-botanique-green hover:underline">View Project Cost</Link>
                  </p>
                )}

                {role === "owner" && claim.lifecycle === "awaiting_review" && (
                  <Link to={`/admin/site-costs/${claim.id}`} className="mt-2 inline-flex min-h-10 items-center rounded-lg bg-botanique-green px-3.5 text-[12.5px] font-semibold text-white hover:bg-botanique-dark">
                    Review Project Cost
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}

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
          {funding.requests.map((fundingEntry) => (
            <Link key={fundingEntry.request.id} to={`/admin/fund-requests/${fundingEntry.request.id}`} className="mt-1.5 inline-block text-[12px] font-semibold text-botanique-green hover:underline">
              {fundingEntry.request.requestNumber}
            </Link>
          ))}
        </div>
      )}

      {canCreate && alreadyClaimed && coveringClaim && (
        <p className="mt-2.5 border-t border-stone-100 pt-2.5 text-[11px] leading-snug text-gray-500">
          This day&rsquo;s planned cost is already covered by the Project Cost above.
        </p>
      )}
    </section>
  );
}
