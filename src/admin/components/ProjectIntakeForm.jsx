// Manager project-intake proposal form (replaces direct project creation for a
// manager). Submitting creates a project_intake_requests proposal only — NO live
// project row exists until the Principal approves.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PROJECT_TYPES } from "../constants/projectStatus";
import { useAdminIntake } from "../context/adminIntake";
import { buildIntakePayload } from "../utils/projectForm";

const inputClass =
  "w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-botanique-green focus:outline-none focus:ring-2 focus:ring-botanique-green/30";

const emptyForm = {
  projectName: "",
  projectType: "Residential",
  clientSiteName: "",
  location: "",
  county: "",
  startDate: "",
  targetCompletionDate: "",
  notes: "",
};

export default function ProjectIntakeForm() {
  const navigate = useNavigate();
  const { submit } = useAdminIntake();
  const [form, setForm] = useState(emptyForm);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!form.projectName.trim()) {
      setError("A project name is required.");
      return;
    }
    if (form.startDate && form.targetCompletionDate && form.targetCompletionDate < form.startDate) {
      setError("Target completion cannot precede the planned start.");
      return;
    }
    if (!reason.trim()) {
      setError("A reason for the Principal is required.");
      return;
    }
    const proposedValues = buildIntakePayload({
      projectName: form.projectName,
      projectType: form.projectType,
      clientSiteName: form.clientSiteName,
      location: form.location,
      county: form.county,
      notes: form.notes,
      startDate: form.startDate,
      targetCompletionDate: form.targetCompletionDate,
    });
    setBusy(true);
    const result = await submit({ proposedValues, reason: reason.trim() });
    setBusy(false);
    if (result.ok) {
      navigate("/admin/project-intakes");
    } else {
      setError(result.error || "The intake could not be submitted.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="rounded-lg border border-botanique-green/30 bg-botanique-green/5 px-4 py-3 text-sm text-botanique-charcoal">
        This proposes a new project for Principal approval. No live project is created
        until the Principal approves the intake.
      </div>
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-base font-semibold">Proposed project</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm" htmlFor="intake-name">
            <span className="mb-1 block text-xs font-medium text-gray-600">Project name <span className="text-red-600">*</span></span>
            <input id="intake-name" type="text" maxLength={160} value={form.projectName} onChange={(e) => setField("projectName", e.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm" htmlFor="intake-type">
            <span className="mb-1 block text-xs font-medium text-gray-600">Project type</span>
            <select id="intake-type" value={form.projectType} onChange={(e) => setField("projectType", e.target.value)} className={inputClass}>
              {PROJECT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label className="block text-sm" htmlFor="intake-client">
            <span className="mb-1 block text-xs font-medium text-gray-600">Client / site label</span>
            <input id="intake-client" type="text" maxLength={160} value={form.clientSiteName} onChange={(e) => setField("clientSiteName", e.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm" htmlFor="intake-location">
            <span className="mb-1 block text-xs font-medium text-gray-600">Location</span>
            <input id="intake-location" type="text" maxLength={120} value={form.location} onChange={(e) => setField("location", e.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm" htmlFor="intake-county">
            <span className="mb-1 block text-xs font-medium text-gray-600">County</span>
            <input id="intake-county" type="text" maxLength={80} value={form.county} onChange={(e) => setField("county", e.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm" htmlFor="intake-start">
            <span className="mb-1 block text-xs font-medium text-gray-600">Planned start</span>
            <input id="intake-start" type="date" value={form.startDate} onChange={(e) => setField("startDate", e.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm" htmlFor="intake-target">
            <span className="mb-1 block text-xs font-medium text-gray-600">Target completion</span>
            <input id="intake-target" type="date" value={form.targetCompletionDate} onChange={(e) => setField("targetCompletionDate", e.target.value)} className={inputClass} />
          </label>
        </div>
        <label className="block text-sm" htmlFor="intake-notes">
          <span className="mb-1 block text-xs font-medium text-gray-600">Notes</span>
          <textarea id="intake-notes" rows={3} maxLength={5000} value={form.notes} onChange={(e) => setField("notes", e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm" htmlFor="intake-reason">
          <span className="mb-1 block text-xs font-medium text-gray-600">Reason for the Principal <span className="text-red-600">*</span></span>
          <textarea id="intake-reason" rows={3} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="rounded-md bg-botanique-green px-5 py-2.5 text-sm font-semibold text-white hover:bg-botanique-dark disabled:opacity-60">
          {busy ? "Submitting…" : "Submit intake for approval"}
        </button>
        <button type="button" onClick={() => navigate("/admin/projects")} disabled={busy} className="rounded-md border border-stone-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-stone-50 disabled:opacity-50">
          Cancel
        </button>
      </div>
    </form>
  );
}
