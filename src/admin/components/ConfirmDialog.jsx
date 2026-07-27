// Accessible confirmation dialog for owner material actions. Never uses the
// browser alert()/confirm() as the final interface.
//
// Focus behaviour (see Phase 1B-A2 correction pass):
//   * Initial focus is set ONCE when the dialog opens (mount) — it is NOT reset
//     on parent rerenders (e.g. while the user types a completion date).
//   * Initial target: the first form control inside `children` if present
//     (the completion date input); otherwise the safe Cancel control.
//   * Focus is trapped inside the dialog and restored to the opener on close.
//   * Escape closes (unless busy).
import { useEffect, useId, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmTone = "primary",
  confirmDisabled = false,
  busy = false,
  onConfirm,
  onCancel,
  children,
}) {
  const dialogRef = useRef(null);
  const confirmRef = useRef(null);
  const cancelRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const dialog = dialogRef.current;
    const opener = document.activeElement;

    // Initial focus: first form control in children (date input), otherwise the
    // safe Cancel action.
    const firstField = dialog?.querySelector("input, select, textarea");
    if (firstField) {
      firstField.focus();
    } else {
      cancelRef.current?.focus();
    }

    return () => {
      // Restore focus to whatever opened the dialog.
      if (opener && typeof opener.focus === "function") opener.focus();
    };
  }, [open]);

  // Keyboard handling is separate from focus staging. Its listener may update
  // when busy/onCancel changes without restoring or moving current focus.
  useEffect(() => {
    if (!open) return undefined;
    const dialog = dialogRef.current;

    function onKeyDown(event) {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;
      // Trap focus inside the dialog so it cannot reach the obscured page.
      const focusables = dialog ? Array.from(dialog.querySelectorAll(FOCUSABLE)) : [];
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const confirmClass =
    confirmTone === "danger"
      ? "bg-red-600 hover:bg-red-700"
      : "bg-botanique-green hover:bg-botanique-dark";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !busy && onCancel()}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-md rounded-lg bg-white border border-stone-200 shadow-xl p-6"
      >
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>
        <p id={descriptionId} className="mt-2 text-sm text-gray-600 leading-relaxed">
          {description}
        </p>
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md border border-stone-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-stone-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
            aria-disabled={busy || confirmDisabled}
            className={`rounded-md px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60 disabled:cursor-not-allowed ${confirmClass}`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
