import { Link } from "react-router-dom";
import { formatKes } from "../../utils/dailySiteFormatters";
import { FUND_REQUEST_STATUSES } from "../../utils/fundRequestCapabilities";
import {
  FUNDING_POSITIONS, fundingNextAction, RECONCILIATION_STATES,
} from "../../utils/claimFunding";

// The funding and reconciliation position of whatever cost is being read, in the
// smallest honest form: two independent dimensions, the amounts that reinforce
// them, and a way through to the authority that owns each one.
//
// It is deliberately NOT a ledger. Nothing here records a release, reconciles an
// advance, edits an expenditure line, reverses a payment or decides anything —
// every one of those lives on the fund request, and the only route offered to
// them is a link the reader chooses to follow.

const AMOUNT_CELL = "rounded-md bg-stone-50 px-3 py-2";

function Amount({ label, value, hint, tone = "" }) {
  return (
    <div className={AMOUNT_CELL}>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className={`mt-0.5 break-words text-sm font-semibold tabular-nums ${tone || "text-botanique-charcoal"}`}>
        {formatKes(value)}
      </dd>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function Chip({ label, tone }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}

const FUNDING_TONE = {
  not_requested: "bg-stone-100 text-gray-600",
  awaiting_authority: "bg-stone-100 text-gray-600",
  unpaid: "bg-stone-100 text-gray-700",
  partially_funded: "bg-amber-100 text-amber-800",
  fully_funded: "bg-emerald-100 text-emerald-800",
};

const RECONCILIATION_TONE = {
  not_required: "bg-stone-100 text-gray-600",
  outstanding: "bg-amber-100 text-amber-800",
  submitted: "bg-sky-100 text-sky-900",
  amendment_requested: "bg-amber-100 text-amber-800",
  accepted: "bg-emerald-100 text-emerald-800",
};

export default function FundingPositionPanel({ funding, headingId, heading = "Funding and reconciliation" }) {
  if (!funding) return null;
  const {
    requests, fundingPosition, fundingDetail, reconciliationPosition, reconciliationDetail,
    reconciliationApplies, authorisedAmount, releasedAmount, remainingUnreleasedAmount,
    actualExpenditureAmount, varianceAmount, advanceReleasedAmount, directPaidAmount,
    releaseCount, reversedReleaseCount, settled,
  } = funding;
  const nextAction = fundingNextAction(funding);
  const hasAuthority = requests.some((entry) => entry.request.status === "approved");

  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5">
        <h3 id={headingId} className="text-sm font-semibold text-botanique-charcoal">{heading}</h3>
        <div className="flex flex-wrap gap-1.5">
          <Chip label={FUNDING_POSITIONS[fundingPosition]} tone={FUNDING_TONE[fundingPosition]} />
          {/* The two dimensions are shown side by side precisely so that neither
              conceals the other: partly funded AND unreconciled is one position. */}
          {reconciliationApplies && (
            <Chip
              label={RECONCILIATION_STATES[reconciliationPosition]}
              tone={RECONCILIATION_TONE[reconciliationPosition]}
            />
          )}
        </div>
      </div>

      <p className="mt-1.5 text-sm text-gray-600">{fundingDetail}</p>
      {reconciliationApplies && <p className="mt-1 text-sm text-gray-600">{reconciliationDetail}</p>}
      {settled && (
        <p className="mt-1 text-sm font-medium text-emerald-800">
          The financial workflow for this cost is complete.
        </p>
      )}

      {hasAuthority && (
        <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Amount label="Authorised" value={authorisedAmount} />
          <Amount
            label="Released"
            value={releasedAmount}
            hint={releaseCount === 1 ? "1 release" : `${releaseCount} releases`}
          />
          <Amount
            label="Unreleased"
            value={remainingUnreleasedAmount}
            tone={remainingUnreleasedAmount > 0 ? "text-amber-800" : ""}
          />
          <Amount
            label="Actual spend"
            value={actualExpenditureAmount}
            hint={advanceReleasedAmount > 0 && directPaidAmount > 0
              ? "Advance spend + direct payments"
              : advanceReleasedAmount > 0 ? "From reconciliation" : "Direct settled payments"}
          />
        </dl>
      )}

      {/* Variance exists only for an accountable advance that has been accounted
          for. A direct settled payment never shows a fictional shortfall. */}
      {reconciliationApplies && varianceAmount !== 0 && (
        <p className={`mt-2 text-sm font-medium ${varianceAmount > 0 ? "text-amber-800" : "text-red-800"}`}>
          {varianceAmount > 0
            ? `${formatKes(varianceAmount)} released is neither spent nor returned.`
            : `${formatKes(Math.abs(varianceAmount))} was spent beyond the advance and is still owed back.`}
        </p>
      )}

      {reversedReleaseCount > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          {reversedReleaseCount === 1 ? "One release was" : `${reversedReleaseCount} releases were`} reversed
          and {reversedReleaseCount === 1 ? "holds" : "hold"} no money. The original record stays readable
          on the fund request.
        </p>
      )}

      {requests.length > 0 && (
        <ul className="mt-3 divide-y divide-stone-100 border-t border-stone-100">
          {requests.map((entry) => (
            <li key={entry.request.id} className="py-2.5">
              <Link
                to={`/admin/fund-requests/${entry.request.id}`}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm font-semibold text-botanique-green hover:underline"
              >
                <span className="min-w-0 break-words">{entry.request.requestNumber}</span>
                <span className="shrink-0 tabular-nums text-botanique-charcoal">
                  {formatKes(entry.allocatedAmount)}
                </span>
              </Link>
              <p className="mt-0.5 text-xs text-gray-500">
                {FUND_REQUEST_STATUSES[entry.request.status]}
                {entry.request.status === "approved" && ` · ${formatKes(entry.position.releasedAmount)} released of ${formatKes(entry.position.authorisedAmount)}`}
                {/* The request's amounts are the request's. Saying so stops the
                    reader reading a shared authority as this cost's own money. */}
                {entry.coversOtherClaims && " · this authority also funds other claims"}
              </p>
            </li>
          ))}
        </ul>
      )}

      {nextAction && (
        <p className="mt-3 border-t border-stone-100 pt-3 text-sm text-gray-700">{nextAction}</p>
      )}
    </div>
  );
}
