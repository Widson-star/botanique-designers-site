// Finance — one stable shell destination with an in-page area selector.
//
// Architecture authority: docs/ui-authority/operations-hub/
// operating-model-authority/ (Founder-approved, merged PR #93 and PR #94).
// Finance is a top-level domain with INTERNAL departmental navigation. The
// working-authority image 13 draws persistent Finance children in the sidebar;
// that arrangement is deliberately NOT implemented, because the navigation
// decision post-dates it. Image 13 still governs what each child contains.
//
// Visual authority: 12-finance-overview-working-authority.png (Overview) and
// 13-finance-children-working-authority.png (the departmental surfaces).
//
// The department has five settled areas, in this order: Overview, Project
// Costs, Company Expenses, Staff Compensation, Funding Payments and
// Reconciliation. Two of them have no database, workflow or record behind them.
// They are NAMED here, because the architecture is settled and hiding them
// makes the department look smaller than it is — but they are drawn at the
// weight of an unbuilt area, carry no amount, and are not selectable, because
// selecting them would lead nowhere. Nothing on this page invents a Company
// Expenses or Staff Compensation figure.
//
// Neither built area is rebuilt or duplicated here. Each panel shows a compact,
// truthfully-derived position from records this role can already see, then
// drills through to the existing /admin/site-costs and /admin/fund-requests
// registers. Every amount comes from financePortfolio.js, which folds the same
// deriveFinancialPosition() rows the drill-through pages read, so the Overview
// can never disagree with the page behind it.
//
// Which area is selected is local shell state, not the URL — the same choice
// already made for which sidebar group is open.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useSiteCosts } from "../context/siteCosts";
import { useFundRequests } from "../context/fundRequests";
import { canSeeSiteCosts } from "../utils/siteCostCapabilities";
import { canSeeFundRequests, FUND_REQUEST_STATUSES } from "../utils/fundRequestCapabilities";
import { CUSTODY_DISPOSITIONS } from "../utils/fundReleaseCapabilities";
import {
  FINANCE_AREAS, financeAttention, portfolioPosition, requestPositions,
} from "../utils/financePortfolio";
import { formatKes } from "../utils/dailySiteFormatters";

const TONE = {
  attention: "text-amber-800",
  waiting: "text-gray-700",
};

function Metric({ label, value, hint, tone = "" }) {
  return (
    <div className="rounded-md bg-stone-50 px-3 py-2.5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-0.5 break-words text-base font-semibold tabular-nums ${tone || "text-botanique-charcoal"}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 break-words text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
}

function Panel({ title, action, children }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold text-botanique-charcoal">{title}</h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function AdminFinance() {
  const { role, projects } = useAdminData();
  const { claims, status: costsStatus } = useSiteCosts();
  const { requests, allocations, releases, acquittals, status: fundsStatus } = useFundRequests();
  const canCosts = canSeeSiteCosts(role);
  const canFunds = canSeeFundRequests(role);

  const finance = useMemo(
    () => ({ requests, allocations, releases, acquittals }),
    [requests, allocations, releases, acquittals]
  );

  // Only areas with a real model are selectable. The unbuilt two are still
  // listed in the department, below, where they cannot be mistaken for a route.
  const areas = useMemo(
    () =>
      FINANCE_AREAS.filter((area) => {
        if (area.unbuilt) return false;
        if (area.id === "project-costs") return canCosts;
        if (area.id === "funding") return canFunds;
        return canCosts || canFunds; // Overview needs at least one real area.
      }),
    [canCosts, canFunds]
  );

  const [selectedId, setSelectedId] = useState(areas[0]?.id);
  const active = areas.find((area) => area.id === selectedId) || areas[0];

  const portfolio = useMemo(() => portfolioPosition(finance), [finance]);
  const attention = useMemo(() => financeAttention(claims, finance, role), [claims, finance, role]);
  const positions = useMemo(() => requestPositions(finance), [finance]);
  const projectName = useMemo(
    () => Object.fromEntries(projects.map((project) => [project.id, project.projectName])),
    [projects]
  );

  if (!active) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-8">
        <h1 className="text-xl font-bold">Finance unavailable</h1>
        <p className="mt-2 text-sm text-gray-500">Your role does not have access to Finance.</p>
      </div>
    );
  }

  function select(id) {
    if (areas.some((area) => area.id === id)) setSelectedId(id);
  }

  const loading = costsStatus === "loading" || fundsStatus === "loading";

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Finance</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-600">
          All Botanique money-in and money-out records live here. Approval is authority to incur;
          a release is money that actually moved.
        </p>
      </div>

      {/* Desktop: one continuous segmented control, matching the authority. */}
      <div className="hidden rounded-lg bg-stone-100 p-1 sm:inline-flex" role="tablist" aria-label="Finance area">
        {areas.map((area) => (
          <button
            key={area.id}
            type="button"
            role="tab"
            aria-selected={area.id === active.id}
            onClick={() => select(area.id)}
            className={`min-h-9 rounded-md px-4 text-sm font-semibold transition ${
              area.id === active.id
                ? "bg-white text-botanique-charcoal shadow-sm"
                : "text-gray-600 hover:text-botanique-charcoal"
            }`}
          >
            {area.label}
          </button>
        ))}
      </div>

      {/* Mobile: wrapped chips that never require horizontal scrolling. */}
      <div className="flex flex-wrap gap-2 sm:hidden" role="tablist" aria-label="Finance area">
        {areas.map((area) => (
          <button
            key={area.id}
            type="button"
            role="tab"
            aria-selected={area.id === active.id}
            onClick={() => select(area.id)}
            className={`min-h-11 rounded-full px-4 text-sm font-semibold transition ${
              area.id === active.id ? "bg-botanique-green text-white" : "bg-stone-100 text-gray-600"
            }`}
          >
            {area.mobileLabel}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-gray-600">Loading the Finance position…</p>}

      {active.id === "overview" && (
        <OverviewArea
          portfolio={portfolio}
          attention={attention}
          canCosts={canCosts}
          canFunds={canFunds}
          onSelect={select}
        />
      )}

      {active.id === "project-costs" && (
        <ProjectCostsArea claims={claims} portfolio={portfolio} projectName={projectName} />
      )}

      {active.id === "funding" && (
        <FundingArea positions={positions} portfolio={portfolio} projectName={projectName} />
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Overview — authority image 12.
// ---------------------------------------------------------------------------

function OverviewArea({ portfolio, attention, canCosts, canFunds, onSelect }) {
  const unbuilt = FINANCE_AREAS.filter((area) => area.unbuilt);

  return (
    <div className="space-y-4">
      {/* 1. The portfolio money position, before any list. */}
      <Panel title="Money position across every project you can see">
        {portfolio.hasAnyAuthority ? (
          <>
            <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <Metric
                label="Authorised"
                value={formatKes(portfolio.authorisedAmount)}
                hint={portfolio.requestCount === 1 ? "1 approved authority" : `${portfolio.requestCount} approved authorities`}
              />
              <Metric label="Released" value={formatKes(portfolio.releasedAmount)} hint="Money that actually moved" />
              <Metric
                label="Actual expenditure"
                value={formatKes(portfolio.actualExpenditureAmount)}
                hint="Reconciled advance spend + direct payments"
              />
              <Metric
                label="Authorised, not released"
                value={formatKes(portfolio.unreleasedAmount)}
                tone={portfolio.unreleasedAmount > 0 ? TONE.attention : ""}
              />
            </dl>
            {portfolio.advanceOutstandingAmount > 0 && (
              <p className="mt-2.5 text-sm text-amber-800">
                {formatKes(portfolio.advanceOutstandingAmount)} of accountable advances has not been
                accounted for yet, so it is not counted as expenditure.
              </p>
            )}
            {portfolio.varianceAmount !== 0 && (
              <p className="mt-1 text-sm text-amber-800">
                {portfolio.varianceAmount > 0
                  ? `${formatKes(portfolio.varianceAmount)} released is neither spent nor returned.`
                  : `${formatKes(Math.abs(portfolio.varianceAmount))} was spent beyond the advances released.`}
              </p>
            )}
          </>
        ) : (
          // Zero data is not a blank canvas. It says what this area is, where the
          // position currently stands, and what would change it.
          <div>
            <p className="text-sm text-gray-600">
              No fund authority has been approved yet, so no money has been released and there is
              nothing to reconcile.
            </p>
            <p className="mt-1 text-sm text-gray-500">
              A position appears here once a cost claim is approved and a fund request against it is
              authorised.
            </p>
          </div>
        )}
      </Panel>

      {/* 2. What needs attention now. Not a second Approvals centre: Finance
          states its own financial attention and links to the register that owns
          each decision. */}
      <Panel title="What needs attention now">
        {attention.length === 0 ? (
          <p className="text-sm text-gray-600">
            Nothing financial is waiting on anyone. Every claim has been decided, every approved
            authority has been released, and every accountable advance has been accounted for.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {attention.map((item) => (
              <li key={item.key}>
                <Link
                  to={item.href}
                  className="flex min-h-11 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2.5 text-sm hover:underline"
                >
                  <span className="min-w-0 break-words font-medium text-botanique-green">
                    {item.label}
                  </span>
                  <span className={`shrink-0 tabular-nums ${TONE[item.tone] || ""}`}>
                    {item.count}
                    {item.amount > 0 ? ` · ${formatKes(item.amount)}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* 3. The department's areas. */}
      <div className="grid gap-3 sm:grid-cols-2">
        {canCosts && (
          <button
            type="button"
            onClick={() => onSelect("project-costs")}
            className="rounded-lg border border-stone-200 bg-white p-4 text-left transition hover:border-botanique-green"
          >
            <p className="text-sm font-semibold text-botanique-charcoal">Project Costs</p>
            <p className="mt-0.5 text-xs text-gray-500">Track and control project-related costs.</p>
            <p className="mt-2 text-sm font-semibold text-botanique-green">Open Project Costs →</p>
          </button>
        )}
        {canFunds && (
          <button
            type="button"
            onClick={() => onSelect("funding")}
            className="rounded-lg border border-stone-200 bg-white p-4 text-left transition hover:border-botanique-green"
          >
            <p className="text-sm font-semibold text-botanique-charcoal">
              Funding, Payments and Reconciliation
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              Authority to fund, money actually released, and what became of it.
            </p>
            <p className="mt-2 text-sm font-semibold text-botanique-green">Open Funding →</p>
          </button>
        )}
      </div>

      {/* 4. The rest of the settled department, named but never drawn at the
          weight of something that exists. No amounts, because there is no model
          to take an amount from. */}
      {unbuilt.length > 0 && (
        <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Also part of Finance, not yet built
          </p>
          <ul className="mt-1.5 space-y-1">
            {unbuilt.map((area) => (
              <li key={area.id} className="text-sm text-gray-600">
                <span className="font-medium text-botanique-charcoal">{area.label}</span> —{" "}
                {area.description} No records, workflow or figures exist for it yet.
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Project Costs — authority image 13, panel 1.
// ---------------------------------------------------------------------------

function ProjectCostsArea({ claims, portfolio, projectName }) {
  const byLifecycle = (lifecycle) => claims.filter((claim) => claim.lifecycle === lifecycle);
  const awaiting = byLifecycle("awaiting_review");
  const approved = byLifecycle("approved");
  const amendment = byLifecycle("amendment_requested");
  const total = (rows, pick) => rows.reduce((sum, claim) => sum + Number(pick(claim) || 0), 0);
  const recent = [...claims]
    .sort((left, right) => String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")))
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <Panel
        title="Project cost claims"
        action={
          <Link to="/admin/site-costs" className="text-sm font-semibold text-botanique-green hover:underline">
            View all →
          </Link>
        }
      >
        {claims.length === 0 ? (
          <div>
            <p className="text-sm text-gray-600">
              No project cost has been claimed yet. A claim is raised deliberately from an accepted
              Daily Site Record, or directly here.
            </p>
            <Link
              to="/admin/site-costs"
              className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-botanique-green hover:underline"
            >
              Go to Project Costs →
            </Link>
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <Metric
                label="Approved"
                value={formatKes(total(approved, (claim) => claim.approvedTotal ?? claim.submittedTotal))}
                hint={`${approved.length} ${approved.length === 1 ? "claim" : "claims"}`}
              />
              <Metric
                label="Awaiting review"
                value={formatKes(total(awaiting, (claim) => claim.submittedTotal))}
                hint={`${awaiting.length} ${awaiting.length === 1 ? "claim" : "claims"}`}
                tone={awaiting.length > 0 ? TONE.attention : ""}
              />
              <Metric
                label="Sent back"
                value={String(amendment.length)}
                hint="Amendment requested"
              />
              {/* The claim total is authority to incur. The money figures beside
                  it are the whole portfolio's, and are labelled as such. */}
              <Metric
                label="Actually released"
                value={formatKes(portfolio.releasedAmount)}
                hint="Across all fund authorities"
              />
            </dl>
            <ul className="mt-3 divide-y divide-stone-100 border-t border-stone-100">
              {recent.map((claim) => (
                <li key={claim.id} className="py-2.5">
                  <Link
                    to={`/admin/site-costs/${claim.id}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm font-semibold text-botanique-green hover:underline"
                  >
                    <span className="min-w-0 break-words">
                      {projectName[claim.projectId] || "Project"}
                    </span>
                    <span className="shrink-0 tabular-nums text-botanique-charcoal">
                      {formatKes(claim.approvedTotal ?? claim.submittedTotal)}
                    </span>
                  </Link>
                  <p className="mt-0.5 break-words text-xs text-gray-500">
                    {claim.recipientLabel || "Cost claim"} · {LIFECYCLE_LABEL[claim.lifecycle] || claim.lifecycle}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </div>
  );
}

const LIFECYCLE_LABEL = {
  draft: "Draft",
  awaiting_review: "Awaiting review",
  amendment_requested: "Amendment requested",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  cancelled: "Cancelled",
};

// ---------------------------------------------------------------------------
// Funding, Payments and Reconciliation — authority image 13, panel 4.
//
// The canonical name is used throughout. "Fund Requests" survives only as an
// internal route, because renaming a URL would break every existing drill-
// through link and grants nothing.
// ---------------------------------------------------------------------------

function FundingArea({ positions, portfolio, projectName }) {
  const approved = positions.filter((row) => row.request.status === "approved");
  const submitted = positions.filter((row) => row.request.status === "submitted");
  const outstanding = approved.filter((row) => row.position.reconciliationState === "outstanding");
  const recent = [...positions]
    .sort((left, right) =>
      String(right.request.updatedAt || "").localeCompare(String(left.request.updatedAt || "")))
    .slice(0, 6);

  return (
    <div className="space-y-4">
      <Panel
        title="Funding, Payments and Reconciliation"
        action={
          <Link to="/admin/fund-requests" className="text-sm font-semibold text-botanique-green hover:underline">
            View all →
          </Link>
        }
      >
        {positions.length === 0 ? (
          <div>
            <p className="text-sm text-gray-600">
              No fund request has been raised yet. A request asks the Principal to authorise money
              against approved cost claims; approval is not payment, and a release is recorded
              separately when money actually moves.
            </p>
            <Link
              to="/admin/fund-requests"
              className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-botanique-green hover:underline"
            >
              Go to Funding, Payments and Reconciliation →
            </Link>
          </div>
        ) : (
          <>
            {/* The lifecycle, in order, without ever implying approval is
                release. */}
            <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <Metric
                label="Awaiting decision"
                value={String(submitted.length)}
                hint="Requests submitted"
              />
              <Metric
                label="Authorised"
                value={formatKes(portfolio.authorisedAmount)}
                hint={`${approved.length} approved ${approved.length === 1 ? "authority" : "authorities"}`}
              />
              <Metric
                label="Released"
                value={formatKes(portfolio.releasedAmount)}
                hint="Money that actually moved"
              />
              <Metric
                label="Reconciliation outstanding"
                value={formatKes(portfolio.advanceOutstandingAmount)}
                hint={`${outstanding.length} ${outstanding.length === 1 ? "advance" : "advances"}`}
                tone={outstanding.length > 0 ? TONE.attention : ""}
              />
            </dl>

            <ul className="mt-3 divide-y divide-stone-100 border-t border-stone-100">
              {recent.map(({ request, position }) => (
                <li key={request.id} className="py-2.5">
                  <Link
                    to={`/admin/fund-requests/${request.id}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm font-semibold text-botanique-green hover:underline"
                  >
                    <span className="min-w-0 break-words">{request.requestNumber}</span>
                    <span className="shrink-0 tabular-nums text-botanique-charcoal">
                      {formatKes(request.totalRequestedAmount)}
                    </span>
                  </Link>
                  <p className="mt-0.5 break-words text-xs text-gray-500">
                    {projectName[request.projectId] || "Project"} ·{" "}
                    {FUND_REQUEST_STATUSES[request.status]}
                    {request.status === "approved" &&
                      ` · ${formatKes(position.releasedAmount)} released`}
                  </p>
                  {/* Custody is a property of each release, not of the whole
                      authority: one authority may carry a direct settled payment
                      AND an accountable advance, and flattening the two would
                      manufacture — or erase — a reconciliation obligation. */}
                  {request.status === "approved" && position.releaseCount > 0 && (
                    <p className="mt-0.5 flex flex-wrap gap-1.5">
                      {position.directPaidAmount > 0 && (
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-gray-700">
                          {CUSTODY_DISPOSITIONS.direct_recipient_funding}{" "}
                          {formatKes(position.directPaidAmount)}
                        </span>
                      )}
                      {position.advanceReleasedAmount > 0 && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] ${
                            position.reconciliationState === "outstanding"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-stone-100 text-gray-700"
                          }`}
                        >
                          {CUSTODY_DISPOSITIONS.operations_manager_accountable_advance}{" "}
                          {formatKes(position.advanceReleasedAmount)}
                        </span>
                      )}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </div>
  );
}
