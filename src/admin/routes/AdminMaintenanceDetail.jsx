import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useMaintenance } from "../context/maintenance";
import { usePeople } from "../context/people";
import {
  MAINTENANCE_ASSIGNMENT_ROLES, MAINTENANCE_FREQUENCIES, assignmentRoleLabel,
  canCorrectMaintenanceAssignment, canManageMaintenance, canSeeMaintenance,
  frequencyLabel, relationshipStatusLabel, visitStatusLabel,
} from "../utils/maintenanceCapabilities";

const showDate = (value) => (value
  ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`))
  : "—");

const today = () => new Date().toISOString().slice(0, 10);

const VISIT_STATUS_BADGE = {
  scheduled: "bg-[#edf2ef] text-botanique-green",
  completed: "bg-stone-100 text-gray-600",
  cancelled: "bg-red-50 text-red-700",
};

function Panel({ title, action, children }) {
  return (
    <section className="min-w-0 rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

// One Maintenance relationship, contained. Composition follows the working-
// authority image's Maintenance panel and the compact Project Summary
// pattern: a small grid of panels, not a long dossier. No cost, payment or
// evidence panel appears here — none of that is Maintenance's to hold; a
// visit or a purchase that costs money is a Project Cost, linked, not
// recreated.
export default function AdminMaintenanceDetail() {
  const { relationshipId } = useParams();
  const { role } = useAdminData();
  const { people } = usePeople();
  const {
    register, status, visitsForRelationship, assignmentsForRelationship,
    editRelationship, pauseRelationship, resumeRelationship, endRelationship,
    addVisit, rescheduleVisit, completeVisit, cancelVisit,
    addAssignment, endAssignment, correctAssignment,
  } = useMaintenance();

  const [feedback, setFeedback] = useState("");
  const [actionError, setActionError] = useState("");
  const [transitionReason, setTransitionReason] = useState("");
  const [confirmingTransition, setConfirmingTransition] = useState("");
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [visitForm, setVisitForm] = useState({ scheduledDate: today(), purpose: "" });
  const [actingOnVisit, setActingOnVisit] = useState(null);
  const [visitActionForm, setVisitActionForm] = useState({ note: "" });
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignForm, setAssignForm] = useState({ personId: "", role: "site_technician", startDate: today() });
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState(null);
  const [correcting, setCorrecting] = useState(null);
  const [correctionForm, setCorrectionForm] = useState(null);

  const relationship = register.find((candidate) => candidate.id === relationshipId);
  const visits = useMemo(
    () => visitsForRelationship(relationshipId).slice().sort((a, b) => (a.scheduledDate < b.scheduledDate ? 1 : -1)),
    [visitsForRelationship, relationshipId]
  );
  const assignments = useMemo(
    () => assignmentsForRelationship(relationshipId),
    [assignmentsForRelationship, relationshipId]
  );
  const currentTeam = assignments.filter((assignment) => !assignment.endDate);
  // Ended assignments are historical and terminal (the database refuses to
  // rewrite them), so they stay readable here rather than disappearing —
  // this is the assignment side of the same "history remains visible" rule
  // Visit history already follows.
  const pastTeam = assignments.filter((assignment) => assignment.endDate);
  const scheduledVisits = visits.filter((visit) => visit.status === "scheduled");
  const pastVisits = visits.filter((visit) => visit.status !== "scheduled");

  const activePeople = useMemo(
    () => people.filter((person) => person.isActive && !currentTeam.some((assignment) => assignment.personId === person.id)),
    [people, currentTeam]
  );

  if (!canSeeMaintenance(role)) {
    return (
      <section>
        <h1 className="text-2xl font-semibold">Maintenance unavailable</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Maintenance is available to the Principal and the Operations Manager.
        </p>
      </section>
    );
  }

  if (status === "loading") return <p className="text-sm text-gray-600">Loading Maintenance…</p>;

  if (!relationship) {
    return (
      <section>
        <Link to="/admin/maintenance" className="text-sm font-semibold text-botanique-green hover:underline">← Maintenance</Link>
        <h1 className="mt-2 text-2xl font-semibold">Maintenance relationship not found</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          This Maintenance relationship does not exist, or you do not have authority to view it.
        </p>
      </section>
    );
  }

  async function report(promise, successMessage) {
    setActionError("");
    setFeedback("");
    const result = await promise;
    if (result.ok) setFeedback(successMessage);
    else setActionError(result.error || "That action did not complete.");
    return result;
  }

  async function submitTransition(kind) {
    if (kind === "end" && !transitionReason.trim()) {
      setActionError("Explain why this Maintenance relationship is ending.");
      return;
    }
    const action = kind === "pause"
      ? pauseRelationship(relationship.id, relationship.version, transitionReason.trim())
      : kind === "resume"
        ? resumeRelationship(relationship.id, relationship.version)
        : endRelationship(relationship.id, relationship.version, transitionReason.trim());
    const messages = {
      pause: "Maintenance paused.",
      resume: "Maintenance resumed.",
      end: "Maintenance relationship ended. The site's Project record is unchanged.",
    };
    const result = await report(action, messages[kind]);
    if (result.ok) {
      setConfirmingTransition("");
      setTransitionReason("");
    }
  }

  async function submitVisit(event) {
    event.preventDefault();
    if (!visitForm.purpose.trim()) {
      setActionError("Describe the planned work for this visit.");
      return;
    }
    const result = await report(
      addVisit({ relationshipId: relationship.id, scheduledDate: visitForm.scheduledDate, purpose: visitForm.purpose.trim() }),
      "Visit scheduled."
    );
    if (result.ok) {
      setShowVisitForm(false);
      setVisitForm({ scheduledDate: today(), purpose: "" });
    }
  }

  function startVisitAction(visit, kind) {
    setActionError("");
    setFeedback("");
    setActingOnVisit({ visit, kind });
    setVisitActionForm({ note: "", newDate: visit.scheduledDate });
  }

  async function submitVisitAction(event) {
    event.preventDefault();
    const { visit, kind } = actingOnVisit;
    if (kind === "complete" && !visitActionForm.note.trim()) {
      setActionError("Add a short completed-work note.");
      return;
    }
    if (kind === "cancel" && !visitActionForm.note.trim()) {
      setActionError("A cancellation reason is required.");
      return;
    }
    const action = kind === "complete"
      ? completeVisit(visit.id, visit.version, visitActionForm.note.trim())
      : kind === "cancel"
        ? cancelVisit(visit.id, visit.version, visitActionForm.note.trim())
        : rescheduleVisit(visit.id, visit.version, visitActionForm.newDate);
    const messages = {
      complete: "Visit marked completed.",
      cancel: "Visit cancelled.",
      reschedule: "Visit rescheduled.",
    };
    const result = await report(action, messages[kind]);
    if (result.ok) setActingOnVisit(null);
  }

  async function submitAssignment(event) {
    event.preventDefault();
    if (!assignForm.personId) {
      setActionError("Choose a person.");
      return;
    }
    const person = people.find((candidate) => candidate.id === assignForm.personId);
    const result = await report(
      addAssignment({ relationshipId: relationship.id, ...assignForm }, person?.fullName),
      "Person assigned to this Maintenance relationship."
    );
    if (result.ok) {
      setShowAssignForm(false);
      setAssignForm({ personId: "", role: "site_technician", startDate: today() });
    }
  }

  function startEditingDetails() {
    setActionError("");
    setFeedback("");
    setDetailsForm({
      scope: relationship.scope,
      startDate: relationship.startDate,
      frequency: relationship.frequency,
    });
    setEditingDetails(true);
  }

  async function submitDetails(event) {
    event.preventDefault();
    const result = await report(
      editRelationship(relationship.id, relationship.version, detailsForm),
      "Maintenance details updated."
    );
    if (result.ok) {
      setEditingDetails(false);
      setDetailsForm(null);
    }
  }

  function startCorrection(assignment) {
    setActionError("");
    setFeedback("");
    setCorrecting(assignment);
    setCorrectionForm({
      role: assignment.role,
      startDate: assignment.startDate,
      correctionReason: "",
    });
  }

  async function submitCorrection(event) {
    event.preventDefault();
    if (correctionForm.correctionReason.trim().length < 3) {
      setActionError("Explain why this Maintenance assignment is being corrected.");
      return;
    }
    const result = await report(
      correctAssignment({
        assignmentId: correcting.id,
        expectedVersion: correcting.version,
        role: correctionForm.role,
        startDate: correctionForm.startDate,
        correctionReason: correctionForm.correctionReason,
      }),
      "Assignment correction recorded."
    );
    if (result.ok) {
      setCorrecting(null);
      setCorrectionForm(null);
    }
  }

  return (
    <section>
      <Link to="/admin/maintenance" className="text-sm font-semibold text-botanique-green hover:underline">← Maintenance</Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{relationship.projectName}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {relationship.clientSiteName ? `${relationship.clientSiteName} · ` : ""}
            Project status: {relationship.projectStatus || "—"}
          </p>
        </div>
        <Link
          to={`/admin/projects/${relationship.projectId}`}
          className="min-h-11 py-2 text-sm font-semibold text-botanique-green hover:underline"
        >
          View Project →
        </Link>
      </div>

      {feedback && <p className="mt-4 rounded-md border border-stone-200 bg-[#edf2ef] p-3 text-sm text-botanique-green">{feedback}</p>}
      {actionError && <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{actionError}</p>}

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="grid min-w-0 grid-cols-1 gap-4">
          <Panel
            title="Scheduled visits"
            action={canManageMaintenance(role) && relationship.status !== "ended" && (
              <button
                type="button"
                onClick={() => { setShowVisitForm((shown) => !shown); setActionError(""); }}
                className="min-h-11 py-2 text-sm font-semibold text-botanique-green hover:underline"
              >
                {showVisitForm ? "Cancel" : "Schedule visit"}
              </button>
            )}
          >
            {showVisitForm && (
              <form onSubmit={submitVisit} className="mb-3 grid gap-3 rounded-md border border-stone-200 bg-stone-50 p-3 sm:grid-cols-3">
                <label className="text-sm font-medium">Scheduled date
                  <input
                    type="date"
                    value={visitForm.scheduledDate}
                    onChange={(event) => setVisitForm({ ...visitForm, scheduledDate: event.target.value })}
                    className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
                    required
                  />
                </label>
                <label className="text-sm font-medium sm:col-span-2">Planned work / purpose
                  <input
                    value={visitForm.purpose}
                    onChange={(event) => setVisitForm({ ...visitForm, purpose: event.target.value })}
                    className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
                    maxLength={1000}
                    required
                  />
                </label>
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white hover:bg-botanique-dark sm:col-span-3 sm:w-auto sm:justify-self-start"
                >
                  Schedule visit
                </button>
              </form>
            )}

            {!scheduledVisits.length && <p className="text-sm text-gray-600">No visit currently scheduled.</p>}

            <ul className="divide-y divide-stone-100">
              {scheduledVisits.map((visit) => (
                <li key={visit.id} className="py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{showDate(visit.scheduledDate)}</span>
                      <span className="block truncate text-xs text-gray-500">{visit.purpose}</span>
                    </span>
                    {/* Fail-safe: under the corrected database rule an Ended
                        relationship has zero Scheduled visits, so this branch
                        should be unreachable in practice — the explicit
                        status check keeps it that way even against stale or
                        otherwise inconsistent data. */}
                    {canManageMaintenance(role) && relationship.status !== "ended" && (
                      <span className="flex shrink-0 flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
                        <button type="button" onClick={() => startVisitAction(visit, "complete")} className="min-h-11 py-2 text-botanique-green hover:underline">Complete</button>
                        <button type="button" onClick={() => startVisitAction(visit, "reschedule")} className="min-h-11 py-2 text-gray-600 hover:text-botanique-charcoal hover:underline">Reschedule</button>
                        <button type="button" onClick={() => startVisitAction(visit, "cancel")} className="min-h-11 py-2 text-gray-600 hover:text-botanique-charcoal hover:underline">Cancel</button>
                      </span>
                    )}
                  </div>

                  {actingOnVisit?.visit.id === visit.id && (
                    <form onSubmit={submitVisitAction} className="mt-2 grid gap-3 rounded-md border border-stone-200 bg-stone-50 p-3">
                      {actingOnVisit.kind === "reschedule" ? (
                        <label className="text-sm font-medium">New scheduled date
                          <input
                            type="date"
                            value={visitActionForm.newDate}
                            onChange={(event) => setVisitActionForm({ ...visitActionForm, newDate: event.target.value })}
                            className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
                            required
                          />
                        </label>
                      ) : (
                        <label className="text-sm font-medium">
                          {actingOnVisit.kind === "complete" ? "Completed-work note" : "Cancellation reason"}
                          <input
                            value={visitActionForm.note}
                            onChange={(event) => setVisitActionForm({ ...visitActionForm, note: event.target.value })}
                            className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
                            maxLength={actingOnVisit.kind === "complete" ? 2000 : 1000}
                            required
                          />
                        </label>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white hover:bg-botanique-dark">
                          {actingOnVisit.kind === "complete" ? "Mark completed" : actingOnVisit.kind === "cancel" ? "Cancel visit" : "Save new date"}
                        </button>
                        <button type="button" onClick={() => setActingOnVisit(null)} className="min-h-11 px-2 py-2 text-sm font-semibold text-gray-600 hover:underline">Cancel</button>
                      </div>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Visit history">
            {!pastVisits.length && <p className="text-sm text-gray-600">No completed or cancelled visit yet.</p>}
            <ul className="divide-y divide-stone-100">
              {pastVisits.map((visit) => (
                <li key={visit.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{showDate(visit.scheduledDate)} · {visit.purpose}</p>
                    <p className="text-xs text-gray-500">
                      {visit.status === "completed" ? visit.completionNote : visit.cancellationReason}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${VISIT_STATUS_BADGE[visit.status] || ""}`}>
                    {visitStatusLabel(visit.status)}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4">
          <Panel
            title="Maintenance details"
            action={canManageMaintenance(role) && relationship.status !== "ended" && !editingDetails && (
              <button
                type="button"
                onClick={startEditingDetails}
                className="min-h-11 py-2 text-sm font-semibold text-botanique-green hover:underline"
              >
                Edit
              </button>
            )}
          >
            {editingDetails && detailsForm && (
              <form onSubmit={submitDetails} className="mb-3 grid gap-3 rounded-md border border-stone-200 bg-stone-50 p-3">
                <label className="text-sm font-medium">Maintenance scope
                  <input
                    value={detailsForm.scope}
                    onChange={(event) => setDetailsForm({ ...detailsForm, scope: event.target.value })}
                    className="mt-1 block w-full min-w-0 rounded-md border border-stone-300 px-3 py-2.5"
                    maxLength={2000}
                    required
                  />
                </label>
                <label className="text-sm font-medium">Start date
                  <input
                    type="date"
                    value={detailsForm.startDate}
                    onChange={(event) => setDetailsForm({ ...detailsForm, startDate: event.target.value })}
                    className="mt-1 block w-full min-w-0 rounded-md border border-stone-300 px-3 py-2.5"
                    required
                  />
                </label>
                <label className="text-sm font-medium">Frequency
                  <select
                    value={detailsForm.frequency}
                    onChange={(event) => setDetailsForm({ ...detailsForm, frequency: event.target.value })}
                    className="mt-1 block w-full min-w-0 rounded-md border border-stone-300 px-3 py-2.5"
                  >
                    {MAINTENANCE_FREQUENCIES.map((value) => (
                      <option key={value} value={value}>{frequencyLabel(value)}</option>
                    ))}
                  </select>
                </label>
                <p className="text-xs text-gray-500">
                  This edits the Maintenance record only. The linked Project and its status are unchanged, and
                  Maintenance status moves only through Pause, Resume or End.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white hover:bg-botanique-dark">
                    Save details
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingDetails(false); setDetailsForm(null); }}
                    className="min-h-11 px-2 py-2 text-sm font-semibold text-gray-600 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Status</dt>
                <dd>{relationshipStatusLabel(relationship.status)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Frequency</dt>
                <dd>{frequencyLabel(relationship.frequency)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Start date</dt>
                <dd>{showDate(relationship.startDate)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Next visit</dt>
                <dd>{relationship.nextVisitDate ? showDate(relationship.nextVisitDate) : "Not scheduled"}</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-gray-600">{relationship.scope}</p>

            {canManageMaintenance(role) && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
                {relationship.status === "active" && (
                  <button type="button" onClick={() => { setConfirmingTransition("pause"); setActionError(""); }} className="min-h-11 py-2 text-sm font-semibold text-botanique-green hover:underline">
                    Pause Maintenance
                  </button>
                )}
                {relationship.status === "paused" && (
                  <button type="button" onClick={() => submitTransition("resume")} className="min-h-11 py-2 text-sm font-semibold text-botanique-green hover:underline">
                    Resume Maintenance
                  </button>
                )}
                {relationship.status !== "ended" && (
                  <button type="button" onClick={() => { setConfirmingTransition("end"); setActionError(""); }} className="min-h-11 py-2 text-sm font-semibold text-gray-600 hover:text-botanique-charcoal hover:underline">
                    End Maintenance
                  </button>
                )}
              </div>
            )}

            {confirmingTransition && (
              <form
                onSubmit={(event) => { event.preventDefault(); submitTransition(confirmingTransition); }}
                className="mt-3 grid gap-3 rounded-md border border-stone-200 bg-stone-50 p-3"
              >
                <p className="text-sm text-gray-700">
                  {confirmingTransition === "pause"
                    ? "Pausing keeps this relationship in place; it can be resumed later."
                    : "Ending closes this Maintenance relationship. The site's Project record and status are unchanged."}
                </p>
                <label className="text-sm font-medium">Reason {confirmingTransition === "pause" ? "(optional)" : ""}
                  <input
                    value={transitionReason}
                    onChange={(event) => setTransitionReason(event.target.value)}
                    className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
                    maxLength={1000}
                    required={confirmingTransition === "end"}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white hover:bg-botanique-dark">
                    Confirm
                  </button>
                  <button type="button" onClick={() => { setConfirmingTransition(""); setTransitionReason(""); }} className="min-h-11 px-2 py-2 text-sm font-semibold text-gray-600 hover:underline">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </Panel>

          <Panel
            title="Assigned team"
            action={canManageMaintenance(role) && relationship.status !== "ended" && (
              <button
                type="button"
                onClick={() => { setShowAssignForm((shown) => !shown); setActionError(""); }}
                className="min-h-11 py-2 text-sm font-semibold text-botanique-green hover:underline"
              >
                {showAssignForm ? "Cancel" : "Assign person"}
              </button>
            )}
          >
            {showAssignForm && (
              <form onSubmit={submitAssignment} className="mb-3 grid gap-3 rounded-md border border-stone-200 bg-stone-50 p-3">
                <label className="text-sm font-medium">Person
                  <select
                    value={assignForm.personId}
                    onChange={(event) => setAssignForm({ ...assignForm, personId: event.target.value })}
                    className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
                    required
                  >
                    <option value="">Choose a person</option>
                    {activePeople.map((person) => (
                      <option key={person.id} value={person.id}>{person.fullName}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium">Responsibility
                  <select
                    value={assignForm.role}
                    onChange={(event) => setAssignForm({ ...assignForm, role: event.target.value })}
                    className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
                  >
                    {MAINTENANCE_ASSIGNMENT_ROLES.map((value) => (
                      <option key={value} value={value}>{assignmentRoleLabel(value)}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium">Starts
                  <input
                    type="date"
                    value={assignForm.startDate}
                    onChange={(event) => setAssignForm({ ...assignForm, startDate: event.target.value })}
                    className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
                    required
                  />
                </label>
                <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white hover:bg-botanique-dark">
                  Assign
                </button>
              </form>
            )}

            {!currentTeam.length && <p className="text-sm text-gray-600">Nobody is currently assigned.</p>}
            <ul className="divide-y divide-stone-100">
              {currentTeam.map((assignment) => (
                <li key={assignment.id} className="py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{assignment.personName}</span>
                      <span className="block truncate text-xs text-gray-500">
                        {assignmentRoleLabel(assignment.role)} · since {showDate(assignment.startDate)}
                      </span>
                    </span>
                    {/* Fail-safe: ending a relationship atomically closes every
                        open assignment server-side, so currentTeam should
                        already be empty for an Ended relationship — this
                        status check keeps the button from reappearing against
                        stale or otherwise inconsistent data. */}
                    {canManageMaintenance(role) && relationship.status !== "ended" && (
                      <button
                        type="button"
                        onClick={() => report(
                          endAssignment(assignment.id, assignment.version),
                          "Assignment ended."
                        )}
                        className="min-h-11 shrink-0 py-2 text-xs font-semibold text-gray-600 hover:text-botanique-charcoal hover:underline"
                      >
                        End
                      </button>
                    )}
                  </div>

                  {/* Correcting what was recorded is Principal-only and is
                      deliberately not presented as an ordinary edit: it sits
                      below the row, in muted type, separate from End. */}
                  {canCorrectMaintenanceAssignment(role) && relationship.status !== "ended" && correcting?.id !== assignment.id && (
                    <button
                      type="button"
                      onClick={() => startCorrection(assignment)}
                      className="min-h-11 py-2 text-xs font-semibold text-botanique-green hover:underline"
                    >
                      Correct assignment
                    </button>
                  )}

                  {correcting?.id === assignment.id && correctionForm && (
                    <form onSubmit={submitCorrection} className="mt-2 grid min-w-0 gap-3 rounded-md border border-stone-200 bg-stone-50 p-3">
                      <p className="text-sm text-gray-700">
                        Correcting a recorded assignment. The person and the linked Maintenance relationship cannot
                        change; the original values and your reason are kept in the record.
                      </p>
                      <div className="text-sm">
                        <span className="text-gray-500">Person</span>
                        <p className="font-medium">{assignment.personName}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="min-w-0 text-sm">
                          <span className="text-gray-500">Current responsibility</span>
                          <p className="font-medium">{assignmentRoleLabel(assignment.role)}</p>
                        </div>
                        <label className="min-w-0 text-sm font-medium">Corrected responsibility
                          <select
                            value={correctionForm.role}
                            onChange={(event) => setCorrectionForm({ ...correctionForm, role: event.target.value })}
                            className="mt-1 block w-full min-w-0 rounded-md border border-stone-300 px-3 py-2.5"
                          >
                            {MAINTENANCE_ASSIGNMENT_ROLES.map((value) => (
                              <option key={value} value={value}>{assignmentRoleLabel(value)}</option>
                            ))}
                          </select>
                        </label>
                        <div className="min-w-0 text-sm">
                          <span className="text-gray-500">Current start date</span>
                          <p className="font-medium">{showDate(assignment.startDate)}</p>
                        </div>
                        <label className="min-w-0 text-sm font-medium">Corrected start date
                          <input
                            type="date"
                            value={correctionForm.startDate}
                            onChange={(event) => setCorrectionForm({ ...correctionForm, startDate: event.target.value })}
                            className="mt-1 block w-full min-w-0 rounded-md border border-stone-300 px-3 py-2.5"
                            required
                          />
                        </label>
                      </div>
                      <label className="min-w-0 text-sm font-medium">Why is this assignment being corrected?
                        <textarea
                          value={correctionForm.correctionReason}
                          onChange={(event) => setCorrectionForm({ ...correctionForm, correctionReason: event.target.value })}
                          className="mt-1 block w-full min-w-0 rounded-md border border-stone-300 px-3 py-2.5"
                          rows={3}
                          minLength={3}
                          maxLength={1000}
                          required
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white hover:bg-botanique-dark">
                          Save correction
                        </button>
                        <button
                          type="button"
                          onClick={() => { setCorrecting(null); setCorrectionForm(null); }}
                          className="min-h-11 px-2 py-2 text-sm font-semibold text-gray-600 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </li>
              ))}
            </ul>

            {pastTeam.length > 0 && (
              <div className="mt-4 border-t border-stone-100 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Past assignments</p>
                <ul className="mt-2 divide-y divide-stone-100">
                  {pastTeam.map((assignment) => (
                    <li key={assignment.id} className="py-2">
                      <span className="block truncate text-sm font-medium text-gray-700">{assignment.personName}</span>
                      <span className="block truncate text-xs text-gray-500">
                        {assignmentRoleLabel(assignment.role)} · {showDate(assignment.startDate)} – {showDate(assignment.endDate)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </section>
  );
}
