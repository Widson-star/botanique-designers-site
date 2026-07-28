// Shared, accessible project form used by BOTH the create (/admin/projects/new)
// and edit (/admin/projects/:id/edit) routes. Fields, options and read-only
// states are role-scoped by projectCapabilities so the UI never presents a
// control the database would reject. Only genuinely changed fields are sent on
// edit; audit and finance columns are never sent.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PORTFOLIO_PERMISSION_STATUSES,
  PROJECT_TYPES,
} from "../constants/projectStatus";
import { useAdminData } from "../context/adminData";
import {
  leadOptionsForRole,
  projectFormCapabilities,
} from "../utils/projectCapabilities";
import {
  buildCreatePayload,
  buildUpdatePatch,
  emptyProjectForm,
  hasErrors,
  projectToFormState,
  validateProjectForm,
} from "../utils/projectForm";
import { formalProfileName } from "../utils/personName";

function Field({ label, htmlFor, error, hint, children, required }) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="block text-xs font-medium text-gray-600 mb-1">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-gray-400 mt-1">{hint}</span>}
      {error && (
        <span className="block text-xs text-red-600 mt-1" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-botanique-green focus:outline-none focus:ring-2 focus:ring-botanique-green/30 disabled:bg-stone-50 disabled:text-gray-500";

function ReadOnlyValue({ label, value }) {
  return (
    <div>
      <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
      <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-gray-600">
        {value}
      </p>
    </div>
  );
}

export default function ProjectForm({ mode, project }) {
  const navigate = useNavigate();
  const {
    role,
    profiles,
    currentUserId,
    createProject,
    updateProject,
  } = useAdminData();

  const caps = useMemo(
    () => projectFormCapabilities(role, mode, project),
    [role, mode, project]
  );
  const leadOptions = useMemo(
    () => leadOptionsForRole(role, profiles, currentUserId),
    [role, profiles, currentUserId]
  );

  const [form, setForm] = useState(() =>
    mode === "edit" && project ? projectToFormState(project) : emptyProjectForm(role)
  );
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  // Whether the assigned lead is a protected (RLS-invisible) profile we must
  // preserve unless the user explicitly changes it.
  const hasProtectedLead =
    mode === "edit" &&
    Boolean(project?.leadPersonId) &&
    !project?.leadPersonResolved;
  const [changingLead, setChangingLead] = useState(false);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return; // duplicate-submit prevention
    setServerError("");

    const validation = validateProjectForm(form);
    setErrors(validation);
    if (hasErrors(validation)) return;

    // Preserve a protected lead untouched unless the user chose to change it.
    let submitForm = form;
    if (hasProtectedLead && !changingLead) {
      submitForm = { ...form, leadPersonId: project.leadPersonId };
    }

    setBusy(true);
    let result;
    if (mode === "create") {
      result = await createProject(buildCreatePayload(submitForm, role));
    } else {
      const patch = buildUpdatePatch(submitForm, project, role);
      result = await updateProject(project.id, patch);
    }
    setBusy(false);

    if (result.ok) {
      navigate(result.id ? `/admin/projects/${result.id}` : "/admin/projects");
    } else {
      // Failure: form values are preserved (state untouched); surface the error.
      setServerError(result.error || "The save did not complete.");
    }
  }

  const showActualCompletion = caps.actualCompletionVisible;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {serverError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {serverError}
        </div>
      )}

      <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-base font-semibold">Project details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Project name" htmlFor="projectName" error={errors.projectName} required>
            <input
              id="projectName"
              type="text"
              maxLength={160}
              value={form.projectName}
              onChange={(e) => setField("projectName", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Client / site label" htmlFor="clientSiteName" error={errors.clientSiteName}>
            <input
              id="clientSiteName"
              type="text"
              maxLength={160}
              value={form.clientSiteName}
              onChange={(e) => setField("clientSiteName", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Project type" htmlFor="projectType">
            <select
              id="projectType"
              value={form.projectType}
              onChange={(e) => setField("projectType", e.target.value)}
              className={inputClass}
            >
              {PROJECT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Location" htmlFor="location" error={errors.location}>
            <input
              id="location"
              type="text"
              maxLength={120}
              value={form.location}
              onChange={(e) => setField("location", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="County" htmlFor="county" error={errors.county}>
            <input
              id="county"
              type="text"
              maxLength={80}
              value={form.county}
              onChange={(e) => setField("county", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-base font-semibold">Status and responsibility</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {caps.statusEditable ? (
            <Field label="Status" htmlFor="status">
              <select
                id="status"
                value={form.status}
                onChange={(e) => setField("status", e.target.value)}
                className={inputClass}
              >
                {caps.statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <ReadOnlyValue
              label="Status"
              value={
                mode === "create"
                  ? "Pending (owner approval required to activate)"
                  : `${form.status} (owner-only change)`
              }
            />
          )}

          {caps.stageEditable ? (
            <Field label="Stage" htmlFor="stage">
              <select
                id="stage"
                value={form.stage}
                onChange={(e) => setField("stage", e.target.value)}
                className={inputClass}
              >
                {caps.stageOptions.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <ReadOnlyValue label="Stage" value={`${form.stage} (owner-only change)`} />
          )}

          {/* Accountable lead */}
          {hasProtectedLead && !changingLead ? (
            <div>
              <span className="block text-xs font-medium text-gray-600 mb-1">
                Accountable project lead
              </span>
              <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-gray-600">
                Current assigned lead — protected profile
              </p>
              <button
                type="button"
                onClick={() => {
                  setChangingLead(true);
                  setField("leadPersonId", "");
                }}
                className="mt-2 text-xs font-semibold text-botanique-green hover:underline"
              >
                Change accountable lead
              </button>
            </div>
          ) : (
            <Field label="Accountable project lead" htmlFor="leadPersonId">
              <select
                id="leadPersonId"
                value={form.leadPersonId}
                onChange={(e) => setField("leadPersonId", e.target.value)}
                className={inputClass}
              >
                <option value="">Unassigned</option>
                {leadOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {formalProfileName(option)}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-base font-semibold">Schedule</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Planned / expected start" htmlFor="startDate">
            <input
              id="startDate"
              type="date"
              value={form.startDate}
              onChange={(e) => setField("startDate", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Actual start" htmlFor="actualStartDate">
            <input
              id="actualStartDate"
              type="date"
              value={form.actualStartDate}
              onChange={(e) => setField("actualStartDate", e.target.value)}
              className={inputClass}
            />
          </Field>

          {caps.targetCompletionEditable ? (
            <Field
              label="Target completion"
              htmlFor="targetCompletionDate"
              error={errors.targetCompletionDate}
              hint={caps.manager ? "Proposed date; owner confirms on activation." : undefined}
            >
              <input
                id="targetCompletionDate"
                type="date"
                value={form.targetCompletionDate}
                onChange={(e) => setField("targetCompletionDate", e.target.value)}
                className={inputClass}
              />
            </Field>
          ) : (
            <ReadOnlyValue
              label="Target completion"
              value={form.targetCompletionDate || "Not set (owner-only)"}
            />
          )}

          {showActualCompletion && (
            <Field
              label="Actual completion"
              htmlFor="actualCompletionDate"
              error={errors.actualCompletionDate}
            >
              <input
                id="actualCompletionDate"
                type="date"
                value={form.actualCompletionDate}
                onChange={(e) => setField("actualCompletionDate", e.target.value)}
                className={inputClass}
              />
            </Field>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
        <div>
          <h2 className="text-base font-semibold">Next steps and internal notes</h2>
          <p className="mt-1 text-sm text-gray-500">
            Record the immediate team action, its timing and any context needed to keep work moving.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Next action"
            htmlFor="nextAction"
            error={errors.nextAction}
            hint="What must happen next?"
          >
            <input
              id="nextAction"
              type="text"
              maxLength={500}
              value={form.nextAction}
              onChange={(e) => setField("nextAction", e.target.value)}
              placeholder="Example: Confirm mobilisation date with the client"
              className={inputClass}
            />
          </Field>

          <Field
            label="Due date"
            htmlFor="nextActionDate"
            hint="When should this action be completed?"
          >
            <input
              id="nextActionDate"
              type="date"
              value={form.nextActionDate}
              onChange={(e) => setField("nextActionDate", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <Field
          label="Current blocker"
          htmlFor="blocker"
          error={errors.blocker}
          hint="What is preventing progress? Leave blank if nothing."
        >
          <textarea
            id="blocker"
            rows={2}
            maxLength={500}
            value={form.blocker}
            onChange={(e) => setField("blocker", e.target.value)}
            placeholder="Example: Awaiting client approval"
            className={inputClass}
          />
        </Field>

        <Field
          label="Internal notes"
          htmlFor="notes"
          error={errors.notes}
          hint="Background, decisions or instructions the team should retain."
        >
          <textarea
            id="notes"
            rows={4}
            maxLength={5000}
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            className={inputClass}
          />
        </Field>
      </section>

      {(caps.portfolioEditable || mode === "create") && (
        <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="text-base font-semibold">Portfolio</h2>
          {caps.portfolioEditable ? (
          <div className="grid md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-sm" htmlFor="portfolioEligible">
              <input
                id="portfolioEligible"
                type="checkbox"
                checked={form.portfolioEligible}
                onChange={(e) => setField("portfolioEligible", e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-botanique-green focus:ring-botanique-green"
              />
              Portfolio eligible
            </label>

            <Field label="Portfolio permission status" htmlFor="portfolioPermissionStatus">
              <select
                id="portfolioPermissionStatus"
                value={form.portfolioPermissionStatus}
                onChange={(e) => setField("portfolioPermissionStatus", e.target.value)}
                className={inputClass}
              >
                {PORTFOLIO_PERMISSION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          ) : (
            <div className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-gray-600">
              New manager-created projects are fixed to <strong>not portfolio eligible</strong>{" "}
              and <strong>Not Reviewed</strong>. The owner reviews any later portfolio
              eligibility or publication permission decision.
            </div>
          )}
        </section>
      )}

      <div className="sticky bottom-0 z-10 -mx-2 flex items-center gap-3 border-t border-stone-200 bg-[#f6f7f4]/95 px-2 py-3 backdrop-blur">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-botanique-green px-5 py-2.5 text-sm font-semibold text-white hover:bg-botanique-dark transition disabled:opacity-60"
        >
          {busy ? "Saving…" : mode === "create" ? "Create project" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => navigate(mode === "edit" && project ? `/admin/projects/${project.id}` : "/admin/projects")}
          disabled={busy}
          className="rounded-md border border-stone-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-stone-50 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
