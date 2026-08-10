import { Link } from "react-router-dom";
import { SITE_COST_LIFECYCLES } from "../../utils/siteCostCapabilities";
import { formatKes } from "../../utils/dailySiteFormatters";
import { fundingNextAction } from "../../utils/claimFunding";
import { RECONCILIATION_STATES } from "../../utils/fundReleaseCapabilities";
import { FUNDING_POSITIONS } from "../../utils/claimFunding";
import { Chip, Disc, Glyph } from "../ui/Surfaces";

// The financial follow-up area of the Daily Site Record.
//
// FIDELITY CORRECTION, 10 August 2026. This used to be a full-width section
// below the record, carrying a nested funding panel with its own four-figure
// metric grid — which is why the Founder's review found the page reading as
// "financial follow-up looking like a separate application pasted underneath".
//
// It is now a COLUMN CARD: a position, the claims, the money in one line each,
// and a way through. The Daily Site Record is an operational record, so finance
// sits beside it as a summary and a link, never beneath it as a second ledger.
//
// Nothing here creates a claim, a payment, a release or a reconciliation. The
// only write path offered is a link the reader must choose to follow, and the
// PR #100 duplicate-claim safeguard is unchanged: where this day's own planning
// cost is already claimed, opening that claim is the primary action and raising
// an additional cost stays available but deliberate.
export default function FinancialFollowUp({ position, entryId }) {
  if (!position) return null;
  const { label, detail, needsAttention, canCreate, claims, funding, duplicateRisk } = position;
  const alreadyClaimed = Boolean(duplicateRisk?.planningCostAlreadyClaimed);
  const coveringClaim = duplicateRisk?.coveringClaims?.[0] || null;
  const nextAction = funding ? fundingNextAction(funding) : null;

  return (
    <section
      aria-labelledby="dse-financial-follow-up"
      className="rounded-xl border border-stone-200 bg-white"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5 border-b border-stone-100 px-3.5 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Disc name="money" tone={needsAttention ? "waiting" : "brand"} size="h-7 w-7" />
          <div className="min-w-0">
            <h2 id="dse-financial-follow-up" className="text-[13px] font-semibold text-botanique-charcoal">
              Financial follow-up
            </h2>
            <p className="truncate text-[11px] text-gray-500">{label}</p>
          </div>
        </div>
      </div>

      <div className="px-3.5 py-3">
        <p className="text-[12px] leading-snug text-gray-600">{detail}</p>

        {claims.length > 0 && (
          <ul className="mt-2.5 divide-y divide-stone-100 border-t border-stone-100">
            {claims.map((claim) => (
              <li key={claim.id} className="py-2">
                <Link
                  to={`/admin/site-costs/${claim.id}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-2.5 gap-y-0.5 text-[12.5px] font-semibold text-botanique-green hover:underline"
                >
                  <span className="min-w-0 break-words">{claim.recipientLabel || "Cost claim"}</span>
                  <span className="shrink-0 tabular-nums text-botanique-charcoal">
                    {formatKes(claim.approvedTotal ?? claim.submittedTotal)}
                  </span>
                </Link>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  {SITE_COST_LIFECYCLES[claim.lifecycle] || "Cost claim"}
                  {claim.linkedToEntry ? " · raised from this record" : " · same project and day"}
                </p>
              </li>
            ))}
          </ul>
        )}

        {/* The money, one line per dimension. Both are named whenever both say
            something, so a funding label can never conceal an unaccounted
            advance. The fund request owns the full ledger; this is a summary. */}
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
            <dl className="mt-2 space-y-1 text-[11.5px]">
              <Row label="Authorised" value={formatKes(funding.authorisedAmount)} />
              <Row label="Released" value={formatKes(funding.releasedAmount)} />
              <Row
                label="Not released"
                value={formatKes(funding.remainingUnreleasedAmount)}
                tone={funding.remainingUnreleasedAmount > 0 ? "text-amber-800" : ""}
              />
              <Row label="Actual spend" value={formatKes(funding.actualExpenditureAmount)} />
            </dl>
            {funding.requests.map((entry) => (
              <Link
                key={entry.request.id}
                to={`/admin/fund-requests/${entry.request.id}`}
                className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-botanique-green hover:underline"
              >
                {entry.request.requestNumber}
                <Glyph name="arrow" className="h-3 w-3" />
              </Link>
            ))}
          </div>
        )}

        {/* PR #100 duplicate safeguard, unchanged. */}
        {alreadyClaimed && (
          <p className="mt-2.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11.5px] leading-snug text-amber-950">
            This day's site labour has already been claimed
            {coveringClaim ? ` (${formatKes(coveringClaim.approvedTotal ?? coveringClaim.submittedTotal)})` : ""}.
            Open that claim rather than raising it a second time.
          </p>
        )}

        {nextAction && (
          <p className="mt-2.5 text-[11.5px] leading-snug text-gray-700">{nextAction}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-2.5">
          {alreadyClaimed && coveringClaim && (
            <Link
              to={`/admin/site-costs/${coveringClaim.id}`}
              className="inline-flex min-h-9 items-center rounded-lg bg-botanique-green px-3 text-[12px] font-semibold text-white hover:bg-botanique-dark"
            >
              Open existing claim
            </Link>
          )}
          {canCreate && (
            <Link
              to={`/admin/site-costs/new?dailySiteEntryId=${encodeURIComponent(entryId)}${alreadyClaimed ? "&additional=1" : ""}`}
              className={alreadyClaimed
                ? "min-h-9 py-1.5 text-[12px] font-medium text-botanique-green hover:underline"
                : "inline-flex min-h-9 items-center rounded-lg border border-botanique-green px-3 text-[12px] font-semibold text-botanique-green hover:bg-[#edf2ef]"}
            >
              {alreadyClaimed
                ? "Raise additional cost"
                : claims.length > 0 ? "Create another cost claim" : "Create cost claim"}
            </Link>
          )}
          <Link
            to="/admin/site-costs"
            className="inline-flex min-h-9 items-center gap-1 py-1.5 text-[12px] font-medium text-botanique-green hover:underline"
          >
            Project Costs
            <Glyph name="arrow" className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value, tone = "" }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-gray-500">{label}</dt>
      <dd className={`shrink-0 font-semibold tabular-nums ${tone || "text-botanique-charcoal"}`}>{value}</dd>
    </div>
  );
}
