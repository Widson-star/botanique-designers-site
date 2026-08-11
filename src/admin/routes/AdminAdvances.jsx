import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useFundRequests } from "../context/fundRequests";
import { canDirectAuthoriseFundRequest, FUND_REQUEST_STATUSES } from "../utils/fundRequestCapabilities";
import { Chip } from "../components/ui/Surfaces";

// Advances is the user-facing Finance concept. The existing fund-request,
// release and acquittal objects remain implementation details until the agreed
// Finance model is migrated. A reader sees three ordinary jobs:
//
//   Requests  — money requested before expenditure
//   Issued    — advances actually handed over
//   Accounting — whether each advance has been accounted for
//
// “Funding” and “Reconciliation” are deliberately absent from the interface.
const ADVANCE_CUSTODY = "operations_manager_accountable_advance";
const SECTIONS = [
  { id: "requests", label: "Requests" },
  { id: "issued", label: "Issued" },
  { id: "accounting", label: "Accounting" },
];

const money = (amount) => new Intl.NumberFormat("en-KE", {
  style: "currency", currency: "KES", currencyDisplay: "code", maximumFractionDigits: 2,
}).format(Number(amount || 0));

const date = (value) => value
  ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(value))
  : "—";

export default function AdminAdvances() {
  const { role, projects, profilesById } = useAdminData();
  const { requests, releases, acquittals, status, error } = useFundRequests();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = searchParams.get("view") || "requests";
  const isPrincipal = canDirectAuthoriseFundRequest(role);

  const projectMap = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const advanceRequests = requests.filter((request) => request.intendedCustodyType === ADVANCE_CUSTODY);
  const requestIds = new Set(advanceRequests.map((request) => request.id));
  const issued = releases
    .filter((release) =>
      release.status !== "reversed" &&
      release.custodyDisposition === ADVANCE_CUSTODY &&
      requestIds.has(release.fundRequestId)
    )
    .sort((left, right) => String(right.releasedAt || "").localeCompare(String(left.releasedAt || "")));
  const requestById = new Map(advanceRequests.map((request) => [request.id, request]));
  const acquittalByRelease = new Map((acquittals || []).map((item) => [item.fundReleaseId, item]));

  const requestedAmount = advanceRequests
    .filter((request) => request.status === "submitted")
    .reduce((sum, request) => sum + Number(request.totalRequestedAmount || 0), 0);
  const issuedAmount = issued.reduce((sum, release) => sum + Number(release.releasedAmount || 0), 0);
  const awaitingAccounting = issued.filter((release) => acquittalByRelease.get(release.id)?.state !== "accepted");

  function selectSection(next) {
    const params = new URLSearchParams(searchParams);
    if (next === "requests") params.delete("view");
    else params.set("view", next);
    setSearchParams(params, { replace: true });
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-botanique-green">Finance</p>
          <h1 className="mt-1 text-[24px] font-semibold leading-tight">Advances</h1>
          <p className="mt-1 max-w-2xl text-[13px] text-gray-600">
            Money given before expenditure, and whether it has been accounted for.
          </p>
        </div>
        <Link
          to="/admin/fund-requests/new"
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-botanique-green px-4 text-[13px] font-semibold text-white hover:bg-botanique-dark"
        >
          {isPrincipal ? "New advance" : "Request advance"}
        </Link>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-3">
        <Summary label="Awaiting decision" value={money(requestedAmount)} hint={`${advanceRequests.filter((r) => r.status === "submitted").length} requests`} />
        <Summary label="Issued" value={money(issuedAmount)} hint={`${issued.length} advances`} />
        <Summary label="Still to account for" value={String(awaitingAccounting.length)} hint="Open advances" />
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Advance views">
        {SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={section === item.id}
            onClick={() => selectSection(item.id)}
            className={`min-h-10 rounded-lg px-3.5 text-[12.5px] font-semibold ${
              section === item.id
                ? "bg-botanique-green text-white"
                : "border border-stone-200 bg-white text-gray-600 hover:bg-stone-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {status === "loading" && <p className="text-[13px] text-gray-600">Loading advances…</p>}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-800">{error}</p>}

      {section === "requests" && (
        <ListPanel title="Advance requests">
          {advanceRequests.length ? advanceRequests.map((request) => (
            <Row
              key={request.id}
              title={projectMap.get(request.projectId)?.projectName || "Project"}
              subtitle={`${request.requestNumber || "Advance request"} · ${date(request.submittedAt || request.updatedAt)}`}
              amount={money(request.totalRequestedAmount)}
              status={<Chip tone={request.status === "approved" ? "settled" : request.status === "submitted" ? "waiting" : "neutral"}>{FUND_REQUEST_STATUSES[request.status] || plain(request.status)}</Chip>}
              to={`/admin/fund-requests/${request.id}`}
            />
          )) : <Empty>No advance request has been recorded yet.</Empty>}
        </ListPanel>
      )}

      {section === "issued" && (
        <ListPanel title="Issued advances">
          {issued.length ? issued.map((release) => {
            const request = requestById.get(release.fundRequestId);
            return (
              <Row
                key={release.id}
                title={profilesById?.[release.recipientProfileId]?.full_name || "Accountable person"}
                subtitle={`${projectMap.get(request?.projectId)?.projectName || "Project"} · ${date(release.releasedAt)}`}
                amount={money(release.releasedAmount)}
                status={<Chip tone="settled">Issued</Chip>}
                to={`/admin/fund-requests/${release.fundRequestId}`}
              />
            );
          }) : <Empty>No advance has been issued yet.</Empty>}
        </ListPanel>
      )}

      {section === "accounting" && (
        <ListPanel title="Advance accounting">
          {issued.length ? issued.map((release) => {
            const request = requestById.get(release.fundRequestId);
            const account = acquittalByRelease.get(release.id);
            const state = accountingState(account);
            return (
              <Row
                key={release.id}
                title={projectMap.get(request?.projectId)?.projectName || "Project"}
                subtitle={`${profilesById?.[release.recipientProfileId]?.full_name || "Accountable person"} · ${date(release.releasedAt)}`}
                amount={money(release.releasedAmount)}
                status={<Chip tone={state.tone}>{state.label}</Chip>}
                to={`/admin/fund-requests/${release.fundRequestId}`}
              />
            );
          }) : <Empty>There is no issued advance to account for.</Empty>}
        </ListPanel>
      )}
    </section>
  );
}

function Summary({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-[11.5px] text-gray-500">{label}</p>
      <p className="mt-1 text-[22px] font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-[11.5px] text-gray-500">{hint}</p>
    </div>
  );
}

function ListPanel({ title, children }) {
  return (
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="border-b border-stone-100 px-4 py-3">
        <h2 className="text-[13.5px] font-semibold">{title}</h2>
      </div>
      <div className="divide-y divide-stone-100">{children}</div>
    </section>
  );
}

function Row({ title, subtitle, amount, status, to }) {
  return (
    <Link to={to} className="grid gap-2 px-4 py-3 hover:bg-stone-50 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4">
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-semibold text-botanique-charcoal">{title}</span>
        <span className="mt-0.5 block truncate text-[11.5px] text-gray-500">{subtitle}</span>
      </span>
      <span className="text-[12.5px] font-semibold tabular-nums">{amount}</span>
      <span>{status}</span>
    </Link>
  );
}

function Empty({ children }) {
  return <p className="px-4 py-5 text-[12.5px] text-gray-500">{children}</p>;
}

function accountingState(account) {
  if (!account) return { label: "Not yet accounted for", tone: "waiting" };
  if (account.state === "accepted") return { label: "Accounted for", tone: "settled" };
  if (account.state === "amendment_requested") return { label: "Returned for correction", tone: "waiting" };
  return { label: "Submitted for review", tone: "waiting" };
}

function plain(value) {
  const text = String(value || "").replaceAll("_", " ");
  return text ? `${text[0].toUpperCase()}${text.slice(1)}` : "";
}
