import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useDailySiteOperations } from "../context/dailySiteOperations";
import { useMaintenance } from "../context/maintenance";
import { usePeople } from "../context/people";
import {
  MAINTENANCE_ASSIGNMENT_ROLES,
  MAINTENANCE_FREQUENCIES,
  assignmentRoleLabel,
  canCorrectMaintenanceAssignment,
  canEndMaintenance,
  canManageMaintenance,
  canSeeMaintenance,
  frequencyLabel,
  relationshipStatusLabel,
  visitStatusLabel,
} from "../utils/maintenanceCapabilities";

const showDate = (value) => value
  ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(`${String(value).slice(0, 10)}T00:00:00`))
  : "—";
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
const liveEntryStates = new Set(["draft", "submitted", "returned_for_correction", "resubmitted", "accepted"]);
const entryLabel = (state) => ({ draft: "Draft", submitted: "Awaiting review", returned_for_correction: "Correction needed", resubmitted: "Awaiting review", accepted: "Accepted" })[state] || state;
const entryTone = (state) => ({ draft: "bg-stone-100 text-gray-600", submitted: "bg-sky-50 text-sky-800", returned_for_correction: "bg-red-50 text-red-700", resubmitted: "bg-sky-50 text-sky-800", accepted: "bg-emerald-50 text-emerald-800" })[state] || "bg-stone-100 text-gray-600";
const visitTone = { scheduled: "bg-[#edf2ef] text-botanique-green", completed: "bg-emerald-50 text-emerald-800", cancelled: "bg-red-50 text-red-700" };

function Panel({ title, action, children }) {
  return <section className="min-w-0 rounded-xl border border-stone-200 bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-[14px] font-semibold">{title}</h2>{action}</div>
    <div className="mt-3">{children}</div>
  </section>;
}
function DetailRow({ label, value }) {
  return <div className="flex justify-between gap-3"><dt className="text-gray-500">{label}</dt><dd className="text-right font-medium text-botanique-charcoal">{value}</dd></div>;
}
function visitWorkState(visit, entry) {
  if (visit.status !== "scheduled") return visit.status;
  if (entry?.state === "accepted") return "needs_closure";
  if (["submitted", "resubmitted"].includes(entry?.state)) return "awaiting_review";
  if (entry?.state === "returned_for_correction") return "correction_needed";
  if (entry?.state === "draft") return "draft_field_record";
  if (visit.scheduledDate < today()) return "overdue";
  if (visit.scheduledDate === today()) return "due";
  return "upcoming";
}
function outstandingFollowUp(visits) {
  return visits
    .filter((visit) => visit.status === "completed" && visit.followUpRequired)
    .slice()
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
    .find((visit) => !visits.some((later) => later.status !== "cancelled" && later.scheduledDate > visit.scheduledDate)) || null;
}

export default function AdminMaintenanceDetail() {
  const { relationshipId } = useParams();
  const { role } = useAdminData();
  const { people } = usePeople();
  const { entries = [], status: dailyStatus } = useDailySiteOperations();
  const {
    register, status, visitsForRelationship, assignmentsForRelationship,
    editRelationship, pauseRelationship, resumeRelationship, endRelationship,
    addVisit, rescheduleVisit, completeVisitCycle, cancelVisit,
    addAssignment, endAssignment, correctAssignment,
  } = useMaintenance();

  const [feedback, setFeedback] = useState("");
  const [actionError, setActionError] = useState("");
  const [transitionReason, setTransitionReason] = useState("");
  const [confirmingTransition, setConfirmingTransition] = useState("");
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [visitForm, setVisitForm] = useState({ scheduledDate: today(), purpose: "" });
  const [actingOnVisit, setActingOnVisit] = useState(null);
  const [visitActionForm, setVisitActionForm] = useState({ note: "", newDate: today() });
  const [moreVisitId, setMoreVisitId] = useState("");
  const [cycleForm, setCycleForm] = useState(null);
  const [showFieldHistory, setShowFieldHistory] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignForm, setAssignForm] = useState({ personId: "", role: "site_technician", startDate: today() });
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState(null);
  const [correcting, setCorrecting] = useState(null);
  const [correctionForm, setCorrectionForm] = useState(null);

  const relationship = register.find((candidate) => candidate.id === relationshipId);
  const visits = useMemo(() => visitsForRelationship(relationshipId).slice().sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate)), [visitsForRelationship, relationshipId]);
  const assignments = useMemo(() => assignmentsForRelationship(relationshipId), [assignmentsForRelationship, relationshipId]);
  const currentTeam = assignments.filter((assignment) => !assignment.endDate);
  const pastTeam = assignments.filter((assignment) => assignment.endDate);
  const scheduledVisits = visits.filter((visit) => visit.status === "scheduled").slice().sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  const pastVisits = visits.filter((visit) => visit.status !== "scheduled");
  const followUp = outstandingFollowUp(visits);
  const activePeople = useMemo(() => people.filter((person) => person.isActive && !currentTeam.some((assignment) => assignment.personId === person.id)), [people, currentTeam]);

  const fieldActivity = useMemo(() => {
    if (!relationship) return [];
    return entries.filter((entry) => entry.projectId === relationship.projectId && entry.workDate >= relationship.startDate && liveEntryStates.has(entry.state))
      .slice().sort((a, b) => b.workDate.localeCompare(a.workDate) || String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  }, [entries, relationship]);
  const fieldByDate = useMemo(() => new Map(fieldActivity.map((entry) => [entry.workDate, entry])), [fieldActivity]);
  const currentVisit = scheduledVisits.find((visit) => visit.scheduledDate <= today()) || scheduledVisits[0] || null;
  const currentEntry = currentVisit ? fieldByDate.get(currentVisit.scheduledDate) || null : null;
  const currentState = currentVisit ? visitWorkState(currentVisit, currentEntry) : followUp ? "follow_up" : "not_scheduled";

  if (!canSeeMaintenance(role)) return <section><h1 className="text-2xl font-semibold">Maintenance unavailable</h1></section>;
  if (status === "loading") return <p className="text-sm text-gray-600">Loading…</p>;
  if (!relationship) return <section><Link to="/admin/maintenance" className="text-sm font-semibold text-botanique-green">← Maintenance</Link><h1 className="mt-2 text-2xl font-semibold">Maintenance not found</h1></section>;

  async function report(promise, successMessage) {
    setActionError(""); setFeedback("");
    const result = await promise;
    if (result.ok) setFeedback(successMessage); else setActionError(result.error || "Action failed.");
    return result;
  }
  async function submitTransition(kind) {
    if (kind === "end" && !transitionReason.trim()) return setActionError("Add a reason for ending Maintenance.");
    const action = kind === "pause"
      ? pauseRelationship(relationship.id, relationship.version, transitionReason.trim())
      : kind === "resume"
        ? resumeRelationship(relationship.id, relationship.version)
        : endRelationship(relationship.id, relationship.version, transitionReason.trim());
    const result = await report(action, { pause: "Maintenance paused.", resume: "Maintenance resumed.", end: "Maintenance ended." }[kind]);
    if (result.ok) { setConfirmingTransition(""); setTransitionReason(""); }
  }
  function openVisitForm(purpose = "") {
    setVisitForm({ scheduledDate: today(), purpose });
    setShowVisitForm(true);
    setActionError("");
  }
  async function submitVisit(event) {
    event.preventDefault();
    if (!visitForm.purpose.trim()) return setActionError("Describe the planned work.");
    const result = await report(addVisit({ relationshipId: relationship.id, scheduledDate: visitForm.scheduledDate, purpose: visitForm.purpose.trim() }), "Visit scheduled.");
    if (result.ok) { setShowVisitForm(false); setVisitForm({ scheduledDate: today(), purpose: "" }); }
  }
  function startSimpleVisitAction(visit, kind) {
    setActionError(""); setFeedback(""); setMoreVisitId(""); setActingOnVisit({ visit, kind }); setVisitActionForm({ note: "", newDate: visit.scheduledDate });
  }
  async function submitSimpleVisitAction(event) {
    event.preventDefault();
    const { visit, kind } = actingOnVisit;
    if (kind === "cancel" && !visitActionForm.note.trim()) return setActionError("Add a cancellation reason.");
    const action = kind === "cancel"
      ? cancelVisit(visit.id, visit.version, visitActionForm.note.trim())
      : rescheduleVisit(visit.id, visit.version, visitActionForm.newDate);
    const result = await report(action, kind === "cancel" ? "Visit cancelled." : "Visit rescheduled.");
    if (result.ok) setActingOnVisit(null);
  }
  function startCompletion(visit) {
    const execution = fieldByDate.get(visit.scheduledDate) || null;
    if (!execution || execution.state !== "accepted") return setActionError("Accept the Daily Site Record before closing this visit.");
    setCycleForm({
      visit, execution, outcome: "completed", completionNote: execution.workPlanned || "",
      followUpRequired: false, followUpNote: "", scheduleNext: false,
      nextScheduledDate: "", nextPurpose: visit.purpose,
    });
    setActionError(""); setFeedback("");
  }
  async function submitCompletion(event) {
    event.preventDefault();
    if (!cycleForm.completionNote.trim()) return setActionError("Add a short Maintenance result.");
    if (cycleForm.outcome === "partial" && !cycleForm.followUpRequired) return setActionError("Partially completed work requires follow-up.");
    if (cycleForm.followUpRequired && !cycleForm.followUpNote.trim()) return setActionError("Describe the follow-up.");
    if (cycleForm.scheduleNext && (!cycleForm.nextScheduledDate || !cycleForm.nextPurpose.trim())) return setActionError("Add the next visit date and work planned.");
    const result = await report(completeVisitCycle({
      visitId: cycleForm.visit.id, expectedVersion: cycleForm.visit.version,
      dailySiteEntryId: cycleForm.execution.id, outcome: cycleForm.outcome,
      completionNote: cycleForm.completionNote.trim(), followUpRequired: cycleForm.followUpRequired,
      followUpNote: cycleForm.followUpNote.trim(),
      nextScheduledDate: cycleForm.scheduleNext ? cycleForm.nextScheduledDate : "",
      nextPurpose: cycleForm.scheduleNext ? cycleForm.nextPurpose.trim() : "",
    }), cycleForm.scheduleNext ? "Visit closed and another visit scheduled." : "Visit closed.");
    if (result.ok) setCycleForm(null);
  }
  async function submitAssignment(event) {
    event.preventDefault();
    if (!assignForm.personId) return setActionError("Choose a person.");
    const result = await report(addAssignment({ relationshipId: relationship.id, ...assignForm }), "Person assigned.");
    if (result.ok) { setShowAssignForm(false); setAssignForm({ personId: "", role: "site_technician", startDate: today() }); }
  }
  function startEditingDetails() {
    setDetailsForm({ scope: relationship.scope, startDate: relationship.startDate, frequency: relationship.frequency });
    setEditingDetails(true); setActionError("");
  }
  async function submitDetails(event) {
    event.preventDefault();
    const result = await report(editRelationship(relationship.id, relationship.version, detailsForm), "Maintenance arrangement updated.");
    if (result.ok) { setEditingDetails(false); setDetailsForm(null); }
  }
  function startCorrection(assignment) {
    setCorrecting(assignment);
    setCorrectionForm({ role: assignment.role, startDate: assignment.startDate, correctionReason: "" });
    setActionError("");
  }
  async function submitCorrection(event) {
    event.preventDefault();
    if (!correctionForm.correctionReason.trim()) return setActionError("Add a correction reason.");
    const result = await report(correctAssignment({ assignmentId: correcting.id, expectedVersion: correcting.version, role: correctionForm.role, startDate: correctionForm.startDate, correctionReason: correctionForm.correctionReason.trim() }), "Assignment corrected.");
    if (result.ok) { setCorrecting(null); setCorrectionForm(null); }
  }

  const cycleStatus = ({ follow_up: "Follow-up outstanding", needs_closure: "Needs closure", awaiting_review: "Awaiting review", correction_needed: "Correction needed", draft_field_record: "Draft field record", overdue: "Overdue", due: "Due today", upcoming: "Upcoming", not_scheduled: "No visit scheduled" })[currentState] || "Current";
  const nextVisitValue = relationship.nextVisitDate
    ? `${relationship.nextVisitDate < today() ? "Overdue · " : ""}${showDate(relationship.nextVisitDate)}`
    : "Not scheduled";

  return <section className="space-y-4">
    <Link to="/admin/maintenance" className="text-sm font-semibold text-botanique-green">← Maintenance</Link>
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-botanique-green">Operations · Maintenance</p><h1 className="mt-1 text-2xl font-semibold">{relationship.projectName}</h1><p className="mt-1 text-sm text-gray-600">{frequencyLabel(relationship.frequency)} · {relationshipStatusLabel(relationship.status)}</p></div>
      <Link to={`/admin/projects/${relationship.projectId}`} className="min-h-10 py-2 text-sm font-semibold text-botanique-green">View Project →</Link>
    </header>
    {feedback && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{feedback}</p>}
    {actionError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{actionError}</p>}
    {dailyStatus === "error" && <p className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">Daily Site Records are temporarily unavailable.</p>}

    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gray-500">Current cycle</p><h2 className="mt-1 text-lg font-semibold">{currentVisit ? `${showDate(currentVisit.scheduledDate)} · ${currentVisit.purpose}` : followUp ? `Follow-up from ${showDate(followUp.scheduledDate)}` : "No visit scheduled"}</h2></div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${currentState === "follow_up" || currentState === "overdue" || currentState === "correction_needed" ? "bg-red-50 text-red-700" : currentState === "needs_closure" || currentState === "awaiting_review" ? "bg-sky-50 text-sky-800" : "bg-stone-100 text-gray-700"}`}>{cycleStatus}</span>
      </div>
      <div className="mt-4 grid gap-3 border-t border-stone-100 pt-4 sm:grid-cols-2 lg:grid-cols-3">
        <DetailRow label="Responsible" value={currentTeam.length ? currentTeam.map((item) => item.personName).join(", ") : "Unassigned"}/>
        <DetailRow label="Field execution" value={currentEntry ? entryLabel(currentEntry.state) : currentVisit ? "Not recorded" : "—"}/>
        <DetailRow label="Next visit" value={nextVisitValue}/>
      </div>
      {followUp && !currentVisit && <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-3">
        <p className="text-[11px] font-semibold text-red-800">Follow-up outstanding</p>
        <p className="mt-1 text-[12px] text-gray-700">{followUp.followUpNote}</p>
      </div>}
      {relationship.status === "active" && canManageMaintenance(role) && <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-100 pt-4">
        {currentState === "follow_up" && <button onClick={() => openVisitForm(followUp.followUpNote || followUp.purpose)} className="min-h-11 rounded-lg bg-botanique-green px-4 text-[12px] font-semibold text-white">Schedule follow-up</button>}
        {currentState === "needs_closure" && <button onClick={() => startCompletion(currentVisit)} className="min-h-11 rounded-lg bg-botanique-green px-4 text-[12px] font-semibold text-white">Complete visit</button>}
        {["awaiting_review", "correction_needed", "draft_field_record"].includes(currentState) && currentEntry && <Link to={`/admin/daily-site-operations/${currentEntry.id}`} className="inline-flex min-h-11 items-center rounded-lg bg-botanique-green px-4 text-[12px] font-semibold text-white">Open site record</Link>}
        {["due", "overdue", "upcoming"].includes(currentState) && currentVisit && !currentEntry && <Link to={`/admin/daily-site-operations/new?project=${relationship.projectId}&date=${currentVisit.scheduledDate}`} className="inline-flex min-h-11 items-center rounded-lg bg-botanique-green px-4 text-[12px] font-semibold text-white">Record field work</Link>}
        {currentState === "not_scheduled" && <button onClick={() => openVisitForm(relationship.scope)} className="min-h-11 rounded-lg bg-botanique-green px-4 text-[12px] font-semibold text-white">Schedule visit</button>}
      </div>}
    </section>

    {cycleForm && <form onSubmit={submitCompletion} className="rounded-xl border border-sky-200 bg-sky-50 p-4">
      <div className="flex items-start justify-between gap-3"><h2 className="text-[14px] font-semibold">Close visit</h2><button type="button" onClick={() => setCycleForm(null)} className="min-h-10 px-2 text-[12px] font-semibold text-gray-600">Close</button></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-[12px] font-medium">Outcome<select value={cycleForm.outcome} onChange={(e) => setCycleForm({ ...cycleForm, outcome: e.target.value, followUpRequired: e.target.value === "partial" ? true : cycleForm.followUpRequired })} className="mt-1 block min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3"><option value="completed">Completed</option><option value="partial">Partially completed</option></select></label>
        <div className="rounded-lg bg-white px-3 py-2 text-[11.5px]"><p className="text-gray-500">Execution</p><Link to={`/admin/daily-site-operations/${cycleForm.execution.id}`} className="mt-1 block font-semibold text-botanique-green">Accepted DSR · {showDate(cycleForm.execution.workDate)} →</Link></div>
        <label className="text-[12px] font-medium sm:col-span-2">Result<textarea rows={3} value={cycleForm.completionNote} onChange={(e) => setCycleForm({ ...cycleForm, completionNote: e.target.value })} className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2" required /></label>
        <fieldset className="sm:col-span-2"><legend className="text-[12px] font-medium">Follow-up required?</legend><div className="mt-1 flex gap-2"><button type="button" onClick={() => setCycleForm({ ...cycleForm, followUpRequired: false, followUpNote: "", outcome: cycleForm.outcome === "partial" ? "completed" : cycleForm.outcome })} className={`min-h-11 rounded-lg border px-4 text-[12px] font-semibold ${!cycleForm.followUpRequired ? "border-botanique-green bg-white text-botanique-green" : "border-stone-300 bg-white"}`}>No</button><button type="button" onClick={() => setCycleForm({ ...cycleForm, followUpRequired: true })} className={`min-h-11 rounded-lg border px-4 text-[12px] font-semibold ${cycleForm.followUpRequired ? "border-botanique-green bg-white text-botanique-green" : "border-stone-300 bg-white"}`}>Yes</button></div></fieldset>
        {cycleForm.followUpRequired && <label className="text-[12px] font-medium sm:col-span-2">Follow-up<textarea rows={2} value={cycleForm.followUpNote} onChange={(e) => setCycleForm({ ...cycleForm, followUpNote: e.target.value })} className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2" required /></label>}
        <div className="sm:col-span-2 rounded-lg border border-sky-100 bg-white p-3"><label className="flex items-center gap-2 text-[12px] font-semibold"><input type="checkbox" checked={cycleForm.scheduleNext} onChange={(e) => setCycleForm({ ...cycleForm, scheduleNext: e.target.checked })}/>Schedule another visit</label>{cycleForm.scheduleNext && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-[12px] font-medium">Date<input type="date" value={cycleForm.nextScheduledDate} onChange={(e) => setCycleForm({ ...cycleForm, nextScheduledDate: e.target.value })} className="mt-1 block min-h-11 w-full rounded-lg border border-stone-300 px-3" required /></label><label className="text-[12px] font-medium">Work planned<input value={cycleForm.nextPurpose} onChange={(e) => setCycleForm({ ...cycleForm, nextPurpose: e.target.value })} className="mt-1 block min-h-11 w-full rounded-lg border border-stone-300 px-3" required /></label></div>}</div>
      </div>
      <button className="mt-4 min-h-11 rounded-lg bg-botanique-green px-4 text-[12px] font-semibold text-white">Save completion</button>
    </form>}

    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,.75fr)] lg:items-start">
      <div className="space-y-4">
        <Panel title="Planned visits" action={canManageMaintenance(role) && relationship.status === "active" && currentState !== "not_scheduled" && currentState !== "follow_up" && <button onClick={() => showVisitForm ? setShowVisitForm(false) : openVisitForm("")} className="min-h-10 text-[12px] font-semibold text-botanique-green">{showVisitForm ? "Close" : "Add visit"}</button>}>
          {showVisitForm && relationship.status === "active" && <form onSubmit={submitVisit} className="mb-3 grid gap-3 rounded-lg bg-stone-50 p-3 sm:grid-cols-3"><label className="text-[12px] font-medium">Date<input type="date" value={visitForm.scheduledDate} onChange={(e) => setVisitForm({ ...visitForm, scheduledDate: e.target.value })} className="mt-1 block min-h-11 w-full rounded-lg border border-stone-300 px-3" required /></label><label className="text-[12px] font-medium sm:col-span-2">Work planned<input value={visitForm.purpose} onChange={(e) => setVisitForm({ ...visitForm, purpose: e.target.value })} className="mt-1 block min-h-11 w-full rounded-lg border border-stone-300 px-3" required /></label><button className="min-h-11 rounded-lg bg-botanique-green px-3 text-[12px] font-semibold text-white sm:col-span-3 sm:w-fit">Save visit</button></form>}
          {!scheduledVisits.length && <p className="text-[12.5px] text-gray-500">No scheduled visit.</p>}
          <ul className="divide-y divide-stone-100">{scheduledVisits.map((visit) => {
            const execution = fieldByDate.get(visit.scheduledDate);
            const workState = visitWorkState(visit, execution);
            const primary = workState === "needs_closure"
              ? <button onClick={() => startCompletion(visit)} className="inline-flex min-h-11 items-center rounded-lg border border-stone-300 px-3 text-[11.5px] font-semibold text-botanique-green">Complete</button>
              : execution
                ? <Link to={`/admin/daily-site-operations/${execution.id}`} className="inline-flex min-h-11 items-center rounded-lg border border-stone-300 px-3 text-[11.5px] font-semibold text-botanique-green">Open DSR</Link>
                : <Link to={`/admin/daily-site-operations/new?project=${relationship.projectId}&date=${visit.scheduledDate}`} className="inline-flex min-h-11 items-center rounded-lg border border-stone-300 px-3 text-[11.5px] font-semibold text-botanique-green">Record field work</Link>;
            return <li key={visit.id} className="py-3">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div><p className="text-[12.5px] font-semibold">{showDate(visit.scheduledDate)}</p><p className="mt-0.5 text-[11.5px] text-gray-500">{visit.purpose}</p>{execution && <Link to={`/admin/daily-site-operations/${execution.id}`} className="mt-1 block text-[10.5px] font-semibold text-botanique-green">DSR: {entryLabel(execution.state)} →</Link>}</div>
                {canManageMaintenance(role) && relationship.status === "active" && <div className="flex flex-wrap items-center gap-2">{primary}<button type="button" onClick={() => setMoreVisitId((id) => id === visit.id ? "" : visit.id)} className="min-h-11 rounded-lg border border-stone-300 px-3 text-[11.5px] font-semibold text-gray-600">More</button></div>}
              </div>
              {moreVisitId === visit.id && relationship.status === "active" && <div className="mt-2 flex flex-wrap gap-2 sm:justify-end"><button onClick={() => startSimpleVisitAction(visit, "reschedule")} className="min-h-10 rounded-lg border border-stone-300 px-3 text-[11.5px] font-semibold text-gray-600">Reschedule</button><button onClick={() => startSimpleVisitAction(visit, "cancel")} className="min-h-10 rounded-lg border border-red-200 px-3 text-[11.5px] font-semibold text-red-700">Cancel visit</button></div>}
              {actingOnVisit?.visit.id === visit.id && <form onSubmit={submitSimpleVisitAction} className="mt-3 rounded-lg bg-stone-50 p-3">{actingOnVisit.kind === "reschedule" ? <label className="text-[12px] font-medium">New date<input type="date" value={visitActionForm.newDate} onChange={(e) => setVisitActionForm({ ...visitActionForm, newDate: e.target.value })} className="mt-1 block min-h-11 w-full rounded-lg border border-stone-300 px-3" required /></label> : <label className="text-[12px] font-medium">Cancellation reason<textarea rows={2} value={visitActionForm.note} onChange={(e) => setVisitActionForm({ ...visitActionForm, note: e.target.value })} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2" required /></label>}<div className="mt-2 flex gap-2"><button className="min-h-11 rounded-lg bg-botanique-green px-3 text-[11.5px] font-semibold text-white">Confirm</button><button type="button" onClick={() => setActingOnVisit(null)} className="min-h-11 rounded-lg border border-stone-300 px-3 text-[11.5px] font-semibold">Back</button></div></form>}
            </li>;
          })}</ul>
        </Panel>

        <Panel title="Field execution" action={fieldActivity.length > 3 && <button onClick={() => setShowFieldHistory((open) => !open)} className="min-h-10 text-[12px] font-semibold text-botanique-green">{showFieldHistory ? "Show less" : `View all ${fieldActivity.length}`}</button>}>
          {!fieldActivity.length ? <p className="text-[12.5px] text-gray-500">No Daily Site Record since Maintenance started.</p> : <ul className="divide-y divide-stone-100">{fieldActivity.slice(0, showFieldHistory ? fieldActivity.length : 3).map((entry) => <li key={entry.id} className="py-3"><Link to={`/admin/daily-site-operations/${entry.id}`} className="block"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[12.5px] font-semibold">{showDate(entry.workDate)} · {entry.disposition === "working" ? `${entry.expectedWorkerCount || 0} casual/site crew` : "No work"}</p><p className="mt-1 text-[11.5px] text-gray-600">{entry.workPlanned || entry.notes || "Site activity recorded"}</p></div><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${entryTone(entry.state)}`}>{entryLabel(entry.state)}</span></div></Link></li>)}</ul>}
        </Panel>

        <Panel title="Visit history">
          {!pastVisits.length && <p className="text-[12.5px] text-gray-500">No completed or cancelled visits.</p>}
          <ul className="divide-y divide-stone-100">{pastVisits.map((visit) => <li key={visit.id} className="py-3"><div className="flex items-start justify-between gap-3"><div><p className="text-[12.5px] font-semibold">{showDate(visit.scheduledDate)} · {visit.purpose}</p><p className="mt-1 text-[11.5px] text-gray-600">{visit.status === "completed" ? visit.completionNote : visit.cancellationReason}</p>{visit.followUpRequired && <p className="mt-1 text-[11px] font-medium text-red-700">Follow-up: {visit.followUpNote}</p>}{visit.dailySiteEntryId && <Link to={`/admin/daily-site-operations/${visit.dailySiteEntryId}`} className="mt-1 block text-[10.5px] font-semibold text-botanique-green">Linked DSR →</Link>}</div><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${visitTone[visit.status] || ""}`}>{visitStatusLabel(visit.status)}</span></div></li>)}</ul>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title="Maintenance details" action={canManageMaintenance(role) && relationship.status !== "ended" && !editingDetails && <button onClick={startEditingDetails} className="min-h-10 text-[12px] font-semibold text-botanique-green">Edit</button>}>
          {editingDetails && detailsForm && <form onSubmit={submitDetails} className="mb-3 grid gap-3 rounded-lg bg-stone-50 p-3"><label className="text-[12px] font-medium">Scope<textarea rows={3} value={detailsForm.scope} onChange={(e) => setDetailsForm({ ...detailsForm, scope: e.target.value })} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2" required /></label><label className="text-[12px] font-medium">Start date<input type="date" value={detailsForm.startDate} onChange={(e) => setDetailsForm({ ...detailsForm, startDate: e.target.value })} className="mt-1 block min-h-11 w-full rounded-lg border border-stone-300 px-3" required /></label><label className="text-[12px] font-medium">Current arrangement<select value={detailsForm.frequency} onChange={(e) => setDetailsForm({ ...detailsForm, frequency: e.target.value })} className="mt-1 block min-h-11 w-full rounded-lg border border-stone-300 px-3">{MAINTENANCE_FREQUENCIES.map((value) => <option key={value} value={value}>{frequencyLabel(value)}</option>)}</select></label><div className="flex gap-2"><button className="min-h-11 rounded-lg bg-botanique-green px-3 text-[11.5px] font-semibold text-white">Save</button><button type="button" onClick={() => setEditingDetails(false)} className="min-h-11 rounded-lg border border-stone-300 px-3 text-[11.5px] font-semibold">Cancel</button></div></form>}
          <dl className="space-y-2 text-[12.5px]"><DetailRow label="Status" value={relationshipStatusLabel(relationship.status)}/><DetailRow label="Arrangement" value={frequencyLabel(relationship.frequency)}/><DetailRow label="Start date" value={showDate(relationship.startDate)}/><DetailRow label="Last completed visit" value={relationship.lastVisitDate ? showDate(relationship.lastVisitDate) : "None yet"}/><DetailRow label="Next visit" value={nextVisitValue}/></dl>
          <p className="mt-3 border-t border-stone-100 pt-3 text-[12px] leading-relaxed text-gray-600">{relationship.scope}</p>
          {canManageMaintenance(role) && relationship.status !== "ended" && <div className="mt-3 flex flex-wrap gap-3 border-t border-stone-100 pt-3 text-[11.5px] font-semibold">{relationship.status === "active" ? <button onClick={() => setConfirmingTransition("pause")} className="min-h-10 text-botanique-green">Pause Maintenance</button> : <button onClick={() => submitTransition("resume")} className="min-h-10 text-botanique-green">Resume Maintenance</button>}{canEndMaintenance(role) && <button onClick={() => setConfirmingTransition("end")} className="min-h-10 text-gray-600">End Maintenance</button>}</div>}
          {confirmingTransition && <form onSubmit={(e) => { e.preventDefault(); submitTransition(confirmingTransition); }} className="mt-3 rounded-lg bg-stone-50 p-3"><label className="text-[12px] font-medium">Reason {confirmingTransition === "pause" ? "(optional)" : ""}<textarea rows={2} value={transitionReason} onChange={(e) => setTransitionReason(e.target.value)} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2" required={confirmingTransition === "end"} /></label><div className="mt-2 flex gap-2"><button className="min-h-11 rounded-lg bg-botanique-green px-3 text-[11.5px] font-semibold text-white">Confirm</button><button type="button" onClick={() => setConfirmingTransition("")} className="min-h-11 rounded-lg border border-stone-300 px-3 text-[11.5px] font-semibold">Cancel</button></div></form>}
        </Panel>

        <Panel title="Assigned team" action={canManageMaintenance(role) && relationship.status !== "ended" && <button onClick={() => setShowAssignForm((open) => !open)} className="min-h-10 text-[12px] font-semibold text-botanique-green">{showAssignForm ? "Close" : "Assign person"}</button>}>
          {showAssignForm && <form onSubmit={submitAssignment} className="mb-3 grid gap-3 rounded-lg bg-stone-50 p-3"><label className="text-[12px] font-medium">Person<select value={assignForm.personId} onChange={(e) => setAssignForm({ ...assignForm, personId: e.target.value })} className="mt-1 block min-h-11 w-full rounded-lg border border-stone-300 px-3" required><option value="">Choose person</option>{activePeople.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}</select></label><label className="text-[12px] font-medium">Responsibility<select value={assignForm.role} onChange={(e) => setAssignForm({ ...assignForm, role: e.target.value })} className="mt-1 block min-h-11 w-full rounded-lg border border-stone-300 px-3">{MAINTENANCE_ASSIGNMENT_ROLES.map((value) => <option key={value} value={value}>{assignmentRoleLabel(value)}</option>)}</select></label><label className="text-[12px] font-medium">Starts<input type="date" value={assignForm.startDate} onChange={(e) => setAssignForm({ ...assignForm, startDate: e.target.value })} className="mt-1 block min-h-11 w-full rounded-lg border border-stone-300 px-3" required /></label><button className="min-h-11 rounded-lg bg-botanique-green px-3 text-[11.5px] font-semibold text-white">Assign</button></form>}
          {!currentTeam.length && <p className="text-[12.5px] text-gray-500">Nobody is currently assigned.</p>}
          <ul className="divide-y divide-stone-100">{currentTeam.map((assignment) => <li key={assignment.id} className="py-3"><div className="flex items-start justify-between gap-3"><div><p className="text-[12.5px] font-semibold">{assignment.personName}</p><p className="mt-0.5 text-[11px] text-gray-500">{assignmentRoleLabel(assignment.role)} · since {showDate(assignment.startDate)}</p></div>{canManageMaintenance(role) && relationship.status !== "ended" && <button onClick={() => report(endAssignment(assignment.id, assignment.version), "Assignment ended.")} className="min-h-10 text-[11px] font-semibold text-gray-600">End</button>}</div>{canCorrectMaintenanceAssignment(role) && relationship.status !== "ended" && <button onClick={() => startCorrection(assignment)} className="min-h-10 text-[10.5px] font-semibold text-botanique-green">Correct assignment</button>}{correcting?.id === assignment.id && correctionForm && <form onSubmit={submitCorrection} className="mt-2 grid gap-2 rounded-lg bg-stone-50 p-3"><select value={correctionForm.role} onChange={(e) => setCorrectionForm({ ...correctionForm, role: e.target.value })} className="min-h-11 rounded-lg border border-stone-300 px-2 text-[12px]">{MAINTENANCE_ASSIGNMENT_ROLES.map((value) => <option key={value} value={value}>{assignmentRoleLabel(value)}</option>)}</select><input type="date" value={correctionForm.startDate} onChange={(e) => setCorrectionForm({ ...correctionForm, startDate: e.target.value })} className="min-h-11 rounded-lg border border-stone-300 px-2 text-[12px]"/><textarea rows={2} value={correctionForm.correctionReason} onChange={(e) => setCorrectionForm({ ...correctionForm, correctionReason: e.target.value })} placeholder="Reason for correction" className="rounded-lg border border-stone-300 px-2 py-2 text-[12px]" required/><div className="flex gap-2"><button className="min-h-11 rounded-lg bg-botanique-green px-3 text-[11px] font-semibold text-white">Save correction</button><button type="button" onClick={() => setCorrecting(null)} className="min-h-11 rounded-lg border border-stone-300 px-3 text-[11px] font-semibold">Cancel</button></div></form>}</li>)}</ul>
          {pastTeam.length > 0 && <div className="mt-3 border-t border-stone-100 pt-3"><p className="text-[10.5px] font-semibold uppercase tracking-wide text-gray-500">Past assignments</p>{pastTeam.map((assignment) => <p key={assignment.id} className="mt-2 text-[11.5px] text-gray-600">{assignment.personName} · {assignmentRoleLabel(assignment.role)} · {showDate(assignment.startDate)}–{showDate(assignment.endDate)}</p>)}</div>}
        </Panel>
      </div>
    </div>
  </section>;
}
