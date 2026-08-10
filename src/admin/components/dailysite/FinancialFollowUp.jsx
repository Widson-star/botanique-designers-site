import { Link } from "react-router-dom";
import { SITE_COST_LIFECYCLES } from "../../utils/siteCostCapabilities";
import { formatKes } from "../../utils/dailySiteFormatters";
import { FUNDING_POSITIONS } from "../../utils/claimFunding";
import { RECONCILIATION_STATES } from "../../utils/fundReleaseCapabilities";
import { Chip } from "../ui/Surfaces";

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
export default function FinancialFollowUp({ position }) {
  if (!position) return null;
  const { canCreate, claims, funding, duplicateRisk } = position;
  const alreadyClaimed = Boolean(duplicateRisk?.planningCostAlreadyClaimed);
  const coveringClaim = duplicateRisk?.coveringClaims?.[0] || null;

  return (
    <section aria-label="Financial follow-up" className="border-t border-stone-100 px-4 py-3.5">
      <h3 className="text-[12.5px] font-semibold text-botanique-charcoal">
        {claims.length > 1 ? `${claims.length} related cost claims` : "Related cost claim"}
      </h3>

      {claims.length === 0 ? (
        <>
          <p className="mt-1 text-[12.5px] font-medium text-gray-600">{position.label}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-gray-500">{position.detail}</p>
        </>
      ) : (
        <ul className="mt-2 space-y-2">
          {claims.map((claim) => (
            <li key={claim.id}>
              <Link
                to={`/admin/site-costs/${claim.id}`}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 hover:underline"
              >
                <span className="min-w-0 break-words text-[12.5px] font-semibold text-botanique-green">
                  {claim.recipientLabel || "Cost claim"}
                </span>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums text-botanique-charcoal">
                  {formatKes(claim.approvedTotal ?? claim.submittedTotal)}
                </span>
              </Link>
              <div className="mt-1">
                <Chip tone={claim.lifecycle === "approved" ? "settled" : claim.lifecycle === "awaiting_review" ? "waiting" : "neutral"}>
                  {SITE_COST_LIFECYCLES[claim.lifecycle] || "Cost claim"}
                </Chip>
              </div>
            </li>
          ))}
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
