// BD-REPORTS-01A — Needs Attention.
//
// A derived summary of CURRENT authoritative source states: a recorded project
// blocker, an overdue next action, an approaching or passed target completion,
// project approvals awaiting a decision, claims awaiting review, fund requests
// submitted for decision, Daily Site entries returned for correction, and
// missing or late Daily Site obligations from the period range source.
//
// This is NOT Work Inbox state. It carries no read/unread flag, no recipient,
// no assignment and no notification delivery, and it creates no record. Each
// item links to its originating record or a correctly filtered source list.
import { Link } from "react-router-dom";

const SEVERITY_TONE = {
  high: "border-amber-300 bg-amber-50 text-amber-900",
  medium: "border-stone-200 bg-white text-botanique-charcoal",
  low: "border-stone-200 bg-white text-gray-600",
};

export default function NeedsAttentionSection({ items = [] }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 sm:p-5" aria-label="Needs attention">
      <h2 className="text-base font-semibold text-botanique-charcoal">Needs attention</h2>
      <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
        Drawn from the current state of each source. Nothing here is assigned to anyone, and
        opening an item changes nothing.
      </p>

      {items.length === 0 ? (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800" role="status">
          <p className="font-medium">Nothing needs attention in the sections you can see.</p>
          <p className="mt-1 text-xs leading-relaxed">
            Sections you do not have access to are not assessed here.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={item.route}
                className={`block min-h-11 rounded-lg border px-4 py-3 transition hover:bg-stone-50 ${
                  SEVERITY_TONE[item.severity] || SEVERITY_TONE.medium
                }`}
              >
                <p className="break-words text-sm font-semibold">{item.title}</p>
                <p className="mt-1 break-words text-xs leading-relaxed opacity-90">{item.detail}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
