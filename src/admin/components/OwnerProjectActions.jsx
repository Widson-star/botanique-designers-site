// Owner-only material project quick-actions.
import { useEffect, useId, useState } from "react";
import { useAdminData } from "../context/adminData";
import {
  canActivate, canArchive, canCancel, canClassifyDesignOnly, canMarkCompleted,
  canRestore, hasOwnerMaterialActions,
} from "../utils/projectCapabilities";
import {
  buildActivatePatch, buildArchivePatch, buildCancelPatch, buildDesignOnlyPatch,
  buildMarkCompletedPatch, buildRestorePatch, validateActualCompletionDate,
} from "../utils/projectForm";
import { todayIsoDate } from "../utils/dashboardMetrics";
import { ACTIVATION_STAGES } from "../constants/projectStatus";
import ConfirmDialog from "./ConfirmDialog";

const actionButtonClass = "rounded-md border border-stone-300 px-2.5 py-1.5 text-xs font-medium text-botanique-charcoal hover:bg-stone-50 transition";

export default function OwnerProjectActions({ role, project }) {
  const { updateProject } = useAdminData();
  const [active, setActive] = useState(null);
  const [completionDate, setCompletionDate] = useState(todayIsoDate());
  const [activationStage, setActivationStage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [returnToMore, setReturnToMore] = useState(false);
  const completionDateId = useId();
  const activationStageId = useId();
  const moreActionsId = `project-more-actions-${project.id}`;
  const moreActionsMenuId = `${moreActionsId}-menu`;

  function focusMoreActions() { document.getElementById(moreActionsId)?.focus(); }
  function open(key, fromMenu = false) {
    setError(""); setActive(key); setReturnToMore(fromMenu);
    if (fromMenu) setMenuOpen(false);
    if (key === "complete") setCompletionDate(project.actualCompletionDate || todayIsoDate());
    // Never preselect a phase — activation must be a deliberate choice.
    if (key === "activate") setActivationStage("");
  }
  function close() { if (busy) return; setActive(null); setActivationStage(""); if (returnToMore) { setReturnToMore(false); focusMoreActions(); } }
  async function run(patch) {
    setBusy(true); setError("");
    const result = await updateProject(project.id, patch);
    setBusy(false);
    if (result.ok) { setActive(null); if (returnToMore) { setReturnToMore(false); focusMoreActions(); } }
    else setError(result.error || "The action did not complete.");
  }

  useEffect(() => {
    if (!menuOpen) return undefined;
    document.getElementById(moreActionsMenuId)?.querySelector('[role="menuitem"]')?.focus();
    function onKeyDown(event) { if (event.key === "Escape") { event.preventDefault(); setMenuOpen(false); document.getElementById(moreActionsId)?.focus(); } }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen, moreActionsId, moreActionsMenuId]);

  if (!hasOwnerMaterialActions(role, project)) return null;
  const completionError = active === "complete" ? validateActualCompletionDate(completionDate, project.actualStartDate) : "";
  function confirmComplete() { if (completionError) return; run(buildMarkCompletedPatch(completionDate)); }
  const activationValid = ACTIVATION_STAGES.includes(activationStage);
  function confirmActivate() { if (!activationValid) return; run(buildActivatePatch(activationStage)); }

  const dialogs = {
    activate: {
      title: "Activate project",
      description: `Move "${project.projectName}" from Pending to Ongoing. Choose the delivery phase it is actually entering — only status and project phase change.`,
      confirmLabel: "Activate", confirmDisabled: !activationValid, onConfirm: confirmActivate,
      body: <div className="block text-sm"><label className="block" htmlFor={activationStageId}><span className="mb-1 block text-xs font-medium text-gray-600">Project phase <span className="text-red-600">*</span></span><select id={activationStageId} value={activationStage} onChange={(e) => setActivationStage(e.target.value)} aria-invalid={!activationValid} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm focus:border-botanique-green focus:outline-none"><option value="">Select project phase</option>{ACTIVATION_STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select></label></div>,
    },
    complete: {
      title: "Mark project completed",
      description: `Close the delivery cycle for "${project.projectName}". Status and project phase will both become Completed, and stale next-action attention will be cleared.`,
      confirmLabel: "Mark completed", confirmDisabled: Boolean(completionError), onConfirm: confirmComplete,
      body: <div className="block text-sm"><label className="block" htmlFor={completionDateId}><span className="mb-1 block text-xs font-medium text-gray-600">Actual completion date <span className="text-red-600">*</span></span><input id={completionDateId} type="date" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} aria-invalid={Boolean(completionError)} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm focus:border-botanique-green focus:outline-none"/></label>{completionError && <p className="mt-1 text-xs text-red-600" role="alert">{completionError}</p>}</div>,
    },
    cancel: { title: "Cancel project", description: `Set "${project.projectName}" status to Cancelled. Its last delivery phase is preserved.`, confirmLabel: "Cancel project", confirmTone: "danger", onConfirm: () => run(buildCancelPatch()) },
    design: { title: "Classify as Design-only", description: `Set "${project.projectName}" status to Design-only while preserving its design phase.`, confirmLabel: "Classify Design-only", onConfirm: () => run(buildDesignOnlyPatch()) },
    archive: { title: "Archive project", description: `Archive "${project.projectName}". Archive is a record state, not a delivery phase.`, confirmLabel: "Archive", confirmTone: "danger", onConfirm: () => run(buildArchivePatch()) },
    restore: { title: "Restore project", description: `Restore "${project.projectName}" from the archive.`, confirmLabel: "Restore", onConfirm: () => run(buildRestorePatch()) },
  };

  const selectedDialog = active ? dialogs[active] : null;
  const exceptionalActions = [
    canCancel(role, project) && ["cancel", "Cancel"],
    canClassifyDesignOnly(role, project) && ["design", "Classify Design-only"],
    canArchive(role, project) && ["archive", "Archive"],
    canRestore(role, project) && ["restore", "Restore"],
  ].filter(Boolean);

  return <div className="flex flex-wrap items-center gap-2" aria-label="Owner project actions">
    {canActivate(role, project) && <button type="button" className={actionButtonClass} onClick={() => open("activate")}>Activate</button>}
    {canMarkCompleted(role, project) && <button type="button" className={actionButtonClass} onClick={() => open("complete")}>Mark completed</button>}
    {exceptionalActions.length > 0 && <div className="relative"><button id={moreActionsId} type="button" className={actionButtonClass} aria-haspopup="menu" aria-expanded={menuOpen} aria-controls={moreActionsMenuId} onClick={() => setMenuOpen((v) => !v)}>More actions</button>{menuOpen && <div id={moreActionsMenuId} role="menu" aria-label="More project actions" className="absolute right-0 z-20 mt-1 min-w-48 rounded-md border border-stone-200 bg-white p-1 shadow-lg">{exceptionalActions.map(([key,label]) => <button key={key} type="button" role="menuitem" onClick={() => open(key,true)} className="block w-full rounded px-3 py-2 text-left text-xs text-gray-700 hover:bg-stone-50 focus:bg-stone-50 focus:outline-none">{label}</button>)}</div>}</div>}
    {selectedDialog && <ConfirmDialog open title={selectedDialog.title} description={selectedDialog.description} confirmLabel={selectedDialog.confirmLabel} confirmTone={selectedDialog.confirmTone} confirmDisabled={selectedDialog.confirmDisabled} busy={busy} onConfirm={selectedDialog.onConfirm} onCancel={close}>{selectedDialog.body}{error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}</ConfirmDialog>}
  </div>;
}
