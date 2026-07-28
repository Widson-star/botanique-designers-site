import { useId, useState } from "react";
import ConfirmDialog from "../ConfirmDialog";
import { APPROVAL_TYPE_LABELS } from "../../utils/approvalFormatters";
import { proposedValuesForApproval } from "../../utils/approvalCapabilities";
import { todayIsoDate } from "../../utils/dashboardMetrics";

function currentValue(type, project) {
  switch (type) {
    case "project_activation":
    case "project_completion":
    case "project_cancellation":
      return project.status;
    case "project_target_completion_change":
      return project.targetCompletionDate || "Not set";
    case "project_archive":
    case "project_restore":
      return project.archived ? "Archived" : "Active";
    default:
      return "Not set";
  }
}

function proposedLabel(type, dateValue) {
  switch (type) {
    case "project_activation": return "Ongoing";
    case "project_completion": return `Completed on ${dateValue || "date required"}`;
    case "project_cancellation": return "Cancelled";
    case "project_target_completion_change": return dateValue || "Date required";
    case "project_archive": return "Archived";
    case "project_restore": return "Active";
    default: return "";
  }
}

export default function ApprovalRequestDialog({
  open,
  project,
  approvalType,
  initialReason = "",
  initialNotes = "",
  onCancel,
  onSubmit,
}) {
  const needsDate = [
    "project_target_completion_change",
    "project_completion",
  ].includes(approvalType);
  const [dateValue, setDateValue] = useState(
    approvalType === "project_target_completion_change"
      ? project.targetCompletionDate
      : project.actualCompletionDate || todayIsoDate()
  );
  const [reason, setReason] = useState(initialReason);
  const [notes, setNotes] = useState(initialNotes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dateId = useId();
  const reasonId = useId();
  const notesId = useId();

  if (!open) return null;

  async function submit() {
    if (!reason.trim() || (needsDate && !dateValue)) return;
    setBusy(true);
    setError("");
    const result = await onSubmit({
      proposedValues: proposedValuesForApproval(approvalType, dateValue),
      reason: reason.trim(),
      requesterNotes: notes.trim(),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error || "The request could not be submitted.");
    }
  }

  return (
    <ConfirmDialog
      open
      title={APPROVAL_TYPE_LABELS[approvalType]}
      description={`Request approval for a protected change to "${project.projectName}".`}
      confirmLabel="Submit request"
      confirmDisabled={!reason.trim() || (needsDate && !dateValue)}
      busy={busy}
      onConfirm={submit}
      onCancel={onCancel}
    >
      <div className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 rounded-md bg-stone-50 p-3 text-sm">
          <div>
            <dt className="text-xs text-gray-500">Current</dt>
            <dd className="mt-1 font-medium">{currentValue(approvalType, project)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Proposed</dt>
            <dd className="mt-1 font-medium">{proposedLabel(approvalType, dateValue)}</dd>
          </div>
        </dl>
        {needsDate && (
          <label className="block text-sm" htmlFor={dateId}>
            <span className="mb-1 block text-xs font-medium text-gray-600">
              {approvalType === "project_completion"
                ? "Actual completion date"
                : "Proposed target completion"}
            </span>
            <input
              id={dateId}
              type="date"
              value={dateValue || ""}
              min={approvalType === "project_completion" ? project.actualStartDate : project.startDate}
              onChange={(event) => setDateValue(event.target.value)}
              required
              className="w-full rounded-md border border-stone-200 px-3 py-2 focus:border-botanique-green focus:outline-none"
            />
          </label>
        )}
        <label className="block text-sm" htmlFor={reasonId}>
          <span className="mb-1 block text-xs font-medium text-gray-600">Reason</span>
          <textarea
            id={reasonId}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            maxLength={2000}
            required
            className="w-full rounded-md border border-stone-200 px-3 py-2 focus:border-botanique-green focus:outline-none"
          />
        </label>
        <label className="block text-sm" htmlFor={notesId}>
          <span className="mb-1 block text-xs font-medium text-gray-600">
            Requester notes <span className="font-normal">(optional)</span>
          </span>
          <textarea
            id={notesId}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            maxLength={5000}
            className="w-full rounded-md border border-stone-200 px-3 py-2 focus:border-botanique-green focus:outline-none"
          />
        </label>
        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      </div>
    </ConfirmDialog>
  );
}
