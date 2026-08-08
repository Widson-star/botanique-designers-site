import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog";
import { useAdminData } from "../context/adminData";
import { useAdminIntake } from "../context/adminIntake";
import { canManageStaff } from "../utils/permissions";
import { isOwner } from "../utils/projectCapabilities";
import { PROJECT_TYPES } from "../constants/projectStatus";
import {
  INTAKE_EVENT_LABELS,
  INTAKE_STATE_LABELS,
  intakeSummaryRows,
  intakeTitle,
} from "../utils/intakeFormatters";
import { formatDateTime, resolveActorLabel } from "../utils/activityFormat";
import { profilePresentationName } from "../utils/personName";

const inputClass = "w-full rounded-md border border-stone-200 px-3 py-2 text-sm focus:border-botanique-green focus:outline-none";

function AmendDialog({ intake, onCancel, onSubmit }) {
  const p = intake.proposedValues || {};
  const [form, setForm] = useState({
    project_name: p.project_name || "",
    project_type: p.project_type || "Residential",
    client_site_name: p.client_site_name || "",
    location: p.location || "",
    county: p.county || "",
    start_date: p.start_date || "",
    target_completion_date: p.target_completion_date || "",
    notes: p.notes || "",
  });
  const [reason, setReason] = useState(intake.reason || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!form.project_name.trim() || !reason.trim()) {
      setError("Project name and reason are required.");
      return;
    }
    const proposedValues = { project_name: form.project_name.trim(), project_type: form.project_type };
    for (const key of ["client_site_name", "location", "county", "start_date", "target_completion_date", "notes"]) {
      if (form[key]) proposedValues[key] = form[key];
    }
    setBusy(true);
    setError("");
    try {
      const result = await onSubmit({ proposedValues, reason: reason.trim() });
      if (!result || typeof result.ok !== "boolean") {
        setError("The intake service returned an invalid response. No success was recorded.");
      } else if (!result.ok) {
        setError(result.error || "The amendment could not be submitted.");
      }
    } catch (nextError) {
      setError(nextError.message || "The amendment could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfirmDialog open title="Amend intake" description="Revise the proposal and resubmit for review." confirmLabel="Resubmit" confirmDisabled={!form.project_name.trim() || !reason.trim()} busy={busy} onConfirm={submit} onCancel={onCancel}>
      <div className="space-y-3">
        <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-gray-600">Project name</span>
          <input className={inputClass} value={form.project_name} onChange={(e) => setForm((c) => ({ ...c, project_name: e.target.value }))} /></label>
        <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-gray-600">Project type</span>
          <select className={inputClass} value={form.project_type} onChange={(e) => setForm((c) => ({ ...c, project_type: e.target.value }))}>
            {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select></label>
        <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-gray-600">Reason</span>
          <textarea className={inputClass} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      </div>
    </ConfirmDialog>
  );
}

export default function AdminProjectIntakeDetail() {
  const { intakeId } = useParams();
  const { role, currentUserId, profilesById } = useAdminData();
  const {
    intakes, status, loadIntake, loadEvents, decide,
    requestAmendment, amendAndResubmit, withdraw,
  } = useAdminIntake();
  const [events, setEvents] = useState([]);
  const [detailStatus, setDetailStatus] = useState("loading");
  const [detailError, setDetailError] = useState("");
  const [action, setAction] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const actionInFlight = useRef(false);
  const intake = intakes.find((item) => item.id === intakeId);

  useEffect(() => {
    if (intake || !intakeId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const loaded = await loadIntake(intakeId);
        if (!cancelled) {
          setDetailError("");
          setDetailStatus(loaded ? "ready" : "not_found");
        }
      } catch (nextError) {
        if (!cancelled) {
          setDetailStatus("error");
          setDetailError(nextError.message || "Unable to load this project intake.");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [intake, intakeId, loadIntake]);

  useEffect(() => {
    if (!intake) return;
    let cancelled = false;
    (async () => {
      try {
        const loaded = await loadEvents(intake.id);
        if (!cancelled) setEvents(loaded);
      } catch {
        /* timeline is best-effort */
      }
    })();
    return () => { cancelled = true; };
  }, [loadEvents, intake]);

  if (!canManageStaff(role)) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-8">
        <h1 className="text-xl font-bold">Project Proposals unavailable</h1>
        <p className="mt-2 text-sm text-gray-500">Your role does not have access to project intakes.</p>
      </div>
    );
  }
  if (!intake) {
    if (status === "loading" || detailStatus === "idle" || detailStatus === "loading") {
      return (
        <div className="rounded-lg border border-stone-200 bg-white p-8">
          <h1 className="text-xl font-bold">Loading project intake…</h1>
          <p className="mt-2 text-sm text-gray-500">Retrieving the authoritative intake record and history.</p>
        </div>
      );
    }
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-8">
        <h1 className="text-xl font-bold">Intake unavailable</h1>
        {detailError && <p className="mt-2 text-sm text-red-700" role="alert">{detailError}</p>}
        <Link to="/admin/project-intakes" className="mt-5 inline-flex font-semibold text-botanique-green hover:underline">Back to intakes</Link>
      </div>
    );
  }

  const requester = profilesById[intake.requesterId];
  const owner = isOwner(role);
  const isRequester = intake.requesterId === currentUserId;
  const canDecide = owner && intake.state === "awaiting_review";
  const canWithdraw = isRequester && ["submitted", "awaiting_review", "amendment_requested"].includes(intake.state);
  const canAmend = isRequester && intake.state === "amendment_requested";
  const rows = intakeSummaryRows(intake);

  async function runAction(operation) {
    if (actionInFlight.current) {
      return { ok: false, error: "An intake action is already in progress." };
    }
    actionInFlight.current = true;
    setBusy(true);
    setActionError("");
    try {
      const result = await operation();
      if (!result || typeof result.ok !== "boolean") {
        const error = "The intake service returned an invalid response. No success was recorded.";
        setActionError(error);
        return { ok: false, error };
      }
      if (!result.ok) {
        setActionError(result.error || "The intake action did not complete.");
        return result;
      }
      setAction("");
      setNotes("");
      try {
        setEvents(await loadEvents(intake.id, true));
      } catch {
        /* the mutation succeeded; timeline refresh remains best-effort */
      }
      return result;
    } catch (nextError) {
      const error = nextError.message || "The intake action did not complete.";
      setActionError(error);
      return { ok: false, error };
    } finally {
      actionInFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <Link to="/admin/project-intakes" className="text-sm font-semibold text-botanique-green hover:underline">← Back to intakes</Link>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{intakeTitle(intake)}</h1>
            <p className="mt-1 text-sm text-gray-500">Proposed project intake</p>
          </div>
          <span className="self-start rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-gray-700">{INTAKE_STATE_LABELS[intake.state]}</span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="text-base font-semibold">Proposal</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><dt className="text-xs text-gray-500">Requester</dt><dd className="mt-1 text-sm font-medium">{requester ? profilePresentationName(requester) : "Authorised requester"}</dd></div>
            <div><dt className="text-xs text-gray-500">Submitted</dt><dd className="mt-1 text-sm">{formatDateTime(intake.requestedAt)}</dd></div>
            <div><dt className="text-xs text-gray-500">Round</dt><dd className="mt-1 text-sm">{intake.requestRound}</dd></div>
            {intake.createdProjectId && (
              <div><dt className="text-xs text-gray-500">Created project</dt><dd className="mt-1 text-sm"><Link className="font-semibold text-botanique-green hover:underline" to={`/admin/projects/${intake.createdProjectId}`}>Open project</Link></dd></div>
            )}
          </dl>

          <div className="mt-5 overflow-x-auto rounded-md border border-stone-200">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-stone-100">
                {rows.map((row) => (
                  <tr key={row.key}>
                    <th className="px-3 py-2 font-medium text-gray-600">{row.label}</th>
                    <td className="px-3 py-2 text-botanique-charcoal">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5"><h3 className="text-xs font-medium text-gray-500">Reason</h3><p className="mt-1 whitespace-pre-line text-sm leading-6">{intake.reason}</p></div>
          {intake.decisionNotes && (
            <div className="mt-4 rounded-md bg-stone-50 p-3"><h3 className="text-xs font-medium text-gray-500">Review notes</h3><p className="mt-1 whitespace-pre-line text-sm leading-6">{intake.decisionNotes}</p></div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {canDecide && (
              <>
                <button type="button" onClick={() => setAction("approve")} className="rounded-md bg-botanique-green px-3 py-2 text-xs font-semibold text-white hover:bg-botanique-dark">Approve &amp; create project</button>
                <button type="button" onClick={() => setAction("reject")} className="rounded-md border border-stone-300 px-3 py-2 text-xs font-semibold hover:bg-stone-50">Reject</button>
                <button type="button" onClick={() => setAction("amendment")} className="rounded-md border border-stone-300 px-3 py-2 text-xs font-semibold hover:bg-stone-50">Request amendment</button>
              </>
            )}
            {canWithdraw && (
              <button type="button" onClick={() => setAction("withdraw")} className="rounded-md border border-stone-300 px-3 py-2 text-xs font-semibold hover:bg-stone-50">Withdraw</button>
            )}
            {canAmend && (
              <button type="button" onClick={() => setAction("edit")} className="rounded-md bg-botanique-green px-3 py-2 text-xs font-semibold text-white hover:bg-botanique-dark">Amend and resubmit</button>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold">Intake timeline</h2>
          <ol className="space-y-3">
            {events.map((event) => (
              <li key={event.id} className="text-sm">
                <p className="font-medium text-botanique-charcoal">{INTAKE_EVENT_LABELS[event.eventType] || event.eventType}</p>
                <p className="text-xs text-gray-500">{resolveActorLabel(event.actorId, profilesById)} · {formatDateTime(event.occurredAt)}</p>
                {event.eventNotes && <p className="mt-1 text-xs text-gray-600">{event.eventNotes}</p>}
              </li>
            ))}
          </ol>
        </section>
      </div>

      {action === "edit" && (
        <AmendDialog intake={intake} onCancel={() => setAction("")} onSubmit={(values) => runAction(() => amendAndResubmit(intake.id, values))} />
      )}
      {["approve", "reject", "amendment", "withdraw"].includes(action) && (
        <ConfirmDialog
          open
          title={{ approve: "Approve intake", reject: "Reject intake", amendment: "Request amendment", withdraw: "Withdraw intake" }[action]}
          description={action === "approve" ? "Approval creates the live project in the same database transaction." : "No live project will be created."}
          confirmLabel={{ approve: "Approve & create", reject: "Reject", amendment: "Request amendment", withdraw: "Withdraw" }[action]}
          confirmTone={["reject", "withdraw"].includes(action) ? "danger" : undefined}
          confirmDisabled={action === "amendment" && !notes.trim()}
          busy={busy}
          onCancel={() => { if (!busy) { setAction(""); setActionError(""); } }}
          onConfirm={() => runAction(() => {
            if (action === "approve") return decide(intake.id, "approved", notes);
            if (action === "reject") return decide(intake.id, "rejected", notes);
            if (action === "amendment") return requestAmendment(intake.id, notes);
            return withdraw(intake.id, notes);
          })}
        >
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-gray-600">Notes {action === "amendment" ? "" : "(optional)"}</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={5000} className={inputClass} />
          </label>
          {actionError && <p className="mt-3 text-sm text-red-700" role="alert">{actionError}</p>}
        </ConfirmDialog>
      )}
    </div>
  );
}
