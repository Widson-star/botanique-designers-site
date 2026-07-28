// One region inside the integrated management-metrics rail. The rail owns the
// single outer surface and its internal dividers; metric regions never render
// independent card borders, ribbons or shadows.
import { Link } from "react-router-dom";

export default function StatCard({
  label,
  value,
  href,
  hint,
  tone = "default",
  className = "",
}) {
  const needsAttention = tone === "attention" && Number(value) > 0;
  const body = (
    <>
      <p className="text-[13px] font-medium text-gray-600">{label}</p>
      <p
        className={`mt-2 flex items-center gap-2 text-3xl font-semibold leading-none tabular-nums ${
          needsAttention ? "text-amber-700" : "text-botanique-charcoal"
        }`}
      >
        {needsAttention && (
          <span
            className="h-1.5 w-1.5 rounded-full bg-amber-500"
            aria-hidden="true"
            data-attention-indicator
          />
        )}
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-gray-400">{hint}</p>}
    </>
  );
  const regionClass = `min-w-0 px-4 py-4 sm:px-5 lg:py-5 ${className}`;

  if (href) {
    return (
      <Link
        to={href}
        className={`block transition-colors hover:bg-stone-50 focus:outline-none focus-visible:bg-stone-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-botanique-green/35 ${regionClass}`}
        data-metric-region
        data-attention={needsAttention ? "true" : "false"}
      >
        {body}
      </Link>
    );
  }

  return (
    <div
      className={regionClass}
      data-metric-region
      data-attention={needsAttention ? "true" : "false"}
    >
      {body}
    </div>
  );
}
