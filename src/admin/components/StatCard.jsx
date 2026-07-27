// Small KPI card. Optionally links to a filtered Projects view.
import { Link } from "react-router-dom";

export default function StatCard({ label, value, href, hint, tone = "default" }) {
  const accent =
    tone === "attention"
      ? "border-amber-200 bg-amber-50/60"
      : "border-stone-200 bg-white";
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">{label}</p>
        <span className="h-2 w-2 rounded-full bg-botanique-green" aria-hidden="true" />
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-botanique-charcoal">{value}</p>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </>
  );

  if (href) {
    return (
      <Link
        to={href}
        className={`block rounded-xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-botanique-green hover:shadow-md focus:outline-none focus:ring-2 focus:ring-botanique-green/30 ${accent}`}
      >
        {body}
      </Link>
    );
  }

  return <div className={`rounded-xl border p-4 shadow-sm ${accent}`}>{body}</div>;
}
