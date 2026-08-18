import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PORTFOLIO_PUBLICATION_OPTIONS, PROJECT_TYPES, derivePortfolioEligible } from "../constants/projectStatus";
import { useAdminData } from "../context/adminData";
import { leadOptionsForRole, projectFormCapabilities } from "../utils/projectCapabilities";
import {
  buildCreatePayload,
  buildUpdatePatch,
  deriveInitialStatusFromStage,
  emptyProjectForm,
  hasErrors,
  projectToFormState,
  validateProjectForm,
} from "../utils/projectForm";
import { formalProfileName } from "../utils/personName";
import MaterialChangeProposal from "./approvals/MaterialChangeProposal";

function Field({ label, htmlFor, error, hint, children, required }) {
  return <label className="block" htmlFor={htmlFor}>
    <span className="mb-1 block text-xs font-medium text-gray-600">{label}{required && <span className="text-red-600"> *</span>}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>}
    {error && <span className="mt-1 block text-xs text-red-600" role="alert">{error}</span>}
  </label>;
}

const inputClass = "w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-botanique-green focus:outline-none focus:ring-2 focus:ring-botanique-green/30 disabled:bg-stone-50 disabled:text-gray-500";

function ReadOnlyValue({ label, value }) {
  return <div><span className="mb-1 block text-xs font-medium text-gray-600">{label}</span><p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-gray-600">{value}</p></div>;
}

export default function ProjectForm({ mode, project }) {
  const navigate = useNavigate();
  const { role, profiles, currentUserId, createProject, updateProject } = useAdminData();
  const caps = useMemo(() => projectFormCapabilities(role, mode, project), [role, mode, project]);
  const leadOptions = useMemo(() => leadOptionsForRole(role, profiles, currentUserId), [role, profiles, currentUserId]);
  const [form, setForm] = useState(() => mode === "edit" && project ? projectToFormState(project) : emptyProjectForm(role));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const hasProtectedLead = mode === "edit" && Boolean(project?.leadPersonId) && !project?.leadPersonResolved;
  const [changingLead, setChangingLead] = useState(false);

  function setField(key, value) {
    setForm((current) => {
      if (mode === "create" && key === "stage") {
        return { ...current, stage: value, status: deriveInitialStatusFromStage(value) };
      }
      if (mode === "edit" && key === "status" && value === "Completed") {
        return { ...current, status: value, stage: "Completed", nextAction: "", nextActionDate: "", blocker: "" };
      }
      if (mode === "edit" && key === "status" && value === "Pending") {
        return { ...current, status: value, stage: "Inquiry" };
      }
      return { ...current, [key]: value };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    setServerError("");
    const validation = validateProjectForm(form);
    setErrors(validation);
    if (hasErrors(validation)) return;
    let submitForm = form;
    if (hasProtectedLead && !changingLead) submitForm = { ...form, leadPersonId: project.leadPersonId };
    setBusy(true);
    const result = mode === "create"
      ? await createProject(buildCreatePayload(submitForm, role))
      : await updateProject(project.id, buildUpdatePatch(submitForm, project, role));
    setBusy(false);
    if (result.ok) navigate(result.id ? `/admin/projects/${result.id}` : "/admin/projects");
    else setServerError(result.error || "The save did not complete.");
  }

  const completedCreate = mode === "create" && form.stage === "Completed";

  return <div className="space-y-6">
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {serverError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{serverError}</div>}

      <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-base font-semibold">Project details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {caps.materialEditable ? <Field label="Project name" htmlFor="projectName" error={errors.projectName} required><input id="projectName" maxLength={160} value={form.projectName} onChange={(e) => setField("projectName", e.target.value)} className={inputClass}/></Field> : <ReadOnlyValue label="Project name" value={form.projectName || "Not set"}/>} 
          {caps.materialEditable ? <Field label="Site / property name" htmlFor="clientSiteName" error={errors.clientSiteName} hint={mode === "create" ? "Physical property or site this project belongs to." : undefined}><input id="clientSiteName" maxLength={160} value={form.clientSiteName} onChange={(e) => setField("clientSiteName", e.target.value)} placeholder="Example: Krave Hotel" className={inputClass}/></Field> : <ReadOnlyValue label="Site / property name" value={form.clientSiteName || "Not set"}/>} 
          {caps.materialEditable ? <Field label="Project type" htmlFor="projectType"><select id="projectType" value={form.projectType} onChange={(e) => setField("projectType", e.target.value)} className={inputClass}>{PROJECT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></Field> : <ReadOnlyValue label="Project type" value={form.projectType}/>} 
          {caps.materialEditable ? <Field label="Location" htmlFor="location" error={errors.location}><input id="location" maxLength={120} value={form.location} onChange={(e) => setField("location", e.target.value)} className={inputClass}/></Field> : <ReadOnlyValue label="Location" value={form.location || "Not set"}/>} 
          {caps.materialEditable ? <Field label="County" htmlFor="county" error={errors.county}><input id="county" maxLength={80} value={form.county} onChange={(e) => setField("county", e.target.value)} className={inputClass}/></Field> : <ReadOnlyValue label="County" value={form.county || "Not set"}/>} 
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-base font-semibold">Delivery position and responsibility</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {mode === "create"
            ? <ReadOnlyValue label="Initial status" value={deriveInitialStatusFromStage(form.stage)}/>
            : caps.statusEditable
              ? <Field label="Status" htmlFor="status"><select id="status" value={form.status} onChange={(e) => setField("status", e.target.value)} className={inputClass}>{caps.statusOptions.map((status) => <option key={status}>{status}</option>)}</select></Field>
              : <ReadOnlyValue label="Status" value={caps.proposesMaterial ? `${form.status} (change requires Principal approval)` : form.status}/>} 
          {caps.stageEditable
            ? <Field label="Current project phase" htmlFor="stage"><select id="stage" value={form.stage} onChange={(e) => setField("stage", e.target.value)} className={inputClass}>{caps.stageOptions.map((stage) => <option key={stage}>{stage}</option>)}</select></Field>
            : <ReadOnlyValue label="Current project phase" value={form.stage}/>} 
          {!caps.materialEditable ? <ReadOnlyValue label="Accountable project lead" value={project?.leadPersonName || (project?.leadPersonId ? "Assigned lead (protected)" : "Unassigned")}/>
            : hasProtectedLead && !changingLead ? <div><span className="mb-1 block text-xs font-medium text-gray-600">Accountable project lead</span><p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-gray-600">Current assigned lead — protected profile</p><button type="button" onClick={() => { setChangingLead(true); setField("leadPersonId", ""); }} className="mt-2 text-xs font-semibold text-botanique-green hover:underline">Change accountable lead</button></div>
            : <Field label="Accountable project lead" htmlFor="leadPersonId"><select id="leadPersonId" value={form.leadPersonId} onChange={(e) => setField("leadPersonId", e.target.value)} className={inputClass}><option value="">Unassigned</option>{leadOptions.map((option) => <option key={option.id} value={option.id}>{formalProfileName(option)}</option>)}</select></Field>}
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-base font-semibold">Schedule</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {caps.materialEditable ? <Field label="Planned / expected start" htmlFor="startDate"><input id="startDate" type="date" value={form.startDate} onChange={(e) => setField("startDate", e.target.value)} className={inputClass}/></Field> : <ReadOnlyValue label="Planned / expected start" value={form.startDate || "Not set"}/>} 
          {caps.materialEditable ? <Field label="Actual start" htmlFor="actualStartDate"><input id="actualStartDate" type="date" value={form.actualStartDate} onChange={(e) => setField("actualStartDate", e.target.value)} className={inputClass}/></Field> : <ReadOnlyValue label="Actual start" value={form.actualStartDate || "Not set"}/>} 
          {caps.targetCompletionEditable ? <Field label="Target completion" htmlFor="targetCompletionDate" error={errors.targetCompletionDate}><input id="targetCompletionDate" type="date" value={form.targetCompletionDate} onChange={(e) => setField("targetCompletionDate", e.target.value)} className={inputClass}/></Field> : <ReadOnlyValue label="Target completion" value={form.targetCompletionDate || "Not set"}/>} 
          {caps.actualCompletionVisible && <Field label={completedCreate ? "Actual completion (if known)" : "Actual completion"} htmlFor="actualCompletionDate" error={errors.actualCompletionDate}><input id="actualCompletionDate" type="date" value={form.actualCompletionDate} onChange={(e) => setField("actualCompletionDate", e.target.value)} className={inputClass}/></Field>}
        </div>
      </section>

      {!completedCreate && <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-base font-semibold">Current project action</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Next required action" htmlFor="nextAction" error={errors.nextAction}><input id="nextAction" maxLength={500} value={form.nextAction} onChange={(e) => setField("nextAction", e.target.value)} className={inputClass}/></Field>
          <Field label="Action due date" htmlFor="nextActionDate"><input id="nextActionDate" type="date" value={form.nextActionDate} onChange={(e) => setField("nextActionDate", e.target.value)} className={inputClass}/></Field>
        </div>
        <Field label="Current delivery constraint" htmlFor="blocker" error={errors.blocker}><textarea id="blocker" rows={2} maxLength={500} value={form.blocker} onChange={(e) => setField("blocker", e.target.value)} className={inputClass}/></Field>
      </section>}

      <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
        <Field label="Internal project notes" htmlFor="notes" error={errors.notes}><textarea id="notes" rows={4} maxLength={5000} value={form.notes} onChange={(e) => setField("notes", e.target.value)} className={inputClass}/></Field>
      </section>

      {(caps.portfolioEditable || mode === "create") && <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-base font-semibold">Portfolio</h2>
        {caps.portfolioEditable ? <Field label="Portfolio publication status" htmlFor="portfolioPublicationStatus"><select id="portfolioPublicationStatus" value={form.portfolioPermissionStatus} onChange={(e) => { const status=e.target.value; setForm((current) => ({...current, portfolioPermissionStatus:status, portfolioEligible:derivePortfolioEligible(status)})); }} className={inputClass}>{PORTFOLIO_PUBLICATION_OPTIONS.map((option)=><option key={option.value} value={option.value}>{option.label}</option>)}</select></Field> : <p className="text-sm text-gray-600">Portfolio review is Principal-controlled.</p>}
      </section>}

      <div className="sticky bottom-0 z-10 -mx-2 flex items-center gap-3 border-t border-stone-200 bg-[#f6f7f4]/95 px-2 py-3 backdrop-blur">
        <button type="submit" disabled={busy} className="rounded-md bg-botanique-green px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : mode === "create" ? "Create project" : caps.proposesMaterial ? "Save operational updates" : "Save changes"}</button>
        <button type="button" onClick={() => navigate(mode === "edit" && project ? `/admin/projects/${project.id}` : "/admin/projects")} disabled={busy} className="rounded-md border border-stone-200 px-5 py-2.5 text-sm font-medium text-gray-600">Cancel</button>
      </div>
    </form>
    {caps.proposesMaterial && mode === "edit" && project && <MaterialChangeProposal project={project}/>} 
  </div>;
}
