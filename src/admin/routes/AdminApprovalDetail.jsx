import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ApprovalComparison from "../components/approvals/ApprovalComparison";
import ApprovalRequestDialog from "../components/approvals/ApprovalRequestDialog";
import MaterialChangeAmendDialog from "../components/approvals/MaterialChangeAmendDialog";
import ApprovalTimeline from "../components/approvals/ApprovalTimeline";
import ConfirmDialog from "../components/ConfirmDialog";
import { useAdminData } from "../context/adminData";
import { useAdminApprovals } from "../context/adminApprovals";
import {
  canAmendApproval,
  canDecideApproval,
  canWithdrawApproval,
  canSeeApprovals,
} from "../utils/approvalCapabilities";
import {
  APPROVAL_STATE_LABELS,
  APPROVAL_TYPE_LABELS,
} from "../utils/approvalFormatters";
import { formatDateTime } from "../utils/activityFormat";
import { profilePresentationName } from "../utils/personName";

export default function AdminApprovalDetail() {
  const { approvalId } = useParams();
  const { role, currentUserId, projects, profilesById } = useAdminData();
  const {
    requests, loadEvents, decide, requestAmendment, amendAndResubmit, withdraw,
  } = useAdminApprovals();
  const [events, setEvents] = useState([]);
  const [eventError, setEventError] = useState("");
  const [action, setAction] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const request = requests.find((item) => item.id === approvalId);
  const project = projects.find((item) => item.id === request?.projectId);
  const requester = profilesById[request?.requesterId];

  useEffect(() => {
    if (!request) return;
    let cancelled = false;
    async function run() {
      try {
        const loaded = await loadEvents(request.id);
        if (!cancelled) setEvents(loaded);
      } catch (error) {
        if (!cancelled) setEventError(error.message || "Unable to load approval history.");
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [loadEvents, request]);

  if (!canSeeApprovals(role)) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-8">
        <h1 className="text-xl font-bold">Approvals unavailable</h1>
        <p className="mt-2 text-sm text-gray-500">This role does not have access to project approvals.</p>
      </div>
    );
  }

  if (!request || !project) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-8">
        <h1 className="text-xl font-bold">Approval unavailable</h1>
        <p className="mt-2 text-sm text-gray-500">This request is unavailable or still loading.</p>
        <Link to="/admin/approvals" className="mt-5 inline-flex font-semibold text-botanique-green hover:underline">
          Back to approvals
        </Link>
      </div>
    );
  }

  async function runAction(operation) {
    setBusy(true);
    setActionError("");
    const result = await operation();
    setBusy(false);
    if (result.ok) {
      setAction("");
      setNotes("");
      setEvents(await loadEvents(request.id, true));
    } else {
      setActionError(
        result.stale
          ? "This request is stale because the project changed. Request an amendment or submit a new request."
          : result.error
      );
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <Link to="/admin/approvals" className="text-sm font-semibold text-botanique-green hover:underline">
          ← Back to approvals
        </Link>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{APPROVAL_TYPE_LABELS[request.approvalType]}</h1>
            <p className="mt-1 text-sm text-gray-500">{project.projectName}</p>
          </div>
          <span className="self-start rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-gray-700">
            {APPROVAL_STATE_LABELS[request.state]}
          </span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="text-base font-semibold">Request</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><dt className="text-xs text-gray-500">Requester</dt><dd className="mt-1 text-sm font-medium">{requester ? profilePresentationName(requester, "Authorised requester") : "Authorised requester"}</dd></div>
            <div><dt className="text-xs text-gray-500">Requested</dt><dd className="mt-1 text-sm">{formatDateTime(request.requestedAt)}</dd></div>
            <div><dt className="text-xs text-gray-500">Round</dt><dd className="mt-1 text-sm">{request.requestRound}</dd></div>
            <div><dt className="text-xs text-gray-500">Project</dt><dd className="mt-1 text-sm">{project.projectName}</dd></div>
          </dl>
          <div className="mt-5">
            <ApprovalComparison request={request} profilesById={profilesById} project={project} />
          </div>
          <div className="mt-5">
            <h3 className="text-xs font-medium text-gray-500">Reason</h3>
            <p className="mt-1 whitespace-pre-line text-sm leading-6">{request.reason}</p>
          </div>
          {request.requesterNotes && (
            <div className="mt-4">
              <h3 className="text-xs font-medium text-gray-500">Requester notes</h3>
              <p className="mt-1 whitespace-pre-line text-sm leading-6">{request.requesterNotes}</p>
            </div>
          )}
          {request.decisionNotes && (
            <div className="mt-4 rounded-md bg-stone-50 p-3">
              <h3 className="text-xs font-medium text-gray-500">Review notes</h3>
              <p className="mt-1 whitespace-pre-line text-sm leading-6">{request.decisionNotes}</p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {canDecideApproval(role, request) && (
              <>
                <button type="button" onClick={() => setAction("approve")} className="rounded-md bg-botanique-green px-3 py-2 text-xs font-semibold text-white hover:bg-botanique-dark">Approve</button>
                <button type="button" onClick={() => setAction("reject")} className="rounded-md border border-stone-300 px-3 py-2 text-xs font-semibold hover:bg-stone-50">Reject</button>
                <button type="button" onClick={() => setAction("amendment")} className="rounded-md border border-stone-300 px-3 py-2 text-xs font-semibold hover:bg-stone-50">Request amendment</button>
              </>
            )}
            {canWithdrawApproval(role, request, currentUserId) && (
              <button type="button" onClick={() => setAction("withdraw")} className="rounded-md border border-stone-300 px-3 py-2 text-xs font-semibold hover:bg-stone-50">Withdraw request</button>
            )}
            {canAmendApproval(role, request, currentUserId) && (
              <button type="button" onClick={() => setAction("edit")} className="rounded-md bg-botanique-green px-3 py-2 text-xs font-semibold text-white hover:bg-botanique-dark">Amend and resubmit</button>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold">Approval timeline</h2>
          {eventError ? <p className="text-sm text-red-700" role="alert">{eventError}</p> : <ApprovalTimeline events={events} profilesById={profilesById} />}
        </section>
      </div>

      {action === "edit" && request.approvalType === "project_material_change" && (
        <MaterialChangeAmendDialog
          request={request}
          onCancel={() => setAction("")}
          onSubmit={(values) => runAction(() => amendAndResubmit(request.id, values))}
        />
      )}
      {action === "edit" && request.approvalType !== "project_material_change" && (
        <ApprovalRequestDialog
          open
          project={project}
          approvalType={request.approvalType}
          initialReason={request.reason}
          initialNotes={request.requesterNotes}
          onCancel={() => setAction("")}
          onSubmit={(values) => runAction(() => amendAndResubmit(request.id, values))}
        />
      )}
      {["approve", "reject", "amendment", "withdraw"].includes(action) && (
        <ConfirmDialog
          open
          title={{
            approve: "Approve request",
            reject: "Reject request",
            amendment: "Request amendment",
            withdraw: "Withdraw request",
          }[action]}
          description={action === "approve"
            ? "Approval applies the proposed project change in the same database transaction."
            : "The project record will not be changed."}
          confirmLabel={{
            approve: "Approve and apply",
            reject: "Reject",
            amendment: "Request amendment",
            withdraw: "Withdraw",
          }[action]}
          confirmTone={["reject", "withdraw"].includes(action) ? "danger" : undefined}
          confirmDisabled={action === "amendment" && !notes.trim()}
          busy={busy}
          onCancel={() => { if (!busy) { setAction(""); setActionError(""); } }}
          onConfirm={() => runAction(() => {
            if (action === "approve") return decide(request.id, "approved", notes);
            if (action === "reject") return decide(request.id, "rejected", notes);
            if (action === "amendment") return requestAmendment(request.id, notes);
            return withdraw(request.id, notes);
          })}
        >
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-gray-600">
              Notes {action === "amendment" ? "" : "(optional)"}
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              maxLength={5000}
              className="w-full rounded-md border border-stone-200 px-3 py-2 focus:border-botanique-green focus:outline-none"
            />
          </label>
          {actionError && <p className="mt-3 text-sm text-red-700" role="alert">{actionError}</p>}
        </ConfirmDialog>
      )}
    </div>
  );
}
