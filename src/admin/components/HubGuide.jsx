import { useState } from "react";

// "How this Hub works" — contextual support under the EXISTING help surface.
//
// Authority 17 is explicit that this is not a new Operations navigation item:
// the Hub's left rail is already the product's most contested space, and a
// tutorial does not earn a permanent seat in it. It opens from the help card
// that is already there.
//
// ONLY Tools & Equipment is documented. Writing a confident guide to a workflow
// that is still moving is how documentation starts lying, so the other domains
// are named as "not yet" rather than described.
const TOOLS_AND_EQUIPMENT_STEPS = [
  "Add or choose a tool or item.",
  "Choose Track each tool, or Track quantity only.",
  "Register one or several tools, or receive stock.",
  "Record the Site or location, and a custodian if someone already has it.",
  "Assign, reassign, return or transfer tools as work moves.",
  "Record condition, repair, loss or retirement.",
  "Use Stock positions for quantity-only items.",
];

export default function HubGuide() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-3.5 mb-2.5 flex min-h-10 w-[calc(100%-1.75rem)] items-center gap-2.5 rounded-[11px] px-3 py-2 text-left transition hover:bg-[#f7faf8]"
      >
        <svg className="h-4 w-4 shrink-0 text-botanique-green" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <circle cx="10" cy="10" r="7.5" />
          <path d="M8 7.8a2.1 2.1 0 1 1 2.9 1.95c-.55.25-.9.78-.9 1.4v.35" strokeLinecap="round" />
          <circle cx="10" cy="14.2" r="0.75" fill="currentColor" stroke="none" />
        </svg>
        <span className="text-[12.5px] font-semibold text-botanique-charcoal">How this Hub works</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4">
          <div role="dialog" aria-label="How this Hub works" className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white sm:max-w-md sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
              <h2 className="text-base font-semibold">How this Hub works</h2>
              <button type="button" onClick={() => setOpen(false)} className="min-h-9 rounded-lg px-2 text-sm font-semibold text-gray-500">Close</button>
            </div>
            <div className="px-4 py-4">
              <h3 className="text-sm font-semibold text-botanique-charcoal">Tools &amp; Equipment</h3>
              <ol className="mt-2 grid gap-2">
                {TOOLS_AND_EQUIPMENT_STEPS.map((step, index) => (
                  <li key={step} className="flex gap-2.5 text-sm text-gray-700">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#eef3f0] text-[11px] font-semibold tabular-nums text-botanique-green">
                      {index + 1}
                    </span>
                    <span className="min-w-0">{step}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 rounded-lg bg-stone-50 p-3 text-xs text-gray-600">
                Guides for the other areas of the Hub will be added as each one settles.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
