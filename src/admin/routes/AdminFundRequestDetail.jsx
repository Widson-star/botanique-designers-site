import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useFundRequests } from "../context/fundRequests";
import {
  canCancelFundRequest, canDecideFundRequest, canEditFundRequest, canSubmitFundRequest,
  canWithdrawFundRequest, FUND_REQUEST_STATUSES, INTENDED_CUSTODY_TYPES,
} from "../utils/fundRequestCapabilities";
import { profilePresentationName } from "../utils/personName";
import FundReleaseSection from "../components/finance/FundReleaseSection";

const money = (amount) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", currencyDisplay: "code" }).format(amount || 0);
const when = (value) => value ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

const EVENT_LABELS = {
  draft_created: "Draft created",
  draft_updated: "Request updated",
  submitted: "Submitted for Principal decision",
  amendment_requested: "Amendment requested",
  resubmitted: "Resubmitted",
  approved: "Approved — not released",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  cancelled: "Cancelled",
  principal_direct_authorised: "Principal authorised funds directly",
};

export default function AdminFundRequestDetail() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { role, currentUserId, projects, profiles } = useAdminData();
  const {
    requests, allocationsForRequest, eventsByRequest, loadEvents, submitRequest,
    withdrawRequest, decideRequest, cancelRequest, refresh, status,
    releasesForRequest, acquittalForRelease, linesForAcquittal, positionForRequest,
    recordRelease, reverseRelease, confirmReceipt, submitAcquittal, decideAcquittal,
  } = useFundRequests();
  const request = requests.find((item) => item.id === requestId);
  const allocations = request ? allocationsForRequest(request.id) : [];
  const releases = request ? releasesForRequest(request.id) : [];
  const position = request ? positionForRequest(request.id) : null;
  const events = eventsByRequest[requestId] || [];
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const project = projects.find((item) => item.id === request?.projectId);
  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);

  useEffect(() => { if (requestId) loadEvents(requestId).catch(() => {}); }, [requestId, loadEvents]);

  if (status === "loading" && !request) return <p className="text-sm text-gray-600">Loading fund request…</p>;
  if (!request) return <section>
    <h1 className="text-2xl font-semibold">Fund request unavailable</h1>
    <p className="mt-2 text-sm text-gray-600">It may not exist or you may not have project authority.</p>
    <Link to="/admin/fund-requests" className="mt-4 inline-block text-sm font-medium text-botanique-green">Back to Funding, Payments and Reconciliation</Link>
  </section>;

  async function act(operation) {
    if (working) return;
    setWorking(true); setError("");
    const result = await operation();
    setWorking(false);
    if (!result.ok) {
      setError(result.stale
        ? "This fund request changed elsewhere. The latest version has been reloaded."
        : result.error);
    }
    await refresh();
    await loadEvents(request.id, true).catch(() => {});
    return result;
  }

  const actorName = (id) => profileMap.get(id)
    ? profilePresentationName(profileMap.get(id), { formal: true })
    : "Authorised user";
  const amendmentReason = [...events].reverse()
    .find((event) => event.eventType === "amendment_requested")?.reason || "";

  return <section className="mx-auto max-w-6xl">
    <Link to="/admin/fund-requests" className="text-sm font-medium text-botanique-green hover:underline">← Fund Requests</Link>
    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold">{request.requestNumber}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {project?.projectName || "Project"} · {INTENDED_CUSTODY_TYPES[request.intendedCustodyType]} · submission round {request.submissionRound}
        </p>
      </div>
      <span className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-semibold">{FUND_REQUEST_STATUSES[request.status]}</span>
    </div>

    {/* Approval is not payment. Before BD-FIN-01C nothing downstream could be recorded, so
        this said so unconditionally. It now states the actual position, and only claims that
        nothing has moved when no release row exists. */}
    <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      {request.status !== "approved"
        ? "A fund request records requested or approved authority only, never a release, transfer, advance receipt or payment."
        : position.releaseState === "none"
          ? "No funds have been released. This approval authorises Botanique to make up to the approved amount available against the listed approved claims. It does not record a release or payment."
          : `${money(position.releasedAmount)} of the ${money(position.authorisedAmount)} authorised has been released. Approval authorised the money; the releases below record that it actually moved.`}
    </div>

    {request.authorityType === "principal_direct" && <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
      <p className="font-semibold">Principal direct authority</p>
      <p className="mt-1">Authorised directly by {actorName(request.directAuthorityActorId)}. This is a distinct authority path, not a submitted and self-approved request.</p>
    </div>}

    {amendmentReason && <div className="mt-4 rounded-lg border border-stone-300 bg-white p-4 text-sm">
      <p className="font-semibold">Amendment requested</p>
      <p className="mt-1 text-gray-700">{amendmentReason}</p>
    </div>}

    {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

    <div className="mt-5 grid gap-5 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-5">
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">Request summary</h2>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-gray-500">Purpose</dt><dd className="mt-1">{request.purpose}</dd></div>
            <div><dt className="text-gray-500">Intended custody</dt><dd className="mt-1">{INTENDED_CUSTODY_TYPES[request.intendedCustodyType]}</dd></div>
            {request.custodianProfileId && <div><dt className="text-gray-500">Intended custodian</dt><dd className="mt-1">{actorName(request.custodianProfileId)}</dd></div>}
            {request.requesterId && <div><dt className="text-gray-500">Requester</dt><dd className="mt-1">{actorName(request.requesterId)}</dd></div>}
            <div>
              <dt className="text-gray-500">{request.status === "approved" ? "Approved fund authority" : "Requested amount"}</dt>
              <dd className="mt-1 text-xl font-semibold">{money(request.totalRequestedAmount)}</dd>
            </div>
          </dl>
        </div>

        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          <div className="px-5 py-4"><h2 className="font-semibold">Approved claim allocations</h2></div>
          <div className="divide-y divide-stone-100">{allocations.map((allocation) => <div key={allocation.id} className="grid gap-1 px-5 py-4 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="font-medium">{allocation.claimRecipientLabel}</p>
              <p className="text-xs text-gray-500">{allocation.claimReference} · {allocation.claimCategory.replaceAll("_", " ")} · {allocation.claimServiceDate}</p>
              <p className="text-xs text-gray-500">Approved claim amount {money(allocation.claimApprovedTotal)}</p>
            </div>
            <p className="font-semibold">{money(allocation.requestedAmount)}</p>
          </div>)}</div>
          <div className="border-t border-stone-200 px-5 py-4 text-right">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-lg font-semibold">{money(request.totalRequestedAmount)}</p>
          </div>
        </div>

        {request.status === "approved" && <FundReleaseSection
          request={request}
          releases={releases}
          acquittalForRelease={acquittalForRelease}
          linesForAcquittal={linesForAcquittal}
          position={position}
          profiles={profiles}
          role={role}
          currentUserId={currentUserId}
          working={working}
          onRecord={(values) => act(() => recordRelease(request.id, values))}
          onReverse={(releaseId, version, reason) => act(() => reverseRelease(releaseId, version, reason))}
          onConfirmReceipt={(releaseId, version) => act(() => confirmReceipt(releaseId, version))}
          onSubmitAcquittal={(releaseId, version, values) => act(() => submitAcquittal(releaseId, version, values))}
          onDecideAcquittal={(acquittalId, version, decision, reason) => act(() => decideAcquittal(acquittalId, version, decision, reason))}
        />}

        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">Immutable history</h2>
          <ol className="mt-4 space-y-4">{events.map((event) => <li key={event.id} className="border-l-2 border-botanique-green pl-4 text-sm">
            <p className="font-semibold">{EVENT_LABELS[event.eventType] || event.eventType}</p>
            <p className="text-xs text-gray-500">{actorName(event.actorId)} · {when(event.createdAt)} · round {event.submissionRound}</p>
            {event.reason && <p className="mt-1 text-gray-700">{event.reason}</p>}
          </li>)}</ol>
        </div>
      </div>

      <aside className="space-y-4">
        {(canDecideFundRequest(request, role) || canCancelFundRequest(request, role)) && <div className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">Principal action</h2>
          {canDecideFundRequest(request, role) && <p className="mt-2 text-xs text-gray-600">
            Approving authorises Botanique to make up to {money(request.totalRequestedAmount)} available against
            the listed approved claims. It does not record a release or payment.
          </p>}
          <label className="mt-3 block text-sm font-medium">Reason or instructions
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2.5" />
          </label>
          {canDecideFundRequest(request, role) && <div className="mt-3 grid gap-2">
            <button disabled={working} onClick={() => act(() => decideRequest(request.id, request.version, "approved", reason))} className="min-h-11 rounded-md bg-botanique-green px-3 text-sm font-semibold text-white">Approve fund authority</button>
            <button disabled={working || !reason.trim()} onClick={() => act(() => decideRequest(request.id, request.version, "amendment_requested", reason))} className="min-h-11 rounded-md border border-amber-400 px-3 text-sm font-semibold text-amber-900 disabled:opacity-50">Request amendment</button>
            <button disabled={working || !reason.trim()} onClick={() => act(() => decideRequest(request.id, request.version, "rejected", reason))} className="min-h-11 rounded-md border border-red-300 px-3 text-sm font-semibold text-red-700 disabled:opacity-50">Reject request</button>
          </div>}
          {/* An authority with real money against it cannot be cancelled — the database
              refuses it, so the action is not offered. */}
          {canCancelFundRequest(request, role) && position.releaseState === "none" && <button disabled={working || !reason.trim()} onClick={() => act(() => cancelRequest(request.id, request.version, reason))} className="mt-3 min-h-11 w-full rounded-md border border-red-300 px-3 text-sm font-semibold text-red-700 disabled:opacity-50">Cancel approved request</button>}
        </div>}

        {(canEditFundRequest(request, role, currentUserId) || canWithdrawFundRequest(request, role, currentUserId)) && <div className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">Operations Manager action</h2>
          {canWithdrawFundRequest(request, role, currentUserId) && request.status !== "draft" && <label className="mt-3 block text-sm font-medium">Withdrawal reason
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2.5" />
          </label>}
          <div className="mt-3 grid gap-2">
            {canEditFundRequest(request, role, currentUserId) && <button onClick={() => navigate(`/admin/fund-requests/${request.id}/edit`)} className="min-h-11 rounded-md border border-stone-300 px-3 text-sm font-semibold">Edit request</button>}
            {canSubmitFundRequest(request, role, currentUserId) && allocations.length > 0 && <button disabled={working} onClick={() => act(() => submitRequest(request.id, request.version))} className="min-h-11 rounded-md bg-botanique-green px-3 text-sm font-semibold text-white">{request.status === "draft" ? "Submit for decision" : "Resubmit for decision"}</button>}
            {canWithdrawFundRequest(request, role, currentUserId) && <button disabled={working || (request.status !== "draft" && !reason.trim())} onClick={() => act(() => withdrawRequest(request.id, request.version, reason))} className="min-h-11 rounded-md border border-red-300 px-3 text-sm font-semibold text-red-700 disabled:opacity-50">Withdraw request</button>}
          </div>
        </div>}
      </aside>
    </div>
  </section>;
}
