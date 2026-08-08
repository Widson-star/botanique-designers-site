// Finance — one stable shell destination with an in-page area selector.
//
// Authority: docs/ui-authority/operations-hub/operating-model-authority/
// (Founder-approved, merged PR #93). Supersedes the flat "Finance → Fund
// Requests" navigation Stage 6 shipped (PR #92).
//
// The approved architecture has five eventual areas — Overview, Project
// Costs, Company Expenses, Staff Compensation, Funding Payments and
// Reconciliation — in that order, so a later PR can add the missing two
// without a shell redesign. Only the areas backed by genuine, already-
// delivered capability render here: Overview, Project Costs (Site Costs) and
// Funding, Payments and Reconciliation (Fund Requests). Company Expenses and
// Staff Compensation have no database, workflow or record behind them yet, so
// they are not rendered at all — not disabled, not "coming soon".
//
// Neither existing area is rebuilt or duplicated on this page. Each panel
// shows a compact, truthfully-computed position from records this role can
// already see, then drills through to the existing, unchanged
// /admin/site-costs and /admin/fund-requests registers for the full list.
// Fund Requests keeps its own honesty here: approval authorises money to be
// made available, and no release, payment or reconciliation step exists yet
// in this product, so this page claims none either.
//
// Which area is selected is local shell state, not the URL — the same choice
// already made for which sidebar group is open. A bookmark or direct link
// that should reopen a specific area is a real gap the authority notes and
// leaves open, not modelled here.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useSiteCosts } from "../context/siteCosts";
import { useFundRequests } from "../context/fundRequests";
import { canSeeSiteCosts } from "../utils/siteCostCapabilities";
import { canSeeFundRequests } from "../utils/fundRequestCapabilities";

const money = (amount) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(amount || 0);

const AREAS = [
  { id: "overview", label: "Overview", mobileLabel: "Overview" },
  { id: "project-costs", label: "Project Costs", mobileLabel: "Project Costs" },
  {
    id: "funding",
    label: "Funding, Payments and Reconciliation",
    mobileLabel: "Funding & Recon.",
  },
];

function summariseCosts(claims) {
  const approved = claims.filter((claim) => claim.lifecycle === "approved");
  return {
    approvedTotal: approved.reduce(
      (sum, claim) => sum + (claim.approvedTotal ?? claim.submittedTotal ?? 0),
      0
    ),
    approvedCount: approved.length,
    awaitingReviewCount: claims.filter((claim) => claim.lifecycle === "awaiting_review").length,
  };
}

function summariseFunding(requests) {
  const approved = requests.filter((request) => request.status === "approved");
  return {
    approvedTotal: approved.reduce((sum, request) => sum + (request.totalRequestedAmount || 0), 0),
    approvedCount: approved.length,
    submittedCount: requests.filter((request) => request.status === "submitted").length,
  };
}

export default function AdminFinance() {
  const { role } = useAdminData();
  const { claims, status: costsStatus } = useSiteCosts();
  const { requests, status: fundsStatus } = useFundRequests();
  const canCosts = canSeeSiteCosts(role);
  const canFunds = canSeeFundRequests(role);

  const areas = useMemo(
    () =>
      AREAS.filter((area) => {
        if (area.id === "project-costs") return canCosts;
        if (area.id === "funding") return canFunds;
        return canCosts || canFunds; // Overview needs at least one real area to summarise.
      }),
    [canCosts, canFunds]
  );

  const [selectedId, setSelectedId] = useState(areas[0]?.id);
  const active = areas.find((area) => area.id === selectedId) || areas[0];

  const costs = useMemo(() => summariseCosts(claims), [claims]);
  const funding = useMemo(() => summariseFunding(requests), [requests]);

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

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-botanique-green">Finance</p>
      <h1 className="mt-1 text-2xl font-semibold">{active.label}</h1>
      <p className="mt-1 max-w-2xl text-sm text-gray-600">
        All Botanique money-in and money-out lives here. Choose an area to see its position.
      </p>

      {/* Desktop: one continuous segmented control, matching the authority. */}
      <div className="mt-5 hidden rounded-lg bg-stone-100 p-1 sm:inline-flex" role="tablist" aria-label="Finance area">
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
      <div className="mt-5 flex flex-wrap gap-2 sm:hidden" role="tablist" aria-label="Finance area">
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

      {active.id === "overview" && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {canCosts && (
            <button
              type="button"
              onClick={() => select("project-costs")}
              className="rounded-lg border border-stone-200 bg-white p-4 text-left transition hover:border-botanique-green"
            >
              <p className="text-sm font-semibold text-gray-500">Project Costs</p>
              <p className="mt-2 text-2xl font-semibold">{money(costs.approvedTotal)}</p>
              <p className="mt-1 text-xs text-gray-500">
                Approved · {costs.awaitingReviewCount} awaiting review
              </p>
            </button>
          )}
          {canFunds && (
            <button
              type="button"
              onClick={() => select("funding")}
              className="rounded-lg border border-stone-200 bg-white p-4 text-left transition hover:border-botanique-green"
            >
              <p className="text-sm font-semibold text-gray-500">Funding, Payments and Reconciliation</p>
              <p className="mt-2 text-2xl font-semibold">{money(funding.approvedTotal)}</p>
              <p className="mt-1 text-xs text-gray-500">
                Approved — not released · {funding.submittedCount} submitted
              </p>
            </button>
          )}
        </div>
      )}

      {active.id === "project-costs" && (
        <div className="mt-5 rounded-lg border border-stone-200 bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">Approved</p>
              <p className="mt-1 text-xl font-semibold">{money(costs.approvedTotal)}</p>
              <p className="text-xs text-gray-500">{costs.approvedCount} claims</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Awaiting review</p>
              <p className="mt-1 text-xl font-semibold">{costs.awaitingReviewCount}</p>
            </div>
          </div>
          {costsStatus === "loading" && <p className="mt-4 text-sm text-gray-600">Loading project costs…</p>}
          <Link
            to="/admin/site-costs"
            className="mt-4 inline-block text-sm font-semibold text-botanique-green hover:underline"
          >
            View all Project Costs →
          </Link>
        </div>
      )}

      {active.id === "funding" && (
        <div className="mt-5 rounded-lg border border-stone-200 bg-white p-4">
          <p className="text-sm text-gray-600">
            Requests for Principal authority to make money available against approved claims. No
            funds have been released.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">Approved — not released</p>
              <p className="mt-1 text-xl font-semibold">{money(funding.approvedTotal)}</p>
              <p className="text-xs text-gray-500">{funding.approvedCount} requests</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Submitted, awaiting decision</p>
              <p className="mt-1 text-xl font-semibold">{funding.submittedCount}</p>
            </div>
          </div>
          {fundsStatus === "loading" && <p className="mt-4 text-sm text-gray-600">Loading fund requests…</p>}
          <Link
            to="/admin/fund-requests"
            className="mt-4 inline-block text-sm font-semibold text-botanique-green hover:underline"
          >
            View all Fund Requests →
          </Link>
        </div>
      )}
    </section>
  );
}
