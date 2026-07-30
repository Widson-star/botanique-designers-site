// Amend-and-resubmit editor for a project_material_change request. Seeds from
// the request's current proposed values, keeps the SAME field set (the database
// validator requires the original/proposed key sets to match), and lets the
// requester revise each value + the reason before resubmitting for review.
import { useState } from "react";
import ConfirmDialog from "../ConfirmDialog";
import { PROJECT_TYPES } from "../../constants/projectStatus";
import { useAdminData } from "../../context/adminData";
import {
  MANAGER_STAGES,
  MANAGER_STATUS_TOGGLE,
  MATERIAL_FIELD_LABELS,
  leadOptionsForRole,
} from "../../utils/projectCapabilities";

const inputClass =
  "w-full rounded-md border border-stone-200 px-3 py-2 text-sm focus:border-botanique-green focus:outline-none";

function toFormValue(value) {
  return value === null || value === undefined ? "" : String(value);
}

export default function MaterialChangeAmendDialog({ request, onCancel, onSubmit }) {
  const { role, profiles, currentUserId } = useAdminData();
  const keys = Object.keys(request.proposedValues || {});
  const [values, setValues] = useState(() => {
    const seed = {};
    for (const key of keys) seed[key] = toFormValue(request.proposedValues[key]);
    return seed;
  });
  const [reason, setReason] = useState(request.reason || "");
  const [notes, setNotes] = useState(request.requesterNotes || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const leadOptions = leadOptionsForRole(role, profiles, currentUserId);

  function setValue(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    if (!reason.trim()) {
      setError("A reason is required.");
      return;
    }
    const proposedValues = {};
    for (const key of keys) {
      proposedValues[key] = values[key] === "" ? null : values[key];
    }
    setBusy(true);
    setError("");
    const result = await onSubmit({
      proposedValues,
      reason: reason.trim(),
      requesterNotes: notes.trim(),
    });
    setBusy(false);
    if (!result.ok) setError(result.error || "The amendment could not be submitted.");
  }

  return (
    <ConfirmDialog
      open
      title="Amend material change"
      description="Revise the proposed values and resubmit for Principal review."
      confirmLabel="Resubmit for review"
      confirmDisabled={!reason.trim()}
      busy={busy}
      onConfirm={submit}
      onCancel={onCancel}
    >
      <div className="space-y-4">
        {keys.map((key) => (
          <label key={key} className="block text-sm" htmlFor={`amend-${key}`}>
            <span className="mb-1 block text-xs font-medium text-gray-600">
              {MATERIAL_FIELD_LABELS[key] || key}
            </span>
            {key === "project_type" ? (
              <select id={`amend-${key}`} value={values[key]} onChange={(e) => setValue(key, e.target.value)} className={inputClass}>
                {PROJECT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            ) : key === "status" ? (
              <select id={`amend-${key}`} value={values[key]} onChange={(e) => setValue(key, e.target.value)} className={inputClass}>
                {[...new Set([values[key], ...MANAGER_STATUS_TOGGLE])].filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : key === "stage" ? (
              <select id={`amend-${key}`} value={values[key]} onChange={(e) => setValue(key, e.target.value)} className={inputClass}>
                {[...new Set([values[key], ...MANAGER_STAGES])].filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : key === "lead_person_id" ? (
              <select id={`amend-${key}`} value={values[key]} onChange={(e) => setValue(key, e.target.value)} className={inputClass}>
                <option value="">Unassigned</option>
                {leadOptions.map((o) => <option key={o.id} value={o.id}>{o.full_name || o.email}</option>)}
              </select>
            ) : key === "start_date" || key === "actual_start_date" ? (
              <input id={`amend-${key}`} type="date" value={values[key]} onChange={(e) => setValue(key, e.target.value)} className={inputClass} />
            ) : (
              <input id={`amend-${key}`} type="text" value={values[key]} onChange={(e) => setValue(key, e.target.value)} className={inputClass} />
            )}
          </label>
        ))}
        <label className="block text-sm" htmlFor="amend-reason">
          <span className="mb-1 block text-xs font-medium text-gray-600">Reason</span>
          <textarea id="amend-reason" rows={3} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm" htmlFor="amend-notes">
          <span className="mb-1 block text-xs font-medium text-gray-600">Requester notes (optional)</span>
          <textarea id="amend-notes" rows={2} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        </label>
        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      </div>
    </ConfirmDialog>
  );
}
