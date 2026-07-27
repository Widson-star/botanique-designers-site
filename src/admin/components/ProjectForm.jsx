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

      <section className="bg-white border border-stone-200 rounded-lg p-5 space-y-4">
        <h2 className="font-bold text-base">Project details</h2>
        <div className="grid md:grid-cols-2 gap-4">
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

      <section className="bg-white border border-stone-200 rounded-lg p-5 space-y-4">
        <h2 className="font-bold text-base">Status & responsibility</h2>
        <div className="grid md:grid-cols-2 gap-4">
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
                    {option.full_name || option.email}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
      </section>

      <section className="bg-white border border-stone-200 rounded-lg p-5 space-y-4">
        <h2 className="font-bold text-base">Schedule</h2>
        <div className="grid md:grid-cols-2 gap-4">
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

      <section className="bg-white border border-stone-200 rounded-lg p-5 space-y-4">
        <h2 className="font-bold text-base">Coordination</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Next action" htmlFor="nextAction" error={errors.nextAction}>
            <input
              id="nextAction"
              type="text"
              maxLength={500}
              value={form.nextAction}
              onChange={(e) => setField("nextAction", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Next-action date" htmlFor="nextActionDate">
            <input
              id="nextActionDate"
              type="date"
              value={form.nextActionDate}
              onChange={(e) => setField("nextActionDate", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Blocker" htmlFor="blocker" error={errors.blocker} hint="Leave blank if none.">
          <textarea
            id="blocker"
            rows={2}
            maxLength={500}
            value={form.blocker}
            onChange={(e) => setField("blocker", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Notes" htmlFor="notes" error={errors.notes}>
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

      <section className="bg-white border border-stone-200 rounded-lg p-5 space-y-4">
        <h2 className="font-bold text-base">Portfolio</h2>
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
          <div className="grid md:grid-cols-2 gap-4">
            <ReadOnlyValue
              label="Portfolio eligible"
              value={form.portfolioEligible ? "Yes" : "No"}
            />
            <ReadOnlyValue
              label="Portfolio permission status"
              value={`${form.portfolioPermissionStatus} (owner-only)`}
            />
          </div>
        )}
      </section>

      <div className="flex items-center gap-3">
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
