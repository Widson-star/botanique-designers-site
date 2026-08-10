import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useSiteCosts } from "../context/siteCosts";
import { useFundRequests } from "../context/fundRequests";
import { canSeeSiteCosts } from "../utils/siteCostCapabilities";
import { canSeeFundRequests } from "../utils/fundRequestCapabilities";
import { formatKes } from "../utils/dailySiteFormatters";
import { Disc } from "../components/ui/Surfaces";

// Finance landing.
//
// Authority: the committed Finance PNGs plus the Founder amendments recorded on
// 10 Aug 2026. Finance now expands in the sidebar into four children, so this
// landing page does not repeat that navigation as a second five-tab system.
// Its only job is to show the four Finance areas together, their most useful
// current fact, and a clear way into each area.
//
// Simple Invoice is used only as a simplicity reference: one page, one job,
// compact information and obvious next actions. It is not a visual authority.

const AREAS = [
  {
    id: "project-costs",
    label: "Project Costs",
    description: "Project-related costs, approvals, payments and balances.",
    to: "/admin/site-costs",
    icon: "calendar",
  },
  {
    id: "company-expenses",
    label: "Company Expenses",
    description: "Operating expenses, subscriptions and company bills.",
    to: "/admin/finance/company-expenses",
    icon: "doc",
    unbuilt: true,
  },
  {
    id: "staff-compensation",
    label: "Staff Compensation",
    description: "Staff payments, allowances and compensation.",
    to: "/admin/finance/staff-compensation",
    icon: "people",
    unbuilt: true,
  },
  {
    id: "funding",
    label: "Funding, Payments & Reconciliation",
    description: "Money requested in advance, money paid, and advances to account for.",
    to: "/admin/fund-requests",
    icon: "money",
  },
];

export default function AdminFinance() {
  const { role, projects } = useAdminData();
  const { claims, status: costsStatus } = useSiteCosts();
  const { requests, releases, status: fundsStatus } = useFundRequests();

  const canCosts = canSeeSiteCosts(role);
  const canFunds = canSeeFundRequests(role);
  const loading = costsStatus === "loading" || fundsStatus === "loading";

  const projectName = useMemo(
    () => Object.fromEntries(projects.map((project) => [project.id, project.projectName])),
    [projects]
  );

  if (!canCosts && !canFunds) {
    return (
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h1 className="text-xl font-semibold">Finance unavailable</h1>
        <p className="mt-1 text-[13px] text-gray-600">Your role does not have access to Finance.</p>
      </section>
    );
  }

  const awaitingClaims = claims.filter((claim) => claim.lifecycle === "awaiting_review");
  const approvedClaims = claims.filter((claim) => claim.lifecycle === "approved");
  const awaitingRequests = requests.filter((request) => request.status === "submitted");
  const liveReleases = releases.filter((release) => release.status !== "reversed");

  const awaitingClaimAmount = sumClaims(awaitingClaims, "submittedTotal");
  const approvedClaimAmount = approvedClaims.reduce(
    (sum, claim) => sum + Number(claim.approvedTotal ?? claim.submittedTotal ?? 0),
    0
  );
  const paidAmount = liveReleases.reduce(
    (sum, release) => sum + Number(release.releasedAmount ?? 0),
    0
  );

  const activity = [
    ...claims.map((claim) => ({
      id: `cost-${claim.id}`,
      title: projectName[claim.projectId] || "Project",
      detail: `${claim.recipientLabel || "Project cost"} · ${plainStatus(claim.lifecycle)}`,
      amount: Number(claim.approvedTotal ?? claim.submittedTotal ?? 0),
      at: claim.updatedAt || claim.decidedAt || claim.submittedAt || "",
      to: `/admin/site-costs/${claim.id}`,
    })),
    ...requests.map((request) => ({
      id: `fund-${request.id}`,
      title: projectName[request.projectId] || "Project",
      detail: `${request.requestNumber || "Funding request"} · ${plainStatus(request.status)}`,
      amount: Number(request.totalRequestedAmount ?? 0),
      at: request.updatedAt || request.submittedAt || "",
      to: `/admin/fund-requests/${request.id}`,
    })),
  ]
    .sort((left, right) => String(right.at).localeCompare(String(left.at)))
    .slice(0, 5);

  return (
    <section className="space-y-4">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-botanique-green">Finance</p>
        <h1 className="mt-1 text-[24px] font-semibold leading-tight">Finance</h1>
        <p className="mt-1 max-w-2xl text-[13px] text-gray-600">
          Project costs, company expenses, staff compensation, funding and payments.
        </p>
      </header>

      {loading && <p className="text-[13px] text-gray-600">Loading Finance…</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Finance areas">
        {AREAS.map((area) => {
          const allowed = area.id === "project-costs"
            ? canCosts
            : area.id === "funding"
              ? canFunds
              : canCosts || canFunds;
          if (!allowed) return null;

          const summary = areaSummary(area.id, {
            awaitingClaims,
            awaitingClaimAmount,
            awaitingRequests,
            liveReleases,
            paidAmount,
          });

          return (
            <article key={area.id} aria-label={area.label} className="flex min-h-[174px] flex-col rounded-xl border border-stone-200 bg-white">
              <div className="flex-1 p-4">
                <div className="flex items-start gap-3">
                  <Disc name={area.icon} tone={area.unbuilt ? "unbuilt" : "brand"} size="h-9 w-9" />
                  <div className="min-w-0">
                    <h2 className={`text-[14px] font-semibold leading-snug ${area.unbuilt ? "text-gray-500" : "text-botanique-charcoal"}`}>
                      {area.label}
                    </h2>
                    <p className="mt-1 text-[11.5px] leading-snug text-gray-500">{area.description}</p>
                  </div>
                </div>

                {area.unbuilt ? (
                  <p className="mt-4 text-[12px] font-medium text-gray-400">Not yet built</p>
                ) : (
                  <div className="mt-4">
                    <p className="text-[11.5px] text-gray-500">{summary.label}</p>
                    <p className="mt-1 text-[22px] font-semibold leading-none tabular-nums text-botanique-charcoal">
                      {summary.value}
                    </p>
                    <p className="mt-1.5 text-[11.5px] text-gray-500">{summary.hint}</p>
                  </div>
                )}
              </div>

              <Link
                to={area.to}
                className="flex min-h-11 items-center justify-between border-t border-stone-100 px-4 text-[12.5px] font-semibold text-botanique-green hover:bg-stone-50"
              >
                {area.unbuilt ? "View area" : `Open ${shortLabel(area.id)}`}
                <span aria-hidden="true">→</span>
              </Link>
            </article>
          );
        })}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl border border-stone-200 bg-white p-4" aria-labelledby="finance-glance-title">
          <h2 id="finance-glance-title" className="text-[14px] font-semibold">Finance at a glance</h2>
          <dl className="mt-3 divide-y divide-stone-100 text-[12.5px]">
            {canCosts && (
              <>
                <MetricRow label="Project costs awaiting decision" value={`${awaitingClaims.length} · ${money(awaitingClaimAmount)}`} />
                <MetricRow label="Approved project costs" value={`${approvedClaims.length} · ${money(approvedClaimAmount)}`} />
              </>
            )}
            {canFunds && (
              <>
                <MetricRow label="Funding requests awaiting decision" value={String(awaitingRequests.length)} />
                <MetricRow label="Payments recorded" value={`${liveReleases.length} · ${money(paidAmount)}`} />
              </>
            )}
          </dl>
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-4" aria-labelledby="finance-activity-title">
          <h2 id="finance-activity-title" className="text-[14px] font-semibold">Recent finance activity</h2>
          {activity.length ? (
            <ul className="mt-2 divide-y divide-stone-100">
              {activity.map((item) => (
                <li key={item.id}>
                  <Link to={item.to} className="flex min-h-14 items-center justify-between gap-4 py-2.5 hover:text-botanique-green">
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-semibold">{item.title}</span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-gray-500">{item.detail}</span>
                    </span>
                    <span className="shrink-0 text-[12px] font-semibold tabular-nums">{money(item.amount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[12.5px] text-gray-500">No finance activity has been recorded yet.</p>
          )}
        </section>
      </div>
    </section>
  );
}

function MetricRow({ label, value }) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-4 py-2">
      <dt className="text-gray-600">{label}</dt>
      <dd className="shrink-0 font-semibold tabular-nums text-botanique-charcoal">{value}</dd>
    </div>
  );
}

function areaSummary(id, data) {
  if (id === "project-costs") {
    return {
      label: "Awaiting decision",
      value: money(data.awaitingClaimAmount),
      hint: `${data.awaitingClaims.length} ${data.awaitingClaims.length === 1 ? "cost" : "costs"}`,
    };
  }
  if (id === "funding") {
    return {
      label: "Payments recorded",
      value: money(data.paidAmount),
      hint: `${data.liveReleases.length} ${data.liveReleases.length === 1 ? "payment" : "payments"}`,
    };
  }
  return { label: "", value: "", hint: "" };
}

function sumClaims(claims, field) {
  return claims.reduce((sum, claim) => sum + Number(claim[field] ?? 0), 0);
}

function money(amount) {
  return formatKes(Number(amount || 0));
}

function shortLabel(id) {
  if (id === "project-costs") return "Project Costs";
  if (id === "funding") return "Funding & Payments";
  return "area";
}

function plainStatus(value) {
  const text = String(value || "").replaceAll("_", " ");
  return text ? `${text[0].toUpperCase()}${text.slice(1)}` : "";
}
