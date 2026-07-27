// Owner-only material project quick-actions. Each action is explicit and
// confirmed through an accessible dialog, sends ONLY the field(s) that change
// (no silent coupling), and relies on the provider to refetch after success.
import { useState } from "react";
import { useAdminData } from "../context/adminData";
import {
  canActivate,
  canArchive,
  canCancel,
  canClassifyDesignOnly,
  canMarkCompleted,
  canRestore,
  hasOwnerMaterialActions,
} from "../utils/projectCapabilities";
import {
  buildActivatePatch,
  buildArchivePatch,
  buildCancelPatch,
  buildDesignOnlyPatch,
  buildMarkCompletedPatch,
  buildRestorePatch,
} from "../utils/projectForm";
import { todayIsoDate } from "../utils/dashboardMetrics";
import ConfirmDialog from "./ConfirmDialog";

const actionButtonClass =
  "rounded-md border border-stone-200 px-3 py-2 text-sm font-medium text-botanique-charcoal hover:bg-stone-50 transition";

export default function OwnerProjectActions({ role, project }) {
  const { updateProject } = useAdminData();
  const [active, setActive] = useState(null); // action key
  const [completionDate, setCompletionDate] = useState(todayIsoDate());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!hasOwnerMaterialActions(role, project)) return null;

  function open(key) {
    setError("");
    setActive(key);
    if (key === "complete") setCompletionDate(project.actualCompletionDate || todayIsoDate());
  }

  function close() {
    if (busy) return;
    setActive(null);
  }

  async function run(patch) {
    setBusy(true);
    setError("");
    const result = await updateProject(project.id, patch);
    setBusy(false);
    if (result.ok) {
      setActive(null);
    } else {
      setError(result.error || "The action did not complete.");
    }
  }

  const dialogs = {
    activate: {
      title: "Activate project",
      description: `Move "${project.projectName}" from Pending to Ongoing. Other fields, including the proposed target completion, are preserved.`,
      confirmLabel: "Activate",
      onConfirm: () => run(buildActivatePatch()),
    },
    complete: {
      title: "Mark project completed",
      description: `Record an actual completion date and set "${project.projectName}" to Completed. The project stage is not changed automatically.`,
      confirmLabel: "Mark completed",
      onConfirm: () => run(buildMarkCompletedPatch(completionDate)),
      body: (
        <label className="block text-sm">
          <span className="block text-xs font-medium text-gray-600 mb-1">
            Actual completion date <span className="text-red-600">*</span>
          </span>
          <input
            type="date"
            value={completionDate}
            onChange={(e) => setCompletionDate(e.target.value)}
            className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm focus:border-botanique-green focus:outline-none"
          />
        </label>
      ),
    },
    cancel: {
      title: "Cancel project",
      description: `Set "${project.projectName}" status to Cancelled. Only the status changes.`,
      confirmLabel: "Cancel project",
      confirmTone: "danger",
      onConfirm: () => run(buildCancelPatch()),
    },
    design: {
      title: "Classify as Design-only",
      description: `Set "${project.projectName}" status to Design-only. Only the status changes.`,
      confirmLabel: "Classify Design-only",
      onConfirm: () => run(buildDesignOnlyPatch()),
    },
    archive: {
      title: "Archive project",
      description: `Archive "${project.projectName}". Only the archived flag changes; the record is preserved and can be restored.`,
      confirmLabel: "Archive",
      onConfirm: () => run(buildArchivePatch()),
    },
    restore: {
      title: "Restore project",
      description: `Restore "${project.projectName}" from the archive. Only the archived flag changes.`,
      confirmLabel: "Restore",
      onConfirm: () => run(buildRestorePatch()),
    },
  };

  const current = active ? dialogs[active] : null;

  return (
    <section className="bg-white border border-stone-200 rounded-lg p-5">
      <h2 className="font-bold text-lg mb-1">Owner actions</h2>
      <p className="text-sm text-gray-500 mb-4">
        Material decisions are reserved to the owner and confirmed before they apply.
      </p>
      <div className="flex flex-wrap gap-2">
        {canActivate(role, project) && (
          <button type="button" className={actionButtonClass} onClick={() => open("activate")}>
            Activate
          </button>
        )}
        {canMarkCompleted(role, project) && (
          <button type="button" className={actionButtonClass} onClick={() => open("complete")}>
            Mark completed
          </button>
        )}
        {canCancel(role, project) && (
          <button type="button" className={actionButtonClass} onClick={() => open("cancel")}>
            Cancel
          </button>
        )}
        {canClassifyDesignOnly(role, project) && (
          <button type="button" className={actionButtonClass} onClick={() => open("design")}>
            Classify Design-only
          </button>
        )}
        {canArchive(role, project) && (
          <button type="button" className={actionButtonClass} onClick={() => open("archive")}>
            Archive
          </button>
        )}
        {canRestore(role, project) && (
          <button type="button" className={actionButtonClass} onClick={() => open("restore")}>
            Restore
          </button>
        )}
      </div>

      {current && (
        <ConfirmDialog
          open
          title={current.title}
          description={current.description}
          confirmLabel={current.confirmLabel}
          confirmTone={current.confirmTone}
          busy={busy}
          onConfirm={current.onConfirm}
          onCancel={close}
        >
          {current.body}
          {error && (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
        </ConfirmDialog>
      )}
    </section>
  );
}
