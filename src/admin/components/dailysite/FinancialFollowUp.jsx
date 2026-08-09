import { Link } from "react-router-dom";
import { SITE_COST_LIFECYCLES } from "../../utils/siteCostCapabilities";
import { formatKes } from "../../utils/dailySiteFormatters";
import FundingPositionPanel from "../finance/FundingPositionPanel";

// The financial follow-up area of the Daily Site Record.
//
// It is deliberately compact: a position, a next action and a drill-through.
// The cost-claim module stays authoritative for the claim record, its lines and
// its decision history, and the fund request stays authoritative for every
// release, reconciliation and expenditure line, so none of that is duplicated
// here — a summary and a way through, never a second ledger. Nothing in this
// component creates a claim, a payment, a release or a reconciliation; the only
// write path offered is a link the reader must choose to follow.
export default function FinancialFollowUp({ position, entryId }) {
  if (!position) return null;
  const { label, detail, needsAttention, canCreate, claims, funding, duplicateRisk } = position;
  const alreadyClaimed = Boolean(duplicateRisk?.planningCostAlreadyClaimed);
  const coveringClaim = duplicateRisk?.coveringClaims?.[0] || null;

  return (
    <section
      aria-labelledby="dse-financial-follow-up"
      className="rounded-lg border border-stone-200 bg-white p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="dse-financial-follow-up" className="text-base font-semibold">
          Financial follow-up
        </h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            needsAttention ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-gray-600"
          }`}
        >
          {label}
        </span>
      </div>
      <p className="mt-1.5 text-sm text-gray-600">{detail}</p>

      {claims.length > 0 && (
        <ul className="mt-3 divide-y divide-stone-100 border-t border-stone-100">
          {claims.map((claim) => (
            <li key={claim.id} className="py-2.5">
              <Link
                to={`/admin/site-costs/${claim.id}`}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm font-semibold text-botanique-green hover:underline"
              >
                <span className="min-w-0 break-words">{claim.recipientLabel || "Cost claim"}</span>
                <span className="shrink-0 tabular-nums text-botanique-charcoal">
                  {formatKes(claim.approvedTotal ?? claim.submittedTotal)}
                </span>
              </Link>
              <p className="mt-0.5 text-xs text-gray-500">
                {SITE_COST_LIFECYCLES[claim.lifecycle] || "Cost claim"}
                {claim.linkedToEntry ? " · raised from this record" : " · same project and day"}
              </p>
            </li>
          ))}
        </ul>
      )}

      {funding && (
        <div className="mt-3">
          <FundingPositionPanel funding={funding} headingId="dse-funding-position" />
        </div>
      )}

      {/* This day's own planning cost has already been claimed. Raising it again is the
          accidental double-claim found in the hosted walkthrough, so the existing claim
          becomes the primary action and the additional-cost path stays available but
          deliberate. Nothing is blocked. */}
      {alreadyClaimed && (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          This day's site labour has already been claimed
          {coveringClaim ? ` (${formatKes(coveringClaim.approvedTotal ?? coveringClaim.submittedTotal)})` : ""}.
          Open that claim rather than raising it a second time.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-stone-100 pt-3">
        {alreadyClaimed && coveringClaim && (
          <Link
            to={`/admin/site-costs/${coveringClaim.id}`}
            className="inline-flex min-h-11 items-center rounded-md bg-botanique-green px-4 text-sm font-semibold text-white hover:bg-botanique-dark"
          >
            Open existing claim
          </Link>
        )}
        {canCreate && (
          <Link
            to={`/admin/site-costs/new?dailySiteEntryId=${encodeURIComponent(entryId)}${alreadyClaimed ? "&additional=1" : ""}`}
            className={alreadyClaimed
              ? "min-h-11 py-2 text-sm font-medium text-botanique-green hover:underline"
              : "inline-flex min-h-11 items-center rounded-md border border-botanique-green px-4 text-sm font-semibold text-botanique-green hover:bg-[#edf2ef]"}
          >
            {alreadyClaimed
              ? "Raise additional cost"
              : claims.length > 0 ? "Create another cost claim" : "Create cost claim"}
          </Link>
        )}
        <Link
          to="/admin/site-costs"
          className="min-h-11 py-2 text-sm font-medium text-botanique-green hover:underline"
        >
          Go to Project Costs
        </Link>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Project costs normally move into a claim by 4:00 pm and the Principal decides in Project
        Costs. The day can close operationally while the financial follow-up is still outstanding.
        Releases and reconciliations are recorded on the fund request the claim is allocated to
        and only summarised here.
      </p>
    </section>
  );
}
