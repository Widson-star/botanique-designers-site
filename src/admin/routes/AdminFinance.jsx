// Finance.
//
// AUTHORITY:
//   12-finance-overview-working-authority.png — the Finance landing: title,
//   a FIVE-tab row, a row of capability cards each with an icon, a description,
//   a headline figure and a footer link, then "at a glance" beside "recent
//   finance activity".
//   13-finance-children-working-authority.png — the four numbered capability
//   panels: ① Project Costs ② Company Expenses ③ Staff Compensation
//   ④ Funding, Payments & Reconciliation. Each is a numbered header with
//   filters at the right, a row of FOUR metric tiles, then its content.
//
// ARCHITECTURE: image 13 draws persistent Finance children in the sidebar. That
// arrangement is NOT implemented — PR #94 settled Finance as one top-level
// domain with in-page navigation, and that decision post-dates the image. The
// image still governs what each capability contains, which is what is built here.
//
// CORRECTION, 10 August 2026. PR #102's first pass invented its own Finance
// information architecture — four cards, a "money position" panel beside a
// "needs attention" panel — assembled from a shared component library rather
// than from these two images. The images are the product authority and the
// component library is an implementation helper; this file is rebuilt from the
// images. All five tabs now render, as image 12 shows. Company Expenses and
// Staff Compensation keep their place in the department and state truthfully
// that no model exists, rather than being hidden or given invented figures.
//
// WHAT THE IMAGES SHOW THAT THIS PRODUCT DOES NOT HAVE is omitted, never
// substituted: no money-in, no bank balance, no net position, no expense
// categories, no votehead breakdown, no payroll, no donut chart.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useSiteCosts } from "../context/siteCosts";
import { useFundRequests } from "../context/fundRequests";
import { canSeeSiteCosts } from "../utils/siteCostCapabilities";
import { canSeeFundRequests, FUND_REQUEST_STATUSES } from "../utils/fundRequestCapabilities";
import {
  FINANCE_AREAS, financeAttention, portfolioPosition, requestPositions,
} from "../utils/financePortfolio";
import { formatKes } from "../utils/dailySiteFormatters";
import { Chip, Disc, Glyph } from "../components/ui/Surfaces";

const AREA_ICON = {
  overview: "spark",
  "project-costs": "calendar",
  "company-expenses": "doc",
  "staff-compensation": "people",
  funding: "money",
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

// One of the authority's metric tiles: icon disc, label, big value, sub-line.
function Tile({ icon, label, value, hint, tone = "neutral" }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-3.5 py-3">
      <div className="flex items-center gap-2.5">
        <Disc name={icon} tone={tone} size="h-8 w-8" />
        <p className="min-w-0 truncate text-[11.5px] text-gray-500">{label}</p>
      </div>
      <p className="mt-2 break-words text-[19px] font-semibold leading-none tabular-nums text-botanique-charcoal">
        {value}
      </p>
      {hint && <p className="mt-1.5 truncate text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
}

// A numbered capability panel, as image 13 composes each of its four regions.
function CapabilityPanel({ number, icon, title, subtitle, action, children }) {
  return (
    <section aria-label={title} className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-botanique-green text-[11px] font-semibold text-white">
            {number}
          </span>
          {icon && <Disc name={icon} tone="brand" size="h-8 w-8" />}
          <div className="min-w-0">
            <h2 className="truncate text-[14px] font-semibold text-botanique-charcoal">{title}</h2>
            {subtitle && <p className="truncate text-[11.5px] text-gray-500">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

// A capability with no model behind it. Image 13 gives it a numbered panel and a
// place in the department; this product gives it that place and nothing else.
function UnbuiltPanel({ number, area }) {
  return (
    <CapabilityPanel number={number} icon={AREA_ICON[area.id]} title={area.label} subtitle={area.description}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-stone-50 px-3.5 py-3">
        <Disc name="pause" tone="unbuilt" size="h-8 w-8" />
        <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-gray-600">
          This capability is part of the Finance department but is not built yet. No records,
          workflow or figures exist for it, so none are shown.
        </p>
      </div>
    </CapabilityPanel>
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

  // All five areas of image 12's tab row. The two without a model are still
  // selectable, because the image makes them part of the department and the
  // panel they open states the truth rather than inventing data.
  const areas = useMemo(
    () =>
      FINANCE_AREAS.filter((area) => {
        if (area.id === "project-costs") return canCosts;
        if (area.id === "funding") return canFunds;
        if (area.unbuilt) return canCosts || canFunds;
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
    <section className="space-y-4">
      <div>
        <h1 className="text-[24px] font-semibold leading-tight">Finance</h1>
        <p className="mt-1 max-w-2xl text-[13px] text-gray-600">
          All Botanique money-in and money-out records live here.
        </p>
      </div>

      {/* Image 12's tab row. */}
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
        <Overview
          areas={FINANCE_AREAS}
          claims={claims}
          portfolio={portfolio}
          attention={attention}
          positions={positions}
          projectName={projectName}
          canCosts={canCosts}
          canFunds={canFunds}
          onSelect={select}
        />
      )}
      {active.id === "project-costs" && (
        <ProjectCosts claims={claims} portfolio={portfolio} projectName={projectName} />
      )}
      {active.id === "company-expenses" && (
        <UnbuiltPanel number={2} area={FINANCE_AREAS.find((a) => a.id === "company-expenses")} />
      )}
      {active.id === "staff-compensation" && (
        <UnbuiltPanel number={3} area={FINANCE_AREAS.find((a) => a.id === "staff-compensation")} />
      )}
      {active.id === "funding" && (
        <Funding positions={positions} portfolio={portfolio} projectName={projectName} />
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Overview — image 12.
// ---------------------------------------------------------------------------

function Overview({ areas, claims, portfolio, attention, positions, projectName, canCosts, canFunds, onSelect }) {
  const awaiting = claims.filter((claim) => claim.lifecycle === "awaiting_review");
  const awaitingTotal = awaiting.reduce((sum, claim) => sum + Number(claim.submittedTotal ?? 0), 0);

  // Image 12's card row. Each card: icon, name, description, a labelled headline
  // figure, and a footer link into the capability.
  const cards = areas.filter((area) => area.id !== "overview").map((area) => {
    if (area.id === "project-costs") {
      return {
        area,
        visible: canCosts,
        label: "Awaiting decision",
        value: claims.length ? formatKes(awaitingTotal) : formatKes(0),
        hint: `${awaiting.length} ${awaiting.length === 1 ? "item" : "items"}`,
        link: "View project costs",
      };
    }
    if (area.id === "funding") {
      return {
        area,
        visible: canFunds,
        label: "Reconciliation position",
        value: portfolio.advanceOutstandingAmount > 0
          ? formatKes(portfolio.advanceOutstandingAmount)
          : formatKes(0),
        hint: portfolio.advanceOutstandingAmount > 0 ? "Outstanding" : "Balanced",
        settled: portfolio.advanceOutstandingAmount === 0,
        link: "View reconciliation",
      };
    }
    return { area, visible: true };
  });

  // Image 12's "recent finance activity". There is no cross-department activity
  // model, but claims and fund requests both carry timestamps and are genuine
  // finance activity, so the region is filled from them and from nothing else.
  const activity = [
    ...claims.map((claim) => ({
      id: `c-${claim.id}`,
      icon: "calendar",
      title: claim.recipientLabel || "Cost claim",
      subtitle: `${projectName[claim.projectId] || "Project"} · ${LIFECYCLE_LABEL[claim.lifecycle] || claim.lifecycle}`,
      amount: Number(claim.approvedTotal ?? claim.submittedTotal ?? 0),
      at: claim.updatedAt || "",
      to: `/admin/site-costs/${claim.id}`,
    })),
    ...positions.map(({ request }) => ({
      id: `r-${request.id}`,
      icon: "money",
      title: request.requestNumber,
      subtitle: `${projectName[request.projectId] || "Project"} · ${FUND_REQUEST_STATUSES[request.status]}`,
      amount: Number(request.totalRequestedAmount || 0),
      at: request.updatedAt || "",
      to: `/admin/fund-requests/${request.id}`,
    })),
  ].sort((left, right) => String(right.at).localeCompare(String(left.at))).slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Capability card row. */}
      <div role="region" aria-label="Finance capabilities" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.filter((card) => card.visible).map(({ area, label, value, hint, link, settled }) => (
          <div key={area.id} aria-label={area.label} className="flex flex-col rounded-xl border border-stone-200 bg-white">
            <div className="flex-1 p-4">
              <div className="flex items-start gap-2.5">
                <Disc name={AREA_ICON[area.id]} tone={area.unbuilt ? "unbuilt" : "brand"} size="h-9 w-9" />
                <div className="min-w-0">
                  <p className={`text-[13px] font-semibold leading-tight ${area.unbuilt ? "text-gray-500" : "text-botanique-charcoal"}`}>
                    {area.label}
                  </p>
                  <p className="mt-1 text-[11.5px] leading-snug text-gray-500">{area.description}</p>
                </div>
              </div>
              {area.unbuilt ? (
                <p className="mt-3.5 text-[12px] font-medium text-gray-400">Not yet built</p>
              ) : (
                <div className="mt-3.5">
                  <p className="text-[11.5px] text-gray-500">{label}</p>
                  <p className="mt-1 break-words text-[22px] font-semibold leading-none tabular-nums text-botanique-charcoal">
                    {value}
                  </p>
                  <p className={`mt-1.5 text-[11.5px] ${settled ? "font-medium text-emerald-700" : "text-gray-500"}`}>
                    {hint}
                  </p>
                </div>
              )}
            </div>
            {!area.unbuilt && (
              <button
                type="button"
                onClick={() => onSelect(area.id)}
                className="flex min-h-11 items-center gap-1.5 border-t border-stone-100 px-4 text-[12px] font-semibold text-botanique-green hover:bg-[#f7faf8]"
              >
                {link}
                <Glyph name="arrow" className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* "Finance at a glance" beside "Recent finance activity". The glance row
          carries the money this product actually holds: authorised, released,
          actually spent and still unreleased. Money-in, net position and bank
          balance have no model and are absent rather than invented. */}
      <div className="grid gap-3 lg:grid-cols-5">
        <section className="rounded-xl border border-stone-200 bg-white p-4 lg:col-span-3">
          <h2 className="text-[13px] font-semibold text-botanique-charcoal">Finance at a glance</h2>
          {portfolio.hasAnyAuthority ? (
            <>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                <Glance icon="doc" label="Authorised" value={formatKes(portfolio.authorisedAmount)} hint={`${portfolio.requestCount} approved`} />
                <Glance icon="send" label="Released" value={formatKes(portfolio.releasedAmount)} hint="Money that moved" />
                <Glance icon="money" label="Actual spend" value={formatKes(portfolio.actualExpenditureAmount)} hint="Reconciled + direct" />
                <Glance
                  icon="clock" label="Not released" value={formatKes(portfolio.unreleasedAmount)}
                  hint="Still unreleased" tone={portfolio.unreleasedAmount > 0 ? "waiting" : "neutral"}
                />
              </dl>
              {portfolio.advanceOutstandingAmount > 0 && (
                <p className="mt-3 border-t border-stone-100 pt-2.5 text-[12px] text-amber-800">
                  {formatKes(portfolio.advanceOutstandingAmount)} of accountable advances has not been
                  accounted for, so it is not counted as spend.
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-[12.5px] text-gray-600">
              No fund authority is approved, so nothing has been released and nothing is owed an
              account.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-4 lg:col-span-2">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[13px] font-semibold text-botanique-charcoal">Recent finance activity</h2>
            {attention.length > 0 && (
              <Link to={attention[0].href} className="shrink-0 text-[12px] font-semibold text-botanique-green hover:underline">
                View all
              </Link>
            )}
          </div>
          {activity.length === 0 ? (
            <p className="mt-2 text-[12.5px] text-gray-600">No finance record has been created yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-stone-100">
              {activity.map((item) => (
                <li key={item.id}>
                  <Link to={item.to} className="flex min-h-11 items-start gap-2.5 py-2 hover:bg-stone-50">
                    <Disc name={item.icon} tone="neutral" size="h-7 w-7" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-botanique-charcoal">{item.title}</span>
                      <span className="block truncate text-[11px] text-gray-500">{item.subtitle}</span>
                    </span>
                    <span className="shrink-0 text-[12px] font-semibold tabular-nums text-botanique-charcoal">
                      {formatKes(item.amount)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {attention.length > 0 && (
        <section className="rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="text-[13px] font-semibold text-botanique-charcoal">Awaiting a decision</h2>
          <ul className="mt-2 divide-y divide-stone-100">
            {attention.map((item) => (
              <li key={item.key}>
                <Link to={item.href} className="flex min-h-11 items-center gap-2.5 py-2 hover:bg-stone-50">
                  <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-stone-100 px-1.5 text-[11px] font-semibold tabular-nums text-gray-700">
                    {item.count}
                  </span>
                  <span className="min-w-0 flex-1 break-words text-[12.5px] text-botanique-charcoal">{item.label}</span>
                  {item.amount > 0 && (
                    <span className="shrink-0 text-[12px] tabular-nums text-gray-500">{formatKes(item.amount)}</span>
                  )}
                  <Glyph name="arrow" className="h-3.5 w-3.5 shrink-0 text-botanique-green" />
                </Link>
              </li>
            ))}
          </ul>
          {/* Finance states its own financial attention and decides nothing:
              unified Approvals remains the eventual aggregated decision surface. */}
        </section>
      )}
    </div>
  );
}

function Glance({ icon, label, value, hint, tone = "neutral" }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <Disc name={icon} tone={tone} size="h-8 w-8" />
      <div className="min-w-0">
        <p className="truncate text-[11px] text-gray-500">{label}</p>
        <p className="mt-0.5 break-words text-[15px] font-semibold leading-tight tabular-nums text-botanique-charcoal">{value}</p>
        {hint && <p className="mt-0.5 truncate text-[10.5px] text-gray-500">{hint}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ① Project Costs — image 13, panel 1.
// ---------------------------------------------------------------------------

function ProjectCosts({ claims, portfolio, projectName }) {
  const by = (lifecycle) => claims.filter((claim) => claim.lifecycle === lifecycle);
  const awaiting = by("awaiting_review");
  const approved = by("approved");
  const returned = by("amendment_requested");
  const total = (rows) => rows.reduce((sum, claim) => sum + Number(claim.approvedTotal ?? claim.submittedTotal ?? 0), 0);
  const recent = [...claims]
    .sort((left, right) => String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")))
    .slice(0, 5);

  return (
    <CapabilityPanel
      number={1}
      icon="calendar"
      title="Project Costs"
      subtitle="Track and manage all project-related cost claims."
      action={
        <Link to="/admin/site-costs" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-stone-300 px-3 text-[12px] font-semibold text-botanique-charcoal hover:border-botanique-green hover:text-botanique-green">
          View all
          <Glyph name="arrow" className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile icon="calendar" label="Total project costs" value={formatKes(total(claims))} hint={`${claims.length} ${claims.length === 1 ? "item" : "items"}`} />
        <Tile icon="clock" label="Awaiting review" value={formatKes(total(awaiting))} hint={`${awaiting.length} ${awaiting.length === 1 ? "item" : "items"}`} tone={awaiting.length ? "waiting" : "neutral"} />
        <Tile icon="check" label="Approved" value={formatKes(total(approved))} hint={`${approved.length} ${approved.length === 1 ? "item" : "items"}`} tone={approved.length ? "settled" : "neutral"} />
        <Tile icon="send" label="Released" value={formatKes(portfolio.releasedAmount)} hint="Money that actually moved" />
      </div>

      <div className="mt-3.5 rounded-xl border border-stone-200">
        <div className="flex items-baseline justify-between gap-3 border-b border-stone-100 px-3.5 py-2.5">
          <h3 className="text-[12.5px] font-semibold text-botanique-charcoal">Recent cost claims</h3>
          <Link to="/admin/site-costs" className="text-[12px] font-semibold text-botanique-green hover:underline">View all</Link>
        </div>
        {recent.length === 0 ? (
          <p className="px-3.5 py-3 text-[12.5px] text-gray-600">
            No project cost has been claimed yet. A claim is raised deliberately from an accepted
            Daily Site Record, or directly in Project Costs.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {recent.map((claim) => (
              <li key={claim.id}>
                <Link to={`/admin/site-costs/${claim.id}`} className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5 hover:bg-stone-50">
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-[12.5px] font-medium text-botanique-charcoal">
                      {projectName[claim.projectId] || "Project"}
                    </span>
                    <span className="block break-words text-[11px] text-gray-500">{claim.recipientLabel || "Cost claim"}</span>
                  </span>
                  <Chip tone={claim.lifecycle === "approved" ? "settled" : claim.lifecycle === "awaiting_review" ? "waiting" : "neutral"}>
                    {LIFECYCLE_LABEL[claim.lifecycle] || claim.lifecycle}
                  </Chip>
                  <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-botanique-charcoal">
                    {formatKes(claim.approvedTotal ?? claim.submittedTotal)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      {returned.length > 0 && (
        <p className="mt-2.5 text-[11.5px] text-gray-500">
          {returned.length} {returned.length === 1 ? "claim was" : "claims were"} returned for amendment.
        </p>
      )}
    </CapabilityPanel>
  );
}

// ---------------------------------------------------------------------------
// ④ Funding, Payments & Reconciliation — image 13, panel 4.
//
// The image separates the three concerns two ways, and both are reproduced:
// the four tiles run Submitted → Approved → Paid → Reconciliation, and the
// request table carries Status, Paid and Reconciled as SEPARATE columns. That
// separation is the image's own answer to "funding vs payments vs
// reconciliation" — no new tabs or destinations are invented for it.
// ---------------------------------------------------------------------------

function Funding({ positions, portfolio, projectName }) {
  const approved = positions.filter((row) => row.request.status === "approved");
  const submitted = positions.filter((row) => row.request.status === "submitted");
  const outstanding = approved.filter((row) => row.position.reconciliationState === "outstanding");
  const submittedTotal = submitted.reduce((sum, row) => sum + Number(row.request.totalRequestedAmount || 0), 0);
  // Reconciliation progress: of the advances that need accounting for, how many
  // have been accounted for. Never a percentage of money that never moved.
  const advances = approved.filter((row) => row.position.advanceReleasedAmount > 0);
  const reconciled = advances.filter((row) => row.position.reconciliationState === "accepted");
  const progress = advances.length ? Math.round((reconciled.length / advances.length) * 100) : null;

  const rows = [...positions]
    .sort((left, right) => String(right.request.updatedAt || "").localeCompare(String(left.request.updatedAt || "")))
    .slice(0, 8);

  return (
    <CapabilityPanel
      number={4}
      icon="money"
      title="Funding, Payments & Reconciliation"
      subtitle="Track funding and payment requests and reconciliation status."
      action={
        <Link to="/admin/fund-requests" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-stone-300 px-3 text-[12px] font-semibold text-botanique-charcoal hover:border-botanique-green hover:text-botanique-green">
          View all
          <Glyph name="arrow" className="h-3.5 w-3.5" />
        </Link>
      }
    >
      {/* FUNDING · PAYMENTS · RECONCILIATION, in the image's tile order. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile icon="send" label="Submitted" value={formatKes(submittedTotal)} hint={`${submitted.length} ${submitted.length === 1 ? "request" : "requests"}`} tone={submitted.length ? "waiting" : "neutral"} />
        <Tile icon="check" label="Approved" value={formatKes(portfolio.authorisedAmount)} hint={`${approved.length} ${approved.length === 1 ? "request" : "requests"}`} />
        <Tile icon="wallet" label="Paid" value={formatKes(portfolio.releasedAmount)} hint="Released against authority" />
        <Tile
          icon="scale"
          label="Reconciliation"
          value={progress === null ? "—" : `${progress}%`}
          hint={progress === null
            ? "No advance to account for"
            : outstanding.length ? `${outstanding.length} outstanding` : "On track"}
          tone={outstanding.length ? "waiting" : progress === 100 ? "settled" : "neutral"}
        />
      </div>

      {positions.length === 0 ? (
        <p className="mt-3.5 rounded-lg bg-stone-50 px-3.5 py-3 text-[12.5px] text-gray-600">
          No fund request has been raised. A request asks the Principal to authorise money against
          approved claims — approval is not payment, and a release is recorded separately when money
          actually moves.
        </p>
      ) : (
        <>
          <div className="mt-3.5 overflow-x-auto rounded-xl border border-stone-200">
            <div className="flex items-baseline justify-between gap-3 border-b border-stone-100 px-3.5 py-2.5">
              <h3 className="text-[12.5px] font-semibold text-botanique-charcoal">Funding &amp; payment requests</h3>
              <Link to="/admin/fund-requests" className="shrink-0 text-[12px] font-semibold text-botanique-green hover:underline">View all</Link>
            </div>
            <table className="w-full text-left text-[12.5px]">
              <thead className="border-b border-stone-100 text-[11px] text-gray-500">
                <tr>
                  <th className="px-3.5 py-2 font-medium">Request</th>
                  <th className="px-3.5 py-2 font-medium">Project / Purpose</th>
                  <th className="whitespace-nowrap px-3.5 py-2 text-right font-medium">Amount (KES)</th>
                  <th className="px-3.5 py-2 font-medium">Status</th>
                  <th className="px-3.5 py-2 font-medium">Paid</th>
                  <th className="px-3.5 py-2 font-medium">Reconciled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map(({ request, position }) => {
                  const paid = position.releasedAmount > 0;
                  const fullyPaid = position.releaseState === "fully_released";
                  const needsReconciliation = position.advanceReleasedAmount > 0;
                  return (
                    <tr key={request.id} className="align-top">
                      <td className="px-3.5 py-2.5">
                        <Link to={`/admin/fund-requests/${request.id}`} className="font-semibold text-botanique-green hover:underline">
                          {request.requestNumber}
                        </Link>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className="block break-words text-gray-700">{projectName[request.projectId] || "Project"}</span>
                        {request.purpose && <span className="mt-0.5 block break-words text-[11px] text-gray-500">{request.purpose}</span>}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2.5 text-right tabular-nums">
                        {formatKes(request.totalRequestedAmount)}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <Chip tone={request.status === "approved" ? "settled" : request.status === "submitted" ? "waiting" : "neutral"}>
                          {FUND_REQUEST_STATUSES[request.status]}
                        </Chip>
                      </td>
                      {/* Paid is a separate column from Status precisely because
                          approval is not payment. */}
                      <td className="px-3.5 py-2.5">
                        {request.status !== "approved"
                          ? <span className="text-gray-400">—</span>
                          : <Chip tone={fullyPaid ? "settled" : paid ? "waiting" : "neutral"}>
                              {fullyPaid ? "Paid" : paid ? "Part paid" : "Not paid"}
                            </Chip>}
                      </td>
                      <td className="px-3.5 py-2.5">
                        {!needsReconciliation
                          ? <span className="text-gray-400">Not required</span>
                          : <Chip tone={position.reconciliationState === "accepted" ? "settled" : "waiting"}>
                              {position.reconciliationState === "accepted" ? "Yes" : "No"}
                            </Chip>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {progress !== null && (
            <div className="mt-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[12.5px] font-semibold text-botanique-charcoal">Reconciliation progress</h3>
                <span className="text-[12.5px] font-semibold tabular-nums text-botanique-charcoal">{progress}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-stone-100">
                <div className="h-full rounded-full bg-botanique-green" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1.5 text-[11px] text-gray-500">
                {reconciled.length} of {advances.length} accountable {advances.length === 1 ? "advance has" : "advances have"} been accounted for.
              </p>
            </div>
          )}
        </>
      )}
    </CapabilityPanel>
  );
}
