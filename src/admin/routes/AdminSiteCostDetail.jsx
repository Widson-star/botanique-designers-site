import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useSiteCosts } from "../context/siteCosts";
import {
  canCancelSiteCost, canDecideSiteCost, canEditSiteCost, canSubmitSiteCost,
  canWithdrawSiteCost, SITE_COST_LIFECYCLES,
} from "../utils/siteCostCapabilities";
import { profilePresentationName } from "../utils/personName";

const money = (amount) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", currencyDisplay: "code" }).format(amount || 0);
const when = (value) => value ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const EVENT_LABELS = { created: "Draft created", amended: "Claim amended", submitted: "Submitted for review", amendment_requested: "Amendment requested", resubmitted: "Resubmitted", approved: "Approved", rejected: "Rejected", withdrawn: "Withdrawn", cancelled: "Cancelled", principal_authorised: "Principal authorised directly" };

export default function AdminSiteCostDetail() {
  const { claimId } = useParams();
  const navigate = useNavigate();
  const { role, currentUserId, projects, profiles } = useAdminData();
  const { claims, linesForClaim, eventsByClaim, loadEvents, submitClaim, withdrawClaim, decideClaim, cancelClaim, refresh, status } = useSiteCosts();
  const claim = claims.find((item) => item.id === claimId);
  const lines = claim ? linesForClaim(claim.id) : [];
  const events = eventsByClaim[claimId] || [];
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const project = projects.find((item) => item.id === claim?.projectId);
  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);

  useEffect(() => { if (claimId) loadEvents(claimId).catch(() => {}); }, [claimId, loadEvents]);
  if (status === "loading" && !claim) return <p className="text-sm text-gray-600">Loading site cost…</p>;
  if (!claim) return <section><h1 className="text-2xl font-semibold">Site cost unavailable</h1><p className="mt-2 text-sm text-gray-600">It may not exist or you may not have project authority.</p><Link to="/admin/site-costs" className="mt-4 inline-block text-sm font-medium text-botanique-green">Back to Site Costs</Link></section>;

  async function act(operation) {
    if (working) return;
    setWorking(true); setError("");
    const result = await operation();
    setWorking(false);
    if (!result.ok) setError(result.stale ? "This claim changed elsewhere. The latest version has been reloaded." : result.error);
    await refresh(); await loadEvents(claim.id, true).catch(() => {});
  }

  const actorName = (id) => profileMap.get(id) ? profilePresentationName(profileMap.get(id), { formal: true }) : "Authorised user";
  return <section className="mx-auto max-w-6xl">
    <Link to="/admin/site-costs" className="text-sm font-medium text-botanique-green hover:underline">← Site Costs</Link>
    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-2xl font-semibold">{claim.recipientLabel}</h1><p className="mt-1 text-sm text-gray-600">{project?.projectName || "Project"} · {claim.category.replaceAll("_", " ")} · request round {claim.requestRound}</p></div><span className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-semibold">{SITE_COST_LIFECYCLES[claim.lifecycle]}</span></div>
    <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">This is an internal cost obligation. Approval does not mean funded, released, paid, or reconciled.</div>
    {claim.dailySiteSnapshot && <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950"><p className="font-semibold">Daily Site planning source</p><p className="mt-1">Work date {claim.dailySiteSnapshot.work_date} · source version {claim.dailySiteSourceVersion} · planning state {claim.dailySiteSnapshot.state}</p><p className="mt-1 text-xs">This preserved planning snapshot does not change with later Daily Site edits.</p></div>}
    {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <div className="mt-5 grid gap-5 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-5">
        <div className="rounded-lg border border-stone-200 bg-white p-5"><h2 className="font-semibold">Claim summary</h2><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-gray-500">Purpose</dt><dd className="mt-1">{claim.purpose}</dd></div><div><dt className="text-gray-500">Service date</dt><dd className="mt-1">{claim.serviceDate}</dd></div><div><dt className="text-gray-500">Recipient type</dt><dd className="mt-1 capitalize">{claim.recipientType.replaceAll("_", " ")}</dd></div><div><dt className="text-gray-500">Requester</dt><dd className="mt-1">{actorName(claim.requesterId)}</dd></div>{claim.deciderId && <div><dt className="text-gray-500">Principal decision by</dt><dd className="mt-1">{actorName(claim.deciderId)}</dd></div>}<div><dt className="text-gray-500">Authoritative amount</dt><dd className="mt-1 text-xl font-semibold">{money(claim.approvedTotal ?? claim.submittedTotal ?? lines.reduce((sum, line) => sum + line.lineTotal, 0))}</dd></div></dl></div>
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white"><div className="px-5 py-4"><h2 className="font-semibold">Structured cost lines</h2></div><div className="divide-y divide-stone-100">{lines.map((line) => <div key={line.id} className="grid gap-1 px-5 py-4 text-sm sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="font-medium">{line.description}</p><p className="text-xs text-gray-500">{line.quantity} {line.unit} × {money(line.unitRate)} · {line.rateType.replaceAll("_", " ")}</p></div><p className="font-semibold">{money(line.lineTotal)}</p></div>)}</div></div>
        <div className="rounded-lg border border-stone-200 bg-white p-5"><h2 className="font-semibold">Immutable history</h2><ol className="mt-4 space-y-4">{events.map((event) => <li key={event.id} className="border-l-2 border-botanique-green pl-4 text-sm"><p className="font-semibold">{EVENT_LABELS[event.eventType] || event.eventType}</p><p className="text-xs text-gray-500">{actorName(event.actorId)} · {when(event.occurredAt)} · round {event.requestRound}</p>{event.reason && <p className="mt-1 text-gray-700">{event.reason}</p>}</li>)}</ol></div>
      </div>
      <aside className="space-y-4">
        {(canDecideSiteCost(claim, role) || canCancelSiteCost(claim, role)) && <div className="rounded-lg border border-stone-200 bg-white p-5"><h2 className="font-semibold">Principal action</h2><label className="mt-3 block text-sm font-medium">Reason or instructions<textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2.5" /></label>{canDecideSiteCost(claim, role) && <div className="mt-3 grid gap-2"><button disabled={working} onClick={() => act(() => decideClaim(claim.id, claim.version, "approved", reason))} className="min-h-11 rounded-md bg-botanique-green px-3 text-sm font-semibold text-white">Approve whole claim</button><button disabled={working || !reason.trim()} onClick={() => act(() => decideClaim(claim.id, claim.version, "amendment_requested", reason))} className="min-h-11 rounded-md border border-amber-400 px-3 text-sm font-semibold text-amber-900 disabled:opacity-50">Request amendment</button><button disabled={working || !reason.trim()} onClick={() => act(() => decideClaim(claim.id, claim.version, "rejected", reason))} className="min-h-11 rounded-md border border-red-300 px-3 text-sm font-semibold text-red-700 disabled:opacity-50">Reject claim</button></div>}{canCancelSiteCost(claim, role) && <button disabled={working || !reason.trim()} onClick={() => act(() => cancelClaim(claim.id, claim.version, reason))} className="mt-3 min-h-11 w-full rounded-md border border-red-300 px-3 text-sm font-semibold text-red-700 disabled:opacity-50">Cancel approved claim</button>}</div>}
        {(canEditSiteCost(claim, role, currentUserId) || canSubmitSiteCost(claim, role, currentUserId) || canWithdrawSiteCost(claim, role, currentUserId)) && <div className="rounded-lg border border-stone-200 bg-white p-5"><h2 className="font-semibold">Manager action</h2><div className="mt-3 grid gap-2">{canEditSiteCost(claim, role, currentUserId) && <button onClick={() => navigate(`/admin/site-costs/${claim.id}/edit`)} className="min-h-11 rounded-md border border-stone-300 px-3 text-sm font-semibold">Edit claim</button>}{canSubmitSiteCost(claim, role, currentUserId) && <button disabled={working} onClick={() => act(() => submitClaim(claim.id, claim.version))} className="min-h-11 rounded-md bg-botanique-green px-3 text-sm font-semibold text-white">{claim.lifecycle === "draft" ? "Submit for review" : "Resubmit for review"}</button>}{canWithdrawSiteCost(claim, role, currentUserId) && <button disabled={working} onClick={() => act(() => withdrawClaim(claim.id, claim.version, reason))} className="min-h-11 rounded-md border border-red-300 px-3 text-sm font-semibold text-red-700">Withdraw claim</button>}</div></div>}
      </aside>
    </div>
  </section>;
}
