// Small KPI card. Optionally links to a filtered Projects view.
import { Link } from "react-router-dom";

export default function StatCard({ label, value, href, hint, tone = "default" }) {
  const accent =
    tone === "attention" && Number(value) > 0
      ? "border-amber-300 bg-white"
      : "border-stone-200 bg-white";
  const body = (
    <>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-botanique-charcoal">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </>
  );

  if (href) {
    return (
      <Link
        to={href}
        className={`block rounded-lg border border-l-4 p-4 transition hover:border-l-botanique-green hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-botanique-green/25 ${accent}`}
      >
        {body}
      </Link>
    );
  }

  return <div className={`rounded-lg border border-l-4 p-4 ${accent}`}>{body}</div>;
}
