// One region inside the integrated management-metrics rail. The rail owns the
// single outer surface and its internal dividers; metric regions never render
// independent card borders, ribbons or shadows.
import { Link } from "react-router-dom";

// Icon tints stay inside the authorised palette: sage for neutral portfolio
// facts, amber for caution, red only for genuine urgency. No metric invents a
// colour, and a zero value is never dressed up as an alarm.
const ICON_TONES = {
  default: "bg-[#edf2ef] text-botanique-green",
  attention: "bg-amber-50 text-amber-700",
  urgent: "bg-red-50 text-red-700",
};

export default function StatCard({
  label,
  value,
  href,
  hint,
  icon,
  tone = "default",
  className = "",
}) {
  const needsAttention = tone !== "default" && Number(value) > 0;
  const iconTone = needsAttention ? ICON_TONES[tone] : ICON_TONES.default;
  const valueTone = needsAttention
    ? tone === "urgent"
      ? "text-red-700"
      : "text-amber-700"
    : "text-botanique-charcoal";
  const body = (
    <div className="flex min-w-0 items-start gap-3">
      {icon && (
        <span
          className={`mt-0.5 hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:flex ${iconTone}`}
          aria-hidden="true"
        >
          <svg
            className="h-[18px] w-[18px]"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={icon} />
          </svg>
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-gray-600">{label}</p>
        <p
          className={`mt-1.5 flex items-center gap-2 text-[28px] font-semibold leading-none tabular-nums ${valueTone}`}
        >
          {needsAttention && (
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                tone === "urgent" ? "bg-red-500" : "bg-amber-500"
              }`}
              aria-hidden="true"
              data-attention-indicator
            />
          )}
          {value}
        </p>
        {hint && <p className="mt-1.5 text-xs text-gray-400">{hint}</p>}
      </div>
    </div>
  );
  const regionClass = `min-w-0 px-4 py-4 sm:px-5 ${className}`;

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
