// Finance — one stable shell destination with an in-page area selector.
//
// Architecture authority: docs/ui-authority/operations-hub/
// operating-model-authority/ (PR #93, PR #94). Finance is a top-level domain
// with INTERNAL departmental navigation. Working-authority image 13 draws
// persistent Finance children in the sidebar; that arrangement is deliberately
// NOT implemented, because the navigation decision post-dates it. Image 13
// still governs what each child contains.
//
// Visual authority: 12-finance-overview-working-authority.png (Overview) and
// 13-finance-children-working-authority.png (the departmental surfaces).
//
// FIDELITY CORRECTION, 10 August 2026. The first implementation was truthful
// but skeletal: heading → tabs → a large panel explaining that no money had
// moved → a large panel explaining that nothing needed attention → two module
// cards → a dashed block for the two unbuilt areas. Five stacked rectangles,
// mostly sentences, with the emptiest regions taking the most space. The
// Founder's review rejected it as not yet a Finance command surface.
//
// Four structural changes, all visible:
//
//   1. THE DEPARTMENT ROW IS BACK. The authority's signature region — one card
//      per Finance area, each with its own icon and its own headline figure —
//      was missing entirely. It is the first thing on the page now, and it is
//      what makes this read as a department rather than a report.
//   2. POSITION AND ATTENTION SIT SIDE BY SIDE, not stacked. Finance answers
//      two questions — where does the money stand, and what is waiting — and
//      they belong on one screen, not one above the other.
//   3. ABSENCE IS ONE LINE. A zero position and an empty attention list are now
//      single lines inside their panels. Nothing empty is allowed to occupy a
//      full-width panel while something real is pushed below the fold.
//   4. THE UNBUILT AREAS LOST THEIR DASHED BLOCK. Company Expenses and Staff
//      Compensation appear in the department row at the weight of a capability
//      that does not exist: muted, no figure, not clickable. Truthful, and
//      unable to out-shout an area that works.
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
import {
  Chip, Disc, EmptyLine, Glyph, Metric, MetricBand, Panel,
} from "../components/ui/Surfaces";

const AREA_ICON = {
  overview: "spark",
  "project-costs": "site",
  "company-expenses": "doc",
  "staff-compensation": "people",
  funding: "wallet",
};

const LIFECYCLE_LABEL = {
  draft: "Draft",
  awaiting_review: "Awaiting review",
  amendment_requested: "Amendment requested",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  cancelled: "Cancelled",
};

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

  // Only areas with a real model are selectable. The unbuilt two still appear
  // in the department row, where they cannot be mistaken for a route.
  const areas = useMemo(
    () =>
      FINANCE_AREAS.filter((area) => {
        if (area.unbuilt) return false;
        if (area.id === "project-costs") return canCosts;
        if (area.id === "funding") return canFunds;
        return canCosts || canFunds;
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
      <div className="rounded-xl border border-stone-200 bg-white p-8">
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
    <section className="space-y-3.5">
      <div>
        <h1 className="text-[22px] font-semibold leading-tight">Finance</h1>
        <p className="mt-0.5 max-w-2xl text-[13px] text-gray-600">
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
            className={`min-h-9 rounded-md px-3.5 text-[12.5px] font-semibold transition ${
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
            className={`min-h-10 rounded-full px-3.5 text-[12.5px] font-semibold transition ${
              area.id === active.id ? "bg-botanique-green text-white" : "bg-stone-100 text-gray-600"
            }`}
          >
            {area.mobileLabel}
          </button>
        ))}
      </div>

      {loading && <p className="text-[13px] text-gray-600">Loading the Finance position…</p>}

      {active.id === "overview" && (
        <OverviewArea
          portfolio={portfolio}
          attention={attention}
          claims={claims}
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
// The department row — authority image 12's signature region.
// ---------------------------------------------------------------------------

function AreaCard({ area, metric, hint, tone = "brand", onOpen }) {
  const body = (
    <>
      <div className="flex items-start gap-2.5">
        <Disc name={AREA_ICON[area.id]} tone={area.unbuilt ? "unbuilt" : tone} size="h-8 w-8" />
        <div className="min-w-0">
          <p className={`text-[13px] font-semibold leading-tight ${area.unbuilt ? "text-gray-500" : "text-botanique-charcoal"}`}>
            {area.label}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-gray-500">{area.description}</p>
        </div>
      </div>
      <div className="mt-3">
        {area.unbuilt ? (
          // No model, so no figure — and deliberately the quietest thing on the
          // page, so an unbuilt area can never out-shout one that works.
          <p className="text-[11.5px] font-medium text-gray-400">Not yet built</p>
        ) : (
          <>
            <p className="break-words text-[19px] font-semibold leading-tight tabular-nums text-botanique-charcoal">
              {metric}
            </p>
            <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-500">{hint}</p>
          </>
        )}
      </div>
    </>
  );

  if (area.unbuilt) {
    return (
      <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/60 p-3.5">{body}</div>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-xl border border-stone-200 bg-white p-3.5 text-left transition hover:border-botanique-green hover:shadow-sm"
    >
      {body}
      <p className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-botanique-green">
        Open <Glyph name="arrow" className="h-3 w-3" />
      </p>
    </button>
  );
}

function OverviewArea({ portfolio, attention, claims, canCosts, canFunds, onSelect }) {
  const awaiting = claims.filter((claim) => claim.lifecycle === "awaiting_review");
  const approvedClaims = claims.filter((claim) => claim.lifecycle === "approved");
  const approvedTotal = approvedClaims.reduce(
    (sum, claim) => sum + Number(claim.approvedTotal ?? claim.submittedTotal ?? 0), 0
  );

  const cards = FINANCE_AREAS.filter((area) => {
    if (area.id === "overview") return false;
    if (area.id === "project-costs") return canCosts;
    if (area.id === "funding") return canFunds;
    return true; // the two unbuilt areas are always named
  });

  const metricFor = (area) => {
    if (area.id === "project-costs") {
      return {
        metric: claims.length ? formatKes(approvedTotal) : "No claims yet",
        hint: claims.length
          ? `${approvedClaims.length} approved · ${awaiting.length} awaiting review`
          : "Raised from an accepted site record",
        tone: awaiting.length > 0 ? "waiting" : "brand",
      };
    }
    return {
      metric: portfolio.hasAnyAuthority ? formatKes(portfolio.releasedAmount) : "Nothing released",
      hint: portfolio.hasAnyAuthority
        ? `of ${formatKes(portfolio.authorisedAmount)} authorised`
        : "No fund authority approved yet",
      tone: portfolio.advanceOutstandingAmount > 0 ? "waiting" : "brand",
    };
  };

  return (
    <div className="space-y-3.5">
      {/* 1. The department, one card per area. */}
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((area) => {
          const { metric, hint, tone } = area.unbuilt ? {} : metricFor(area);
          return (
            <AreaCard
              key={area.id}
              area={area}
              metric={metric}
              hint={hint}
              tone={tone}
              onOpen={() => onSelect(area.id)}
            />
          );
        })}
      </div>

      {/* 2. Position and attention, side by side. */}
      <div className="grid gap-2.5 lg:grid-cols-5">
        <Panel
          icon="scale"
          title="Money position"
          subtitle="Across every project you can see"
          className="lg:col-span-3"
        >
          {portfolio.hasAnyAuthority ? (
            <>
              <MetricBand columns={4}>
                <Metric
                  icon="doc" label="Authorised" value={formatKes(portfolio.authorisedAmount)}
                  hint={portfolio.requestCount === 1 ? "1 approved authority" : `${portfolio.requestCount} approved authorities`}
                />
                <Metric
                  icon="send" label="Released" value={formatKes(portfolio.releasedAmount)}
                  hint="Money that actually moved"
                />
                <Metric
                  icon="money" label="Actual spend" value={formatKes(portfolio.actualExpenditureAmount)}
                  hint="Reconciled advances + direct payments"
                />
                <Metric
                  icon="clock" label="Not released" value={formatKes(portfolio.unreleasedAmount)}
                  tone={portfolio.unreleasedAmount > 0 ? "waiting" : "neutral"}
                  hint="Authorised, still unreleased"
                />
              </MetricBand>
              {(portfolio.advanceOutstandingAmount > 0 || portfolio.varianceAmount !== 0) && (
                <div className="mt-3 space-y-1 border-t border-stone-100 pt-2.5">
                  {portfolio.advanceOutstandingAmount > 0 && (
                    <p className="text-[12px] text-amber-800">
                      {formatKes(portfolio.advanceOutstandingAmount)} of accountable advances has not
                      been accounted for, so it is not counted as spend.
                    </p>
                  )}
                  {portfolio.varianceAmount !== 0 && (
                    <p className="text-[12px] text-amber-800">
                      {portfolio.varianceAmount > 0
                        ? `${formatKes(portfolio.varianceAmount)} released is neither spent nor returned.`
                        : `${formatKes(Math.abs(portfolio.varianceAmount))} was spent beyond the advances released.`}
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            // Zero position is one line, never a full panel of explanation.
            <EmptyLine icon="wallet">
              No fund authority is approved, so nothing has been released and nothing is owed an
              account. A position appears here once a claim is approved and funded.
            </EmptyLine>
          )}
        </Panel>

        <Panel
          icon="alert"
          title="Needs attention"
          subtitle={attention.length ? `${attention.length} ${attention.length === 1 ? "item" : "items"}` : "Nothing outstanding"}
          tone={attention.length ? "waiting" : "settled"}
          className="lg:col-span-2"
        >
          {attention.length === 0 ? (
            <EmptyLine icon="check">
              Every claim has been decided, every approved authority released, and every accountable
              advance accounted for.
            </EmptyLine>
          ) : (
            <ul className="-my-1 divide-y divide-stone-100">
              {attention.map((item) => (
                <li key={item.key}>
                  <Link
                    to={item.href}
                    className="flex min-h-11 items-center gap-2.5 py-2 transition hover:bg-stone-50"
                  >
                    <span
                      className={`flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
                        item.tone === "attention" ? "bg-amber-100 text-amber-900" : "bg-stone-100 text-gray-600"
                      }`}
                    >
                      {item.count}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-[12.5px] font-medium leading-snug text-botanique-charcoal">
                        {item.label}
                      </span>
                      {item.amount > 0 && (
                        <span className="block text-[11px] tabular-nums text-gray-500">{formatKes(item.amount)}</span>
                      )}
                    </span>
                    <Glyph name="arrow" className="h-3.5 w-3.5 shrink-0 text-botanique-green" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {/* Finance states its own financial attention. It decides nothing:
              unified Approvals remains the eventual aggregated decision surface. */}
        </Panel>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Project Costs — authority image 13, panel 1.
//
// Grouped by decision importance rather than shown as four equal tiles: what
// needs a decision leads, everything else supports it.
// ---------------------------------------------------------------------------

function ClaimRow({ claim, projectName }) {
  return (
    <li className="py-2">
      <Link
        to={`/admin/site-costs/${claim.id}`}
        className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[12.5px] font-semibold text-botanique-green hover:underline"
      >
        <span className="min-w-0 break-words">{projectName[claim.projectId] || "Project"}</span>
        <span className="shrink-0 tabular-nums text-botanique-charcoal">
          {formatKes(claim.approvedTotal ?? claim.submittedTotal)}
        </span>
      </Link>
      <p className="mt-0.5 break-words text-[11px] text-gray-500">
        {claim.recipientLabel || "Cost claim"} · {LIFECYCLE_LABEL[claim.lifecycle] || claim.lifecycle}
      </p>
    </li>
  );
}

function ProjectCostsArea({ claims, portfolio, projectName }) {
  const byLifecycle = (lifecycle) => claims.filter((claim) => claim.lifecycle === lifecycle);
  const awaiting = byLifecycle("awaiting_review");
  const amendment = byLifecycle("amendment_requested");
  const approved = byLifecycle("approved");
  const total = (rows) => rows.reduce(
    (sum, claim) => sum + Number(claim.approvedTotal ?? claim.submittedTotal ?? 0), 0
  );
  const decided = claims
    .filter((claim) => !["awaiting_review", "draft"].includes(claim.lifecycle))
    .sort((left, right) => String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")))
    .slice(0, 5);
  const needsDecision = [...awaiting, ...amendment].slice(0, 5);

  if (claims.length === 0) {
    return (
      <Panel
        icon="site"
        title="Project Costs"
        subtitle="Track and control project-related costs"
        action={<Link to="/admin/site-costs" className="text-[12.5px] font-semibold text-botanique-green hover:underline">View all →</Link>}
      >
        <EmptyLine
          icon="doc"
          action={
            <Link
              to="/admin/site-costs"
              className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg border border-stone-300 bg-white px-3 text-[12px] font-semibold text-botanique-green hover:border-botanique-green"
            >
              Go to Project Costs <Glyph name="arrow" className="h-3 w-3" />
            </Link>
          }
        >
          No project cost has been claimed yet. A claim is raised deliberately from an accepted
          Daily Site Record, or directly in Project Costs.
        </EmptyLine>
      </Panel>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Decision first, at its own weight; the supporting figures beside it. */}
      <div className="grid gap-2.5 lg:grid-cols-5">
        <div
          className={`rounded-xl border p-4 lg:col-span-2 ${
            awaiting.length + amendment.length > 0
              ? "border-amber-200 bg-[#fdfaf3]"
              : "border-stone-200 bg-white"
          }`}
        >
          <div className="flex items-start gap-2.5">
            <Disc
              name={awaiting.length + amendment.length > 0 ? "alert" : "check"}
              tone={awaiting.length + amendment.length > 0 ? "waiting" : "settled"}
              size="h-9 w-9"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                Awaiting a decision
              </p>
              <p className="mt-0.5 text-[24px] font-semibold leading-none tabular-nums text-botanique-charcoal">
                {awaiting.length + amendment.length}
              </p>
              <p className="mt-1 break-words text-[12px] text-gray-600">
                {awaiting.length + amendment.length > 0
                  ? `${formatKes(total(awaiting) + total(amendment))} of claimed cost`
                  : "Every claim has been decided."}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 lg:col-span-3">
          <MetricBand columns={3}>
            <Metric
              icon="doc" label="Approved" value={formatKes(total(approved))}
              hint={`${approved.length} ${approved.length === 1 ? "claim" : "claims"} · authority to incur`}
            />
            <Metric
              icon="send" label="Released" value={formatKes(portfolio.releasedAmount)}
              hint="Across all fund authorities"
            />
            <Metric
              icon="clock" label="Not released" value={formatKes(portfolio.unreleasedAmount)}
              tone={portfolio.unreleasedAmount > 0 ? "waiting" : "neutral"}
              hint="Authorised, still unreleased"
            />
          </MetricBand>
        </div>
      </div>

      {/* Two bounded lists rather than one unbounded ledger. */}
      <div className="grid gap-2.5 lg:grid-cols-2">
        <Panel
          icon="alert"
          tone={needsDecision.length ? "waiting" : "settled"}
          title="Needs a decision"
          subtitle={needsDecision.length ? "Oldest first" : "Nothing waiting"}
          action={needsDecision.length ? (
            <Link to="/admin/site-costs?status=awaiting_review" className="text-[12.5px] font-semibold text-botanique-green hover:underline">View all →</Link>
          ) : null}
        >
          {needsDecision.length === 0 ? (
            <EmptyLine icon="check">Every cost claim has been decided.</EmptyLine>
          ) : (
            <ul className="-my-1 divide-y divide-stone-100">
              {needsDecision.map((claim) => (
                <ClaimRow key={claim.id} claim={claim} projectName={projectName} />
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          icon="check"
          tone="settled"
          title="Recently decided"
          subtitle="Most recent first"
          action={<Link to="/admin/site-costs" className="text-[12.5px] font-semibold text-botanique-green hover:underline">View all →</Link>}
        >
          {decided.length === 0 ? (
            <EmptyLine icon="clock">No claim has been decided yet.</EmptyLine>
          ) : (
            <ul className="-my-1 divide-y divide-stone-100">
              {decided.map((claim) => (
                <ClaimRow key={claim.id} claim={claim} projectName={projectName} />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Funding, Payments and Reconciliation — authority image 13, panel 4.
//
// The canonical name is used throughout. "Fund requests" survives only as an
// internal route, because renaming a URL would break every existing drill-
// through link and grants nothing.
// ---------------------------------------------------------------------------

// The lifecycle as one connected strip, so approval can never be read as
// payment: each stage is a stage, in order, with what is actually sitting in it.
function LifecycleStrip({ stages }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      {stages.map((stage, index) => (
        <li
          key={stage.key}
          className={`relative rounded-lg px-3 py-2.5 ${
            stage.tone === "waiting" ? "bg-amber-50" : stage.tone === "settled" ? "bg-emerald-50" : "bg-stone-50"
          }`}
        >
          <p className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-wide text-gray-500">
            <span className="tabular-nums">{index + 1}</span>
            <span className="min-w-0 truncate">{stage.label}</span>
          </p>
          <p className={`mt-1 break-words text-[15px] font-semibold leading-tight tabular-nums ${
            stage.tone === "waiting" ? "text-amber-800" : stage.tone === "settled" ? "text-emerald-800" : "text-botanique-charcoal"
          }`}>
            {stage.value}
          </p>
          {stage.hint && <p className="mt-0.5 break-words text-[10.5px] text-gray-500">{stage.hint}</p>}
        </li>
      ))}
    </ol>
  );
}

function FundingArea({ positions, portfolio, projectName }) {
  const approved = positions.filter((row) => row.request.status === "approved");
  const submitted = positions.filter((row) => row.request.status === "submitted");
  const outstanding = approved.filter((row) => row.position.reconciliationState === "outstanding");
  const settled = approved.filter((row) => row.position.financialPosition === "financially_settled");
  const recent = [...positions]
    .sort((left, right) =>
      String(right.request.updatedAt || "").localeCompare(String(left.request.updatedAt || "")))
    .slice(0, 6);

  if (positions.length === 0) {
    return (
      <Panel
        icon="wallet"
        title="Funding, Payments and Reconciliation"
        subtitle="Authority to fund, money released, and what became of it"
        action={<Link to="/admin/fund-requests" className="text-[12.5px] font-semibold text-botanique-green hover:underline">View all →</Link>}
      >
        <EmptyLine
          icon="send"
          action={
            <Link
              to="/admin/fund-requests"
              className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg border border-stone-300 bg-white px-3 text-[12px] font-semibold text-botanique-green hover:border-botanique-green"
            >
              Open <Glyph name="arrow" className="h-3 w-3" />
            </Link>
          }
        >
          No fund request has been raised. A request asks the Principal to authorise money against
          approved claims — approval is not payment, and a release is recorded separately when money
          actually moves.
        </EmptyLine>
      </Panel>
    );
  }

  return (
    <div className="space-y-2.5">
      <Panel
        icon="wallet"
        title="Funding, Payments and Reconciliation"
        subtitle="The lifecycle, in order. Approval is not payment."
        action={<Link to="/admin/fund-requests" className="text-[12.5px] font-semibold text-botanique-green hover:underline">View all →</Link>}
      >
        <LifecycleStrip
          stages={[
            {
              key: "requested", label: "Awaiting decision", value: String(submitted.length),
              hint: submitted.length ? "Requests submitted" : "None submitted",
              tone: submitted.length ? "waiting" : "neutral",
            },
            {
              key: "authorised", label: "Authorised", value: formatKes(portfolio.authorisedAmount),
              hint: `${approved.length} approved ${approved.length === 1 ? "authority" : "authorities"}`,
            },
            {
              key: "released", label: "Released", value: formatKes(portfolio.releasedAmount),
              hint: "Money that actually moved",
            },
            {
              key: "advance", label: "Advance outstanding",
              value: formatKes(portfolio.advanceOutstandingAmount),
              hint: `${outstanding.length} ${outstanding.length === 1 ? "advance" : "advances"} unaccounted`,
              tone: outstanding.length ? "waiting" : "neutral",
            },
            {
              key: "settled", label: "Settled", value: String(settled.length),
              hint: settled.length === 1 ? "1 authority complete" : `${settled.length} authorities complete`,
              tone: settled.length ? "settled" : "neutral",
            },
          ]}
        />
      </Panel>

      <Panel icon="doc" title="Authorities" subtitle="Most recently updated first">
        <ul className="-my-1 divide-y divide-stone-100">
          {recent.map(({ request, position }) => (
            <li key={request.id} className="py-2">
              <Link
                to={`/admin/fund-requests/${request.id}`}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[12.5px] font-semibold text-botanique-green hover:underline"
              >
                <span className="min-w-0 break-words">{request.requestNumber}</span>
                <span className="shrink-0 tabular-nums text-botanique-charcoal">
                  {formatKes(request.totalRequestedAmount)}
                </span>
              </Link>
              <p className="mt-0.5 break-words text-[11px] text-gray-500">
                {projectName[request.projectId] || "Project"} · {FUND_REQUEST_STATUSES[request.status]}
                {request.status === "approved" && ` · ${formatKes(position.releasedAmount)} released`}
              </p>
              {/* Custody belongs to each release, not to the whole authority:
                  one authority may carry BOTH a direct settled payment and an
                  accountable advance, and flattening the two would manufacture
                  — or erase — a reconciliation obligation. */}
              {request.status === "approved" && position.releaseCount > 0 && (
                <p className="mt-1 flex flex-wrap gap-1.5">
                  {position.directPaidAmount > 0 && (
                    <Chip tone="neutral">
                      {CUSTODY_DISPOSITIONS.direct_recipient_funding} {formatKes(position.directPaidAmount)}
                    </Chip>
                  )}
                  {position.advanceReleasedAmount > 0 && (
                    <Chip tone={position.reconciliationState === "outstanding" ? "waiting" : "neutral"}>
                      {CUSTODY_DISPOSITIONS.operations_manager_accountable_advance}{" "}
                      {formatKes(position.advanceReleasedAmount)}
                    </Chip>
                  )}
                </p>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
