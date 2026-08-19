// The shared visual vocabulary of the working-authority screens.
//
// Founder amendment, 16 Aug 2026:
// - Amber is prohibited throughout the Operations Hub.
// - Waiting/pending states use cool blue-grey treatment instead.
// - People/decision emphasis may use restrained violet.
// - Red remains reserved for genuine errors/destructive states.

const TONES = {
  neutral: { disc: "bg-stone-100 text-gray-500", value: "text-botanique-charcoal" },
  brand: { disc: "bg-[#eef2ee] text-botanique-green", value: "text-botanique-charcoal" },
  waiting: { disc: "bg-sky-50 text-sky-700", value: "text-sky-900" },
  decision: { disc: "bg-violet-50 text-violet-700", value: "text-violet-900" },
  attention: { disc: "bg-red-50 text-red-700", value: "text-red-700" },
  settled: { disc: "bg-emerald-50 text-emerald-700", value: "text-emerald-800" },
  unbuilt: { disc: "bg-stone-100 text-gray-400", value: "text-gray-400" },
};

const ICONS = {
  calendar: "M6 2.5v2.2M14 2.5v2.2M3 7.6h14M4.2 4.7h11.6c.7 0 1.2.5 1.2 1.2v9.4c0 .7-.5 1.2-1.2 1.2H4.2c-.7 0-1.2-.5-1.2-1.2V5.9c0-.7.5-1.2 1.2-1.2Z",
  clock: "M10 5.4V10l2.8 1.7M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z",
  alert: "M10 7.2v3.1m0 2.5h.01M8.6 3.3 2.4 14a1.6 1.6 0 0 0 1.4 2.4h12.4A1.6 1.6 0 0 0 17.6 14L11.4 3.3a1.6 1.6 0 0 0-2.8 0Z",
  bell: "M6 8.2a4 4 0 0 1 8 0v2.2c0 1.8.6 3 1.4 4H4.6c.8-1 1.4-2.2 1.4-4V8.2Zm2.3 8.2a1.9 1.9 0 0 0 3.4 0",
  check: "M6.2 10.3 8.9 13l5-5.6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z",
  pause: "M7.6 10h4.8M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z",
  money: "M10 5.6v8.8m2.3-6.5a2 2 0 0 0-1.9-1.4H9.1a1.8 1.8 0 0 0 0 3.6h1.8a1.8 1.8 0 0 1 0 3.6H9.2a2 2 0 0 1-1.9-1.4",
  wallet: "M14.6 7.4V5.6a1.4 1.4 0 0 0-1.4-1.4H4.6a1.4 1.4 0 0 0-1.4 1.4v8.8a1.4 1.4 0 0 0 1.4 1.4h8.6a1.4 1.4 0 0 0 1.4-1.4v-1.8M15.4 8.4h1.4v3.2h-1.4a1.6 1.6 0 0 1 0-3.2Z",
  balance: "M10 3a7 7 0 1 0 7 7h-7V3Zm2 1.1A6 6 0 0 1 15.9 8H12V4.1Z",
  send: "M17 3 9.2 10.8M17 3l-5 14-2.8-6.2L3 8l14-5Z",
  people: "M13.4 16v-1.5a2.9 2.9 0 0 0-2.9-2.9H5.9A2.9 2.9 0 0 0 3 14.5V16m14-0v-1.5a2.9 2.9 0 0 0-2.2-2.8M12.4 4.3a2.9 2.9 0 0 1 0 5.6M10.4 7.1a2.7 2.7 0 1 1-5.4 0 2.7 2.7 0 0 1 5.4 0Z",
  doc: "M11.4 2.5H5.8c-.8 0-1.4.6-1.4 1.4v12.2c0 .8.6 1.4 1.4 1.4h8.4c.8 0 1.4-.6 1.4-1.4V6.5m-4.2-4 4.2 4m-4.2-4v4h4.2M7.4 11h5.2M7.4 13.8h3.5",
  filter: "M3 5h14M5.5 10h9M8 15h4",
  scale: "M10 3.4v13.2M5.6 6.6h8.8M4 13.2 6.4 7l2.4 6.2a2.6 2.6 0 0 1-4.8 0Zm7.2 0L13.6 7 16 13.2a2.6 2.6 0 0 1-4.8 0Z",
  bank: "M3.2 8.2h13.6M4.6 8.2v6M8.2 8.2v6M11.8 8.2v6M15.4 8.2v6M2.6 16.4h14.8M10 2.6l6.8 3.2H3.2L10 2.6Z",
  spark: "M10 2.8 11.9 7l4.6.5-3.4 3.1.9 4.5-4-2.3-4 2.3.9-4.5L3.5 7.5 8.1 7 10 2.8Z",
  site: "M3.4 16.6h13.2M5 16.6V8.4l5-4.2 5 4.2v8.2M8.4 16.6v-4h3.2v4",
  arrow: "M4 10h11m0 0-4-4m4 4-4 4",
};

export function Glyph({ name, className = "h-[15px] w-[15px]" }) {
  return (
    <svg
      className={`${className} shrink-0`}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d={ICONS[name] || ICONS.doc} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Disc({ name, tone = "neutral", size = "h-8 w-8" }) {
  const palette = TONES[tone] || TONES.neutral;
  return (
    <span className={`flex ${size} shrink-0 items-center justify-center rounded-full ${palette.disc}`}>
      <Glyph name={name} />
    </span>
  );
}

export function Metric({ icon, label, value, hint, tone = "neutral", className = "" }) {
  const palette = TONES[tone] || TONES.neutral;
  return (
    <div className={`flex min-w-0 items-start gap-2.5 ${className}`}>
      <Disc name={icon} tone={tone} />
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className={`mt-0.5 break-words text-[17px] font-semibold leading-tight tabular-nums ${palette.value}`}>
          {value}
        </p>
        {hint && <p className="mt-0.5 break-words text-[11px] leading-snug text-gray-500">{hint}</p>}
      </div>
    </div>
  );
}

// The Finance registers' at-a-glance card. Staff Pay established the treatment
// — one number, a quiet label, and a hint that names any limitation behind the
// number — and Project Costs now reads the same way rather than restating it.
export function MetricCard({ icon, tone = "neutral", label, value, hint }) {
  return (
    <div className="flex min-h-[112px] items-center gap-3 rounded-xl border border-stone-200 bg-white p-4">
      <Disc name={icon} tone={tone} size="h-10 w-10" />
      <div className="min-w-0">
        <p className="text-[11.5px] text-gray-500">{label}</p>
        {/* 19px, not 20: at the 1280px four-column layout a six-figure KES
            amount breaks mid-number at 20px, and "KES 128,500.0 / 0" is not a
            number anyone can read at a glance. break-words stays as the guard
            for the rare seven-figure total. */}
        <p className="mt-1 break-words text-[19px] font-semibold tabular-nums text-botanique-charcoal">{value}</p>
        <p className="mt-1 text-[10.5px] text-gray-500">{hint}</p>
      </div>
    </div>
  );
}

export function MetricBand({ children, columns = 4, className = "" }) {
  const cols = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  }[columns] || "sm:grid-cols-4";
  return <div className={`grid gap-x-4 gap-y-4 ${cols} ${className}`}>{children}</div>;
}

export function Panel({ icon, title, subtitle, action, children, tone = "brand", className = "", headingId }) {
  return (
    <section className={`rounded-xl border border-stone-200 bg-white ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-stone-100 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon && <Disc name={icon} tone={tone} size="h-7 w-7" />}
          <div className="min-w-0">
            <h2 id={headingId} className="truncate text-[13.5px] font-semibold text-botanique-charcoal">{title}</h2>
            {subtitle && <p className="truncate text-[11.5px] text-gray-500">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="px-4 py-3.5">{children}</div>
    </section>
  );
}

export function EmptyLine({ icon = "pause", children, action }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-stone-50 px-3 py-2.5">
      <Disc name={icon} tone="unbuilt" size="h-7 w-7" />
      <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-gray-600">{children}</p>
      {action}
    </div>
  );
}

const CHIP_TONES = {
  neutral: "bg-stone-100 text-gray-700",
  brand: "bg-[#eef2ee] text-botanique-green",
  waiting: "bg-sky-100 text-sky-900",
  decision: "bg-violet-100 text-violet-900",
  attention: "bg-red-100 text-red-800",
  settled: "bg-emerald-100 text-emerald-800",
  info: "bg-sky-100 text-sky-900",
};

// Remaining props are forwarded so a caller can attach the identity behind the
// label — a derived status key, for instance — without wrapping the chip.
export function Chip({ children, tone = "neutral", className = "", ...rest }) {
  return (
    <span {...rest} className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${CHIP_TONES[tone] || CHIP_TONES.neutral} ${className}`}>
      {children}
    </span>
  );
}
