// BD-REPORTS-01B — the one chart on the Project Summary.
//
// It answers a real management question at a glance: across the reporting
// period, how did the days on which a morning entry was due actually turn out?
// Nothing decorative is drawn — a category with no days draws no bar at all,
// so a zero is visibly a zero rather than a sliver of colour.
//
// The bar is proportional to the total shown, and every value is also given as
// a number, so the figure never depends on reading a length. It reports
// submission of the plan, exactly as its section does, and says nothing about
// work done.
const TONES = {
  submitted: "bg-botanique-green",
  late: "bg-amber-400",
  waived: "bg-stone-400",
  missing: "bg-red-400",
};

export default function ComplianceBreakdown({ rows = [] }) {
  const total = rows.reduce((sum, row) => sum + (Number(row.value) || 0), 0);
  if (!total) return null;

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold text-botanique-charcoal">Site entry compliance</h3>
      <div
        className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-stone-100"
        role="img"
        aria-label={rows.map((row) => `${row.label}: ${row.value}`).join(", ")}
      >
        {rows
          .filter((row) => Number(row.value) > 0)
          .map((row) => (
            <div
              key={row.key}
              className={TONES[row.key] || "bg-stone-300"}
              style={{ width: `${(row.value / total) * 100}%` }}
            />
          ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-2 text-xs text-gray-600">
            <span className={`h-2 w-2 shrink-0 rounded-full ${TONES[row.key] || "bg-stone-300"}`} />
            <span>{row.label}</span>
            <span className="font-semibold tabular-nums text-botanique-charcoal">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
