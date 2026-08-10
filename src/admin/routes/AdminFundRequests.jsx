// Funding, Payments & Reconciliation.
//
// AUTHORITY: 13-finance-children-working-authority.png, capability panel ④.
// The image gives this capability four metric tiles in lifecycle order —
// Submitted → Approved → Paid → Reconciliation — and a request table whose last
// three columns are Status, Paid and Reconciled. That is already the separation
// the Founder asked for, so it is reproduced rather than replaced.
//
// FOUNDER RULING, 10 August 2026: keep this as ONE Finance child, but make the
// three jobs inside it plainly separate, because one undifferentiated page was
// cumbersome:
//
//   FUNDING        asking for money to be made available BEFORE it is spent
//   PAYMENTS       money that actually moved
//   RECONCILIATION accountable advances that must be accounted for
//
// They are three sections of one page, reachable by three in-page controls. NO
// new top-level navigation was invented; the sidebar still holds one child, as
// the image draws it.
//
// Short section labels are used because the context is already Finance. The full
// canonical name stays on the page title and in the authority documents.
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useFundRequests } from "../context/fundRequests";
import {
  canDirectAuthoriseFundRequest, FUND_REQUEST_STATUSES, INTENDED_CUSTODY_TYPES,
} from "../utils/fundRequestCapabilities";
import {
  CUSTODY_DISPOSITIONS, isAccountableAdvance, liveReleases, PAYMENT_CHANNELS,
} from "../utils/fundReleaseCapabilities";
import { portfolioPosition, requestPositions } from "../utils/financePortfolio";
import { describeActiveFilters, withinReportedPeriod } from "../utils/listUrlFilters";
import { Chip, Disc, Glyph } from "../components/ui/Surfaces";

const money = (amount) => new Intl.NumberFormat("en-KE", {
  style: "currency", currency: "KES", currencyDisplay: "code", maximumFractionDigits: 2,
}).format(amount || 0);
const date = (value) => value
  ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(value))
  : "—";

// The three jobs, in the order money actually travels.
const SECTIONS = [
  { id: "funding", label: "Funding", blurb: "Requests for money to be made available before it is spent." },
  { id: "payments", label: "Payments", blurb: "Money that has actually moved." },
  { id: "reconciliation", label: "Reconciliation", blurb: "Accountable advances that must be accounted for." },
];

export default function AdminFundRequests() {
  const { role, projects, profilesById } = useAdminData();
  const { requests, releases, acquittals, status, error } = useFundRequests();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = searchParams.get("section") || "funding";
  const statusFilter = searchParams.get("status") || "all";
  const projectId = searchParams.get("project") || "all";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  function setParam(key, value, fallback = "all") {
    const next = new URLSearchParams(searchParams);
    if (value && value !== fallback) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const isPrincipal = canDirectAuthoriseFundRequest(role);

  const visible = requests.filter((request) =>
    (statusFilter === "all" || request.status === statusFilter) &&
    (projectId === "all" || request.projectId === projectId) &&
    withinReportedPeriod(request.submittedAt, request.decidedAt, from, to));

  const scoped = { requests: visible, releases: releases || [], acquittals: acquittals || [] };
  const position = portfolioPosition(scoped);
  const positions = requestPositions(scoped);
  const byId = new Map(positions.map((row) => [row.request.id, row.position]));
  const submittedCount = visible.filter((r) => r.status === "submitted").length;
  const approved = positions.filter((row) => row.request.status === "approved");

  // Every live release across the requests in view — the Payments section.
  const visibleIds = new Set(visible.map((r) => r.id));
  const payments = liveReleases(releases || [])
    .filter((release) => visibleIds.has(release.fundRequestId))
    .sort((a, b) => String(b.releasedAt || "").localeCompare(String(a.releasedAt || "")));

  // Advances that genuinely require accounting for — the Reconciliation section.
  const acquittalByRelease = new Map((acquittals || []).map((a) => [a.fundReleaseId, a]));
  const advances = payments
    .filter((release) => isAccountableAdvance(release.custodyDisposition))
    .map((release) => ({ release, acquittal: acquittalByRelease.get(release.id) || null }));

  const reconciledCount = advances.filter((a) => a.acquittal?.state === "accepted").length;
  const reconciliationPct = advances.length
    ? Math.round((reconciledCount / advances.length) * 100)
    : null;

  const activeFilterSummary = describeActiveFilters({
    projectName: projectId !== "all" ? projectMap.get(projectId)?.projectName || "one project" : "",
    statusLabel: statusFilter !== "all" ? FUND_REQUEST_STATUSES[statusFilter] : "",
    from, to,
  });

  const activeSection = SECTIONS.find((s) => s.id === section) || SECTIONS[0];
  const personName = (id) => profilesById?.[id]?.full_name || "Operations Manager";

  return (
    <section className="space-y-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-botanique-green">Finance</p>
          <h1 className="mt-1 text-[22px] font-semibold leading-tight">
            Funding, Payments &amp; Reconciliation
          </h1>
          <p className="mt-0.5 max-w-2xl text-[13px] text-gray-600">
            Money made available before it is spent, money that actually moved, and what became of it.
          </p>
        </div>
        <Link
          to="/admin/fund-requests/new"
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-botanique-green px-4 text-[13px] font-semibold text-white hover:bg-botanique-dark"
        >
          <Glyph name="doc" />
          {isPrincipal ? "Authorise funds directly" : "Request funds"}
        </Link>
      </div>

      {/* The lifecycle, in the order the authority tiles it. */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <Tile icon="send" label="Submitted" value={String(submittedCount)} hint={submittedCount === 1 ? "1 request awaiting decision" : `${submittedCount} requests awaiting decision`} tone={submittedCount ? "waiting" : "neutral"} />
        <Tile icon="check" label="Approved" value={money(position.authorisedAmount)} hint={`${approved.length} ${approved.length === 1 ? "authority" : "authorities"} · not yet payment`} />
        <Tile icon="money" label="Paid" value={money(position.releasedAmount)} hint={`${payments.length} ${payments.length === 1 ? "payment" : "payments"} recorded`} tone={position.releasedAmount > 0 ? "settled" : "neutral"} />
        <Tile
          icon="scale"
          label="Reconciliation"
          value={reconciliationPct == null ? "—" : `${reconciliationPct}%`}
          hint={advances.length
            ? `${reconciledCount} of ${advances.length} advances accounted for`
            : "No accountable advance outstanding"}
          tone={reconciliationPct != null && reconciliationPct < 100 ? "waiting" : "neutral"}
        />
      </div>

      {/* Three jobs, three sections, one page. */}
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Finance section">
        {SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === activeSection.id}
            onClick={() => setParam("section", item.id, "funding")}
            className={`min-h-10 rounded-lg px-3.5 text-[12.5px] font-semibold transition ${
              item.id === activeSection.id
                ? "bg-botanique-green text-white"
                : "border border-stone-200 bg-white text-gray-600 hover:bg-stone-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="-mt-1.5 px-1 text-[11.5px] text-gray-500">{activeSection.blurb}</p>

      {activeSection.id === "funding" && (
        <div className="grid gap-2.5 rounded-xl border border-stone-200 bg-white p-3.5 sm:grid-cols-2">
          <label className="text-[12px] font-medium text-gray-600">Status
            <select value={statusFilter} onChange={(e) => setParam("status", e.target.value)} className="mt-1 block min-h-10 w-full rounded-lg border border-stone-300 px-2.5 text-[13px]">
              <option value="all">All statuses</option>
              {Object.entries(FUND_REQUEST_STATUSES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="text-[12px] font-medium text-gray-600">Project
            <select value={projectId} onChange={(e) => setParam("project", e.target.value)} className="mt-1 block min-h-10 w-full rounded-lg border border-stone-300 px-2.5 text-[13px]">
              <option value="all">All projects</option>
              {[...new Set([...requests.map((r) => r.projectId), ...(projectId !== "all" ? [projectId] : [])])]
                .map((id) => <option key={id} value={id}>{projectMap.get(id)?.projectName || "Project"}</option>)}
            </select>
          </label>
        </div>
      )}

      {activeFilterSummary && activeSection.id === "funding" && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[12.5px] text-gray-600">
          <span>Filtered to {activeFilterSummary}.</span>
          <Link to="/admin/fund-requests" className="min-h-9 py-1.5 font-semibold text-botanique-green hover:underline">Clear filters</Link>
        </div>
      )}

      {status === "loading" && <p className="text-[13px] text-gray-600">Loading…</p>}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-800">{error}</p>}

      {/* ── FUNDING: the requests, and whether each is paid and reconciled. */}
      {activeSection.id === "funding" && (
        visible.length === 0 ? (
          <Empty>
            No funding request matches this view. A request asks the Principal to make money
            available before a cost is paid — approval is authority, not payment.
          </Empty>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-xl border border-stone-200 bg-white md:block">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-stone-100 bg-[#fbfbfa] text-[11px] uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3.5 py-2.5 font-medium">Request</th>
                    <th className="px-3.5 py-2.5 font-medium">Project / purpose</th>
                    <th className="whitespace-nowrap px-3.5 py-2.5 text-right font-medium">Amount</th>
                    <th className="whitespace-nowrap px-3.5 py-2.5 font-medium">Submitted</th>
                    <th className="px-3.5 py-2.5 font-medium">Status</th>
                    <th className="px-3.5 py-2.5 font-medium">Paid</th>
                    <th className="px-3.5 py-2.5 font-medium">Reconciled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {visible.map((request) => {
                    const pos = byId.get(request.id);
                    const paidLabel = request.status !== "approved" ? "—"
                      : pos.releasedAmount <= 0 ? "Not paid"
                      : pos.releasedAmount >= pos.authorisedAmount ? "Paid" : "Part paid";
                    const recLabel = pos.reconciliationState === "not_required" ? "—"
                      : pos.reconciliationState === "accepted" ? "Yes" : "No";
                    return (
                      <tr key={request.id} className="transition hover:bg-[#fbfbfa]">
                        <td className="whitespace-nowrap px-3.5 py-2.5">
                          <Link to={`/admin/fund-requests/${request.id}`} className="font-semibold text-botanique-green hover:underline">
                            {request.requestNumber}
                          </Link>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span className="block max-w-[15rem] truncate text-botanique-charcoal">
                            {projectMap.get(request.projectId)?.projectName || "Project"}
                          </span>
                          <span className="block max-w-[15rem] truncate text-[11px] text-gray-500">
                            {INTENDED_CUSTODY_TYPES[request.intendedCustodyType]}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-2.5 text-right font-semibold tabular-nums">
                          {money(request.totalRequestedAmount)}
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-2.5 text-gray-600">{date(request.submittedAt || request.updatedAt)}</td>
                        <td className="px-3.5 py-2.5">
                          <Chip tone={request.status === "approved" ? "settled" : request.status === "submitted" ? "waiting" : "neutral"}>
                            {FUND_REQUEST_STATUSES[request.status]}
                          </Chip>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <Chip tone={paidLabel === "Paid" ? "settled" : paidLabel === "Part paid" ? "waiting" : "neutral"}>
                            {paidLabel}
                          </Chip>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <Chip tone={recLabel === "Yes" ? "settled" : recLabel === "No" ? "waiting" : "neutral"}>
                            {recLabel}
                          </Chip>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className="space-y-2.5 md:hidden">
              {visible.map((request) => {
                const pos = byId.get(request.id);
                return (
                  <li key={request.id} className="rounded-xl border border-stone-200 bg-white p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={`/admin/fund-requests/${request.id}`} className="block font-semibold text-botanique-green hover:underline">
                          {request.requestNumber}
                        </Link>
                        <p className="mt-0.5 break-words text-[12.5px] text-gray-600">
                          {projectMap.get(request.projectId)?.projectName || "Project"}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums">{money(request.totalRequestedAmount)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Chip tone={request.status === "approved" ? "settled" : "waiting"}>{FUND_REQUEST_STATUSES[request.status]}</Chip>
                      {request.status === "approved" && (
                        <Chip tone={pos.releasedAmount > 0 ? "settled" : "neutral"}>
                          {pos.releasedAmount > 0 ? `${money(pos.releasedAmount)} paid` : "Not paid"}
                        </Chip>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )
      )}

      {/* ── PAYMENTS: money that actually moved. No database vocabulary. */}
      {activeSection.id === "payments" && (
        payments.length === 0 ? (
          <Empty>
            No payment has been recorded here yet. A payment is recorded against an approved
            funding request when money actually leaves Botanique.
          </Empty>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-stone-100 bg-[#fbfbfa] text-[11px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="whitespace-nowrap px-3.5 py-2.5 font-medium">Date</th>
                  <th className="px-3.5 py-2.5 font-medium">Reference</th>
                  <th className="px-3.5 py-2.5 font-medium">Paid to</th>
                  <th className="px-3.5 py-2.5 font-medium">Channel</th>
                  <th className="whitespace-nowrap px-3.5 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-3.5 py-2.5 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {payments.map((release) => (
                  <tr key={release.id} className="transition hover:bg-[#fbfbfa]">
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-gray-600">{date(release.releasedAt)}</td>
                    <td className="px-3.5 py-2.5">
                      <span className="block font-medium text-botanique-charcoal">{release.releaseNumber || "—"}</span>
                      <span className="block max-w-[12rem] truncate text-[11px] text-gray-500">{release.paymentReference || "No reference"}</span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="block max-w-[14rem] truncate text-botanique-charcoal">
                        {isAccountableAdvance(release.custodyDisposition)
                          ? personName(release.recipientProfileId)
                          : release.recipientLabel || "Payee"}
                      </span>
                      <span className="block text-[11px] text-gray-500">
                        {CUSTODY_DISPOSITIONS[release.custodyDisposition]}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-gray-600">{PAYMENT_CHANNELS[release.paymentChannel] || "—"}</td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-right font-semibold tabular-nums">{money(release.releasedAmount)}</td>
                    <td className="px-3.5 py-2.5 text-right">
                      <Link to={`/admin/fund-requests/${release.fundRequestId}`} className="text-[12.5px] font-semibold text-botanique-green hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── RECONCILIATION: advances, and what became of them. */}
      {activeSection.id === "reconciliation" && (
        advances.length === 0 ? (
          <Empty>
            Nothing needs accounting for. Only an accountable advance — money handed to someone to
            spend on Botanique&rsquo;s behalf — has to be reconciled. A direct settled payment does not.
          </Empty>
        ) : (
          <div className="space-y-2.5">
            {reconciliationPct != null && (
              <div className="rounded-xl border border-stone-200 bg-white p-3.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[12.5px] font-semibold text-botanique-charcoal">Reconciliation progress</p>
                  <p className="text-[12.5px] font-semibold tabular-nums">{reconciliationPct}%</p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-botanique-green" style={{ width: `${reconciliationPct}%` }} />
                </div>
              </div>
            )}
            <ul className="space-y-2.5">
              {advances.map(({ release, acquittal }) => {
                const spent = Number(acquittal?.actualSpendTotal || 0);
                const returned = Number(acquittal?.returnedAmount || 0);
                const outstanding = Math.round((Number(release.releasedAmount) - spent - returned) * 100) / 100;
                return (
                  <li key={release.id} className="rounded-xl border border-stone-200 bg-white p-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <Disc name="people" tone={acquittal?.state === "accepted" ? "settled" : "waiting"} size="h-8 w-8" />
                        <div className="min-w-0">
                          <p className="break-words text-[12.5px] font-semibold text-botanique-charcoal">
                            {personName(release.recipientProfileId)}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            Advanced {money(release.releasedAmount)} on {date(release.releasedAt)}
                          </p>
                        </div>
                      </div>
                      <Chip tone={!acquittal ? "waiting" : acquittal.state === "accepted" ? "settled" : "info"}>
                        {!acquittal ? "Not yet accounted for"
                          : acquittal.state === "accepted" ? "Accounted for"
                          : acquittal.state === "submitted" ? "Awaiting the Principal"
                          : "Sent back for amendment"}
                      </Chip>
                    </div>
                    <dl className="mt-2.5 grid grid-cols-2 gap-2 border-t border-stone-100 pt-2.5 text-[12px] sm:grid-cols-4">
                      <div><dt className="text-gray-500">Advanced</dt><dd className="font-semibold tabular-nums">{money(release.releasedAmount)}</dd></div>
                      <div><dt className="text-gray-500">Spent</dt><dd className="tabular-nums">{acquittal ? money(spent) : "—"}</dd></div>
                      <div><dt className="text-gray-500">Returned</dt><dd className="tabular-nums">{acquittal ? money(returned) : "—"}</dd></div>
                      <div>
                        <dt className="text-gray-500">Unaccounted</dt>
                        <dd className={`tabular-nums ${outstanding > 0 ? "font-semibold text-amber-800" : ""}`}>
                          {acquittal ? money(Math.max(outstanding, 0)) : money(release.releasedAmount)}
                        </dd>
                      </div>
                    </dl>
                    <Link to={`/admin/fund-requests/${release.fundRequestId}`} className="mt-2.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-botanique-green hover:underline">
                      {acquittal ? "View reconciliation" : "Account for this advance"}
                      <Glyph name="arrow" className="h-3.5 w-3.5" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )
      )}
    </section>
  );
}

function Tile({ icon, label, value, hint, tone = "neutral" }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-3.5 py-3">
      <div className="flex items-center gap-2.5">
        <Disc name={icon} tone={tone} size="h-8 w-8" />
        <p className="min-w-0 truncate text-[11.5px] text-gray-500">{label}</p>
      </div>
      <p className="mt-2 break-words text-[19px] font-semibold leading-none tabular-nums text-botanique-charcoal">{value}</p>
      {hint && <p className="mt-1.5 truncate text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
}

function Empty({ children }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-stone-200 bg-white px-4 py-3.5">
      <Disc name="pause" tone="unbuilt" size="h-8 w-8" />
      <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-gray-600">{children}</p>
    </div>
  );
}
