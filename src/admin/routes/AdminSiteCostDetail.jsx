import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useSiteCosts } from "../context/siteCosts";
import { useFundRequests } from "../context/fundRequests";
import { useDailySiteOperations } from "../context/dailySiteOperations";
import {
  canCancelSiteCost, canDecideSiteCost, canEditSiteCost, canSubmitSiteCost,
  canSubmitCostFromDailySite, costSubmissionBlockedReason,
  canWithdrawSiteCost, SITE_COST_LIFECYCLES,
} from "../utils/siteCostCapabilities";
import { profilePresentationName } from "../utils/personName";
import { fundingForClaims } from "../utils/claimFunding";
import { possibleDuplicateClaims } from "../utils/duplicateCostClaim";
import { costReference } from "../utils/costReference";
import FundingPositionPanel from "../components/finance/FundingPositionPanel";

const money = (amount) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", currencyDisplay: "code" }).format(amount || 0);
const when = (value) => value ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

function costHeadline(claim) {
  const purpose = String(claim?.purpose || "").split("\n").map((part) => part.trim()).filter(Boolean);
  if (purpose.length) return purpose.join(" — ");
  return claim?.recipientLabel || costReference(claim);
}

const EVENT_LABELS = {
  created: "Draft created",
  amended: "Project Cost amended",
  submitted: "Submitted for review",
  amendment_requested: "Amendment requested",
  resubmitted: "Resubmitted",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  cancelled: "Cancelled",
  principal_authorised: "Principal authorised directly",
};

export default function AdminSiteCostDetail() {
  const { claimId } = useParams();
  const navigate = useNavigate();
  const { role, currentUserId, projects, profiles } = useAdminData();
  const { claims, linesForClaim, eventsByClaim, loadEvents, submitClaim, withdrawClaim, decideClaim, cancelClaim, refresh, status } = useSiteCosts();
  const { requests, allocations, releases, acquittals } = useFundRequests();
  const { entries: dailyEntries = [] } = useDailySiteOperations();
  const possibleDuplicates = useMemo(
    () => claimId ? possibleDuplicateClaims(claims.find((item) => item.id === claimId), claims, linesForClaim) : [],
    [claimId, claims, linesForClaim]
  );
  const claim = claims.find((item) => item.id === claimId);
  const sourceEntry = claim?.dailySiteEntryId
    ? dailyEntries.find((item) => item.id === claim.dailySiteEntryId) || null
    : null;
  const lines = claim ? linesForClaim(claim.id) : [];
  const events = eventsByClaim[claimId] || [];
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const project = projects.find((item) => item.id === claim?.projectId);
  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const funding = useMemo(
    () => claimId ? fundingForClaims([claimId], { requests, allocations, releases, acquittals }) : null,
    [claimId, requests, allocations, releases, acquittals]
  );

  useEffect(() => { if (claimId) loadEvents(claimId).catch(() => {}); }, [claimId, loadEvents]);
  if (status === "loading" && !claim) return <p className="text-sm text-gray-600">Loading Project Cost…</p>;
  if (!claim) return <section><h1 className="text-2xl font-semibold">Project Cost unavailable</h1><p className="mt-2 text-sm text-gray-600">It may not exist or you may not have project authority.</p><Link to="/admin/site-costs" className="mt-4 inline-block text-sm font-medium text-botanique-green">Back to Project Costs</Link></section>;

  async function act(operation) {
    if (working) return;
    setWorking(true); setError("");
    const result = await operation();
    setWorking(false);
    if (!result.ok) setError(result.stale ? "This Project Cost changed elsewhere. The latest version has been reloaded." : result.error);
    await refresh(); await loadEvents(claim.id, true).catch(() => {});
  }

  const actorName = (id) => profileMap.get(id) ? profilePresentationName(profileMap.get(id), { formal: true }) : "Authorised user";
  return <section className="mx-auto max-w-6xl">
    <Link to="/admin/site-costs" className="text-sm font-medium text-botanique-green hover:underline">← Project Costs</Link>
    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-2xl font-semibold">{costHeadline(claim)}</h1><p className="mt-1 text-sm text-gray-600">{project?.projectName || "Project"} · {costReference(claim)} · {SITE_COST_LIFECYCLES[claim.lifecycle]}</p></div><span className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-semibold">{SITE_COST_LIFECYCLES[claim.lifecycle]}</span></div>
    <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-gray-700">Approval does not mean paid. Payment is recorded separately against the Project Cost.</div>
    {claim.lifecycle === "approved" && <div className="mt-4"><FundingPositionPanel funding={funding} headingId="claim-funding-position" /></div>}
    {claim.dailySiteSnapshot && <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950"><p className="font-semibold">Daily Site planning source</p><p className="mt-1">Work date {claim.dailySiteSnapshot.work_date} · source version {claim.dailySiteSourceVersion} · planning state {claim.dailySiteSnapshot.state}</p><p className="mt-1 text-xs">This preserved planning snapshot does not change with later Daily Site edits.</p></div>}
    {possibleDuplicates.length > 0 && <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-semibold">Possible duplicate</p>
      <p className="mt-1">
        {possibleDuplicates.length === 1 ? "Another Project Cost" : `${possibleDuplicates.length} other Project Costs`} from
        this Daily Site Record {possibleDuplicates.length === 1 ? "contains" : "contain"} an identical cost line.
        Check before deciding — this may be a genuinely additional cost, or the same cost entered twice.
      </p>
      <ul className="mt-2 space-y-1">{possibleDuplicates.map((other) => <li key={other.id}>
        <Link to={`/admin/site-costs/${other.id}`} className="font-semibold text-botanique-green hover:underline">
          {costHeadline(other)} · {money(other.approvedTotal ?? other.submittedTotal)}
        </Link>
        <span className="text-xs"> · {SITE_COST_LIFECYCLES[other.lifecycle] || other.lifecycle}</span>
      </li>)}</ul>
    </div>}
    {claim.dailySiteEntryId && <Link to={`/admin/daily-site-operations/${claim.dailySiteEntryId}`} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-botanique-green hover:underline">← Back to the Daily Site Record</Link>}
    {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <div className="mt-5 grid gap-5 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-5">
        <div className="rounded-lg border border-stone-200 bg-white p-5"><h2 className="font-semibold">Project Cost summary</h2><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-gray-500">Purpose</dt><dd className="mt-1">{claim.purpose}</dd></div><div><dt className="text-gray-500">Service date</dt><dd className="mt-1">{claim.serviceDate}</dd></div><div><dt className="text-gray-500">Recipient type</dt><dd className="mt-1 capitalize">{claim.recipientType.replaceAll("_", " ")}</dd></div><div><dt className="text-gray-500">Requested by</dt><dd className="mt-1">{actorName(claim.requesterId)}</dd></div>{claim.deciderId && <div><dt className="text-gray-500">Principal decision by</dt><dd className="mt-1">{actorName(claim.deciderId)}</dd></div>}<div><dt className="text-gray-500">Current amount</dt><dd className="mt-1 text-xl font-semibold">{money(claim.approvedTotal ?? claim.submittedTotal ?? lines.reduce((sum, line) => sum + line.lineTotal, 0))}</dd></div></dl></div>
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white"><div className="px-5 py-4"><h2 className="font-semibold">Cost breakdown</h2></div><div className="divide-y divide-stone-100">{lines.map((line) => <div key={line.id} className="grid gap-1 px-5 py-4 text-sm sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="font-medium">{line.description}</p><p className="text-xs text-gray-500">{line.quantity} {line.unit} × {money(line.unitRate)} · {line.rateType.replaceAll("_", " ")}</p></div><p className="font-semibold">{money(line.lineTotal)}</p></div>)}</div></div>
        <div className="rounded-lg border border-stone-200 bg-white p-5"><h2 className="font-semibold">History</h2><ol className="mt-4 space-y-4">{events.map((event) => <li key={event.id} className="border-l-2 border-botanique-green pl-4 text-sm"><p className="font-semibold">{EVENT_LABELS[event.eventType] || event.eventType}</p><p className="text-xs text-gray-500">{actorName(event.actorId)} · {when(event.occurredAt)}</p>{event.reason && <p className="mt-1 text-gray-700">{event.reason}</p>}</li>)}</ol></div>
      </div>
      <aside className="space-y-4">
        {(canDecideSiteCost(claim, role) || canCancelSiteCost(claim, role)) && <div className="rounded-lg border border-stone-200 bg-white p-5"><h2 className="font-semibold">Principal action</h2><label className="mt-3 block text-sm font-medium">Reason or instructions<textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2.5" /></label>{canDecideSiteCost(claim, role) && <div className="mt-3 grid gap-2"><button disabled={working} onClick={() => act(() => decideClaim(claim.id, claim.version, "approved", reason))} className="min-h-11 rounded-md bg-botanique-green px-3 text-sm font-semibold text-white">Approve Project Cost</button><button disabled={working || !reason.trim()} onClick={() => act(() => decideClaim(claim.id, claim.version, "amendment_requested", reason))} className="min-h-11 rounded-md border border-amber-400 px-3 text-sm font-semibold text-amber-900 disabled:opacity-50">Request amendment</button><button disabled={working || !reason.trim()} onClick={() => act(() => decideClaim(claim.id, claim.version, "rejected", reason))} className="min-h-11 rounded-md border border-red-300 px-3 text-sm font-semibold text-red-700 disabled:opacity-50">Reject Project Cost</button></div>}{canCancelSiteCost(claim, role) && <button disabled={working || !reason.trim()} onClick={() => act(() => cancelClaim(claim.id, claim.version, reason))} className="mt-3 min-h-11 w-full rounded-md border border-red-300 px-3 text-sm font-semibold text-red-700 disabled:opacity-50">Cancel approved Project Cost</button>}</div>}
        {(canEditSiteCost(claim, role, currentUserId) || canSubmitSiteCost(claim, role, currentUserId) || canWithdrawSiteCost(claim, role, currentUserId)) && <div className="rounded-lg border border-stone-200 bg-white p-5"><h2 className="font-semibold">Manager action</h2><div className="mt-3 grid gap-2">{canEditSiteCost(claim, role, currentUserId) && <button onClick={() => navigate(`/admin/site-costs/${claim.id}/edit`)} className="min-h-11 rounded-md border border-stone-300 px-3 text-sm font-semibold">Edit Project Cost</button>}{canSubmitSiteCost(claim, role, currentUserId) && (sourceEntry && !canSubmitCostFromDailySite(sourceEntry)
          ? <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">{costSubmissionBlockedReason(sourceEntry)}</p>
          : <button disabled={working} onClick={() => act(() => submitClaim(claim.id, claim.version))} className="min-h-11 rounded-md bg-botanique-green px-3 text-sm font-semibold text-white">{claim.lifecycle === "draft" ? "Submit Project Cost for review" : "Resubmit Project Cost for review"}</button>)}{canWithdrawSiteCost(claim, role, currentUserId) && <button disabled={working} onClick={() => act(() => withdrawClaim(claim.id, claim.version, reason))} className="min-h-11 rounded-md border border-red-300 px-3 text-sm font-semibold text-red-700">Withdraw Project Cost</button>}</div></div>}
      </aside>
    </div>
  </section>;
}
