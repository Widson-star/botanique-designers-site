// Phase 1B-A4 — manager material-change proposal.
//
// Material identity/authority/schedule fields are read-only for a manager (the
// database rejects a direct write). This section lets an authorised manager
// PROPOSE a change to one or more of them; the project is unchanged until the
// Principal approves. A pending banner replaces the form while a material change
// is already awaiting review (one active material change per project).
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PROJECT_TYPES } from "../../constants/projectStatus";
import { useAdminData } from "../../context/adminData";
import { useAdminApprovals } from "../../context/adminApprovals";
import { ACTIVE_APPROVAL_STATES } from "../../utils/approvalCapabilities";
import {
  MANAGER_STAGES,
  MATERIAL_FIELD_KEYS,
  MATERIAL_FIELD_LABELS,
  leadOptionsForRole,
} from "../../utils/projectCapabilities";
import { buildMaterialProposal } from "../../utils/projectForm";
import { readableApprovalValue } from "../../utils/approvalFormatters";
import ApprovalComparison from "./ApprovalComparison";

const inputClass =
  "w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-botanique-green focus:outline-none focus:ring-2 focus:ring-botanique-green/30";

function currentMaterialForm(project) {
  return {
    project_name: project.projectName || "",
    client_site_name: project.clientSiteName || "",
    location: project.location || "",
    county: project.county || "",
    project_type: project.projectType || "Residential",
    stage: project.stage || "",
    lead_person_id: project.leadPersonId || "",
    start_date: project.startDate || "",
    actual_start_date: project.actualStartDate || "",
  };
}

// Normalise a form value to the DB-shaped proposal value (blank -> null).
function normalise(key, value) {
  if (value === "" || value === undefined) return null;
  return value;
}

export default function MaterialChangeProposal({ project }) {
  const { role, profiles, currentUserId, profilesById } = useAdminData();
  const { requests, submit, withdraw } = useAdminApprovals();
  const [form, setForm] = useState(() => currentMaterialForm(project));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pending = useMemo(
    () =>
      requests.find(
        (request) =>
          request.projectId === project.id &&
          request.approvalType === "project_material_change" &&
          ACTIVE_APPROVAL_STATES.includes(request.state)
      ),
    [requests, project.id]
  );

  const leadOptions = useMemo(
    () => leadOptionsForRole(role, profiles, currentUserId),
    [role, profiles, currentUserId]
  );

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  // Diff the proposal form (normalised) against the live project.
  const proposalPreview = useMemo(() => {
    const proposed = {};
    for (const key of MATERIAL_FIELD_KEYS) {
      proposed[key] = normalise(key, form[key]);
    }
    return buildMaterialProposal(project, proposed);
  }, [form, project]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (proposalPreview.changedKeys.length === 0) {
      setError("Change at least one material field to propose.");
      return;
    }
    if (!reason.trim()) {
      setError("A reason is required for Principal review.");
      return;
    }
    setBusy(true);
    const result = await submit({
      projectId: project.id,
      approvalType: "project_material_change",
      requesterId: currentUserId,
      originalValues: proposalPreview.originalValues,
      proposedValues: proposalPreview.proposedValues,
      reason: reason.trim(),
    });
    setBusy(false);
    if (result.ok) {
      setReason("");
      setForm(currentMaterialForm(project));
    } else {
      setError(result.error || "The proposal could not be submitted.");
    }
  }

  if (pending) {
    return (
      <section
        className="rounded-lg border border-amber-300 bg-amber-50 p-5"
        aria-labelledby="material-pending-title"
      >
        <h2 id="material-pending-title" className="text-base font-semibold text-amber-900">
          Material change awaiting Principal approval
        </h2>
        <p className="mt-1 text-sm text-amber-800">
          This project is unchanged until the Principal decides. You may withdraw or
          amend the proposal below.
        </p>
        <div className="mt-4">
          <ApprovalComparison request={pending} profilesById={profilesById} />
        </div>
        {pending.reason && (
          <p className="mt-3 text-sm text-amber-900">
            <span className="font-medium">Reason:</span> {pending.reason}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to={`/admin/approvals/${pending.id}`}
            className="rounded-md bg-botanique-green px-3 py-2 text-xs font-semibold text-white hover:bg-botanique-dark"
          >
            View proposal
          </Link>
          <button
            type="button"
            onClick={() => withdraw(pending.id, "")}
            className="rounded-md border border-amber-400 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
          >
            Withdraw proposal
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className="rounded-lg border border-stone-200 bg-white p-5"
      aria-labelledby="material-proposal-title"
    >
      <h2 id="material-proposal-title" className="text-base font-semibold">
        Propose a material change
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        These identity, authority and schedule fields are read-only for you.
        Changing any of them requires Principal approval — the project is unchanged
        until then.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
        <div className="grid gap-4 md:grid-cols-2">
          {MATERIAL_FIELD_KEYS.map((key) => (
            <div key={key}>
            <label className="block text-sm" htmlFor={`material-${key}`}>
              <span className="mb-1 block text-xs font-medium text-gray-600">
                {MATERIAL_FIELD_LABELS[key]}
              </span>
              {key === "project_type" ? (
                <select
                  id={`material-${key}`}
                  value={form[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  className={inputClass}
                >
                  {PROJECT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              ) : key === "stage" ? (
                <select
                  id={`material-${key}`}
                  value={form[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  className={inputClass}
                >
                  {[...new Set([form[key], ...MANAGER_STAGES])].filter(Boolean).map((stage) => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              ) : key === "lead_person_id" ? (
                <select
                  id={`material-${key}`}
                  value={form[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  className={inputClass}
                >
                  <option value="">Unassigned</option>
                  {leadOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.full_name || option.email}
                    </option>
                  ))}
                </select>
              ) : key === "start_date" || key === "actual_start_date" ? (
                <input
                  id={`material-${key}`}
                  type="date"
                  value={form[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  className={inputClass}
                />
              ) : (
                <input
                  id={`material-${key}`}
                  type="text"
                  value={form[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  className={inputClass}
                />
              )}
            </label>
            <span className="mt-1 block text-xs text-gray-400">
              Current: {readableApprovalValue(
                currentMaterialForm(project)[key] || null,
                key,
                profilesById
              )}
            </span>
            </div>
          ))}
        </div>

        {proposalPreview.changedKeys.length > 0 && (
          <div className="rounded-md border border-botanique-green/30 bg-botanique-green/5 p-3 text-sm">
            <p className="font-medium text-botanique-charcoal">
              This change requires Principal approval.
            </p>
            <ul className="mt-2 list-disc pl-5 text-gray-600">
              {proposalPreview.changedKeys.map((key) => (
                <li key={key}>
                  {MATERIAL_FIELD_LABELS[key]}:{" "}
                  {readableApprovalValue(proposalPreview.originalValues[key], key, profilesById)}
                  {" → "}
                  {readableApprovalValue(proposalPreview.proposedValues[key], key, profilesById)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <label className="block text-sm" htmlFor="material-reason">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            Reason for the Principal <span className="text-red-600">*</span>
          </span>
          <textarea
            id="material-reason"
            rows={3}
            maxLength={2000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={inputClass}
          />
        </label>

        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-botanique-green px-5 py-2.5 text-sm font-semibold text-white hover:bg-botanique-dark disabled:opacity-60"
        >
          {busy ? "Submitting…" : "Submit material changes for approval"}
        </button>
      </form>
    </section>
  );
}
