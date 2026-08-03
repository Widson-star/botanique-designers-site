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
  // The FIGURE stays charcoal at every tone. The authority screen carries a
  // metric's urgency in its icon tile alone and leaves the number in ordinary
  // dark text; colouring the tile, the number and a dot was three signals
  // saying the same thing, and it made a count of 2 shout louder than a
  // genuinely blocked project. The tile is now the single marker, and it
  // carries `data-attention-indicator` so the restrained-emphasis guarantee is
  // still asserted in exactly one place.
  const body = (
    <div className="flex min-w-0 items-start gap-3">
      {/* Shown at EVERY width. The tile is now the only visual marker of a
          metric needing attention, so hiding it below `sm` would conceal
          status on exactly the device the Founder reviews on. */}
      {icon && (
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconTone}`}
          aria-hidden="true"
          {...(needsAttention ? { "data-attention-indicator": true } : {})}
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
        <p className="text-[13px] font-medium text-gray-600">
          {label}
          {/* Colour alone must never be the carrier of a status. */}
          {needsAttention && <span className="sr-only"> — needs attention</span>}
        </p>
        <p className="mt-1.5 text-[28px] font-semibold leading-none tabular-nums text-botanique-charcoal">
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
