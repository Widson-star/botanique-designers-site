// BD-REPORTS-01A — the shared report-section shell and its five distinct states.
//
// Every section renders through this component, so no section can accidentally
// present an inaccessible source as empty, an unavailable fact as zero, or a
// failed read as "no records". The states are rendered with different wording
// and different tone, and they are never collapsed into one another.
import { Link } from "react-router-dom";
import { SECTION_STATE, SECTION_STATE_MESSAGES } from "../../utils/reportFormat";

const STATE_TONE = {
  [SECTION_STATE.EMPTY_PERIOD]: "border-stone-200 bg-stone-50 text-gray-600",
  [SECTION_STATE.EMPTY_EVER]: "border-stone-200 bg-stone-50 text-gray-600",
  [SECTION_STATE.UNAVAILABLE]: "border-stone-300 bg-white text-gray-500",
  [SECTION_STATE.NO_ACCESS]: "border-stone-300 bg-white text-gray-500",
  [SECTION_STATE.ERROR]: "border-red-200 bg-red-50 text-red-800",
  [SECTION_STATE.LOADING]: "border-stone-200 bg-white text-gray-500",
};

const STATE_EXPLANATIONS = {
  [SECTION_STATE.EMPTY_PERIOD]: "Nothing was recorded here between the selected dates. Records may exist in another period.",
  [SECTION_STATE.EMPTY_EVER]: "Nothing has been recorded here for this project.",
  [SECTION_STATE.UNAVAILABLE]: "This fact is not recorded anywhere in the Operations Hub yet.",
  [SECTION_STATE.NO_ACCESS]: "Whether records exist here is not shown, because this is outside your access.",
  [SECTION_STATE.ERROR]: "Please try again. If this keeps happening, tell the Principal.",
};

export function ReportStateMessage({ state }) {
  const tone = STATE_TONE[state] || STATE_TONE[SECTION_STATE.EMPTY_PERIOD];
  return (
    <div
      className={`rounded-lg border px-4 py-4 text-sm ${tone}`}
      role={state === SECTION_STATE.ERROR ? "alert" : "status"}
      data-report-state={state}
    >
      <p className="font-medium">{SECTION_STATE_MESSAGES[state]}</p>
      {STATE_EXPLANATIONS[state] && (
        <p className="mt-1 text-xs leading-relaxed">{STATE_EXPLANATIONS[state]}</p>
      )}
    </div>
  );
}

export default function ReportSection({ title, description, state, actions = null, children }) {
  const ready = state === SECTION_STATE.READY;
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 sm:p-5" aria-label={title}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-botanique-charcoal">{title}</h2>
          {description && <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{description}</p>}
        </div>
        {ready && actions}
      </div>
      <div className="mt-4">{ready ? children : <ReportStateMessage state={state} />}</div>
    </section>
  );
}

// A labelled figure. `value` is already formatted by the shared money/count
// formatter, so a genuine zero arrives here as "KES 0" and an absent value as
// "Not recorded". This component never defaults anything.
export function ReportFigure({ label, value, note = "", tone = "default" }) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-3">
      <p className="text-xs font-medium text-gray-500" data-report-label>
        {label}
      </p>
      <p
        className={`mt-1 break-words text-lg font-semibold tabular-nums ${
          tone === "attention" ? "text-amber-700" : "text-botanique-charcoal"
        }`}
      >
        {value}
      </p>
      {note && <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{note}</p>}
    </div>
  );
}

export function ReportFigureGrid({ children }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

// A stacked record card. Mobile is a primary environment, so the primary layout
// is a card list rather than a compressed table; no horizontal scrolling is
// required and every touch target is full width.
export function ReportRecordCard({ title, meta, amount, state, children, to }) {
  const body = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="min-w-0 break-words font-semibold text-botanique-charcoal">{title}</span>
        {amount && <span className="shrink-0 font-semibold tabular-nums">{amount}</span>}
      </div>
      {meta && <p className="mt-1 break-words text-xs text-gray-500">{meta}</p>}
      {children}
      {state && (
        <span className="mt-3 inline-block rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-gray-600">
          {state}
        </span>
      )}
    </>
  );

  if (to) {
    return (
      <li>
        <Link
          to={to}
          className="block min-h-11 rounded-lg border border-stone-200 bg-white p-4 transition hover:border-botanique-green/40 hover:bg-stone-50"
        >
          {body}
        </Link>
      </li>
    );
  }
  return <li className="rounded-lg border border-stone-200 bg-white p-4">{body}</li>;
}

export function ReportRecordList({ children }) {
  return <ul className="space-y-3">{children}</ul>;
}

// The drill-through affordance. Reports always links to the exact record or a
// correctly filtered source list — never to the admin homepage and never to an
// unfiltered module index.
export function ReportDrillLink({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-11 items-center text-sm font-semibold text-botanique-green hover:underline"
    >
      {children}
    </Link>
  );
}
