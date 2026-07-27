// Small KPI card. Optionally links to a filtered Projects view.
import { Link } from "react-router-dom";

export default function StatCard({ label, value, href, hint }) {
  const body = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-3xl font-bold text-botanique-charcoal mt-2 tabular-nums">{value}</p>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </>
  );

  if (href) {
    return (
      <Link
        to={href}
        className="block bg-white border border-stone-200 rounded-lg p-4 hover:border-botanique-green transition focus:outline-none focus:ring-2 focus:ring-botanique-green/30"
      >
        {body}
      </Link>
    );
  }

  return <div className="bg-white border border-stone-200 rounded-lg p-4">{body}</div>;
}
