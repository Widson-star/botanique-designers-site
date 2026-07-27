// Accessible native CSS horizontal bar chart (no chart dependency). Each row
// shows the category label, a proportional bar, and the numeric count. When a
// row links to a filtered Projects view the whole row is a link. Empty data
// renders "No data yet".
import { Link } from "react-router-dom";

export default function BarChart({ title, description, data, hrefFor }) {
  const max = data.reduce((peak, row) => Math.max(peak, row.value), 0) || 1;

  return (
    <section className="bg-white border border-stone-200 rounded-lg p-5" aria-label={title}>
      <h3 className="font-bold text-base">{title}</h3>
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}

      {data.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No data yet</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {data.map((row) => {
            const percent = Math.round((row.value / max) * 100);
            const bar = (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-botanique-charcoal">{row.label}</span>
                  <span className="font-semibold tabular-nums">{row.value}</span>
                </div>
                <div
                  className="mt-1 h-2 rounded-full bg-stone-100 overflow-hidden"
                  role="img"
                  aria-label={`${row.label}: ${row.value}`}
                >
                  <div
                    className="h-full rounded-full bg-botanique-green"
                    style={{ width: `${Math.max(percent, 4)}%` }}
                  />
                </div>
              </>
            );

            const href = hrefFor?.(row);
            return (
              <li key={row.label}>
                {href ? (
                  <Link
                    to={href}
                    className="block rounded-md p-1 -m-1 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-botanique-green/30"
                  >
                    {bar}
                  </Link>
                ) : (
                  bar
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
