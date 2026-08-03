import { Link } from "react-router-dom";

const STATUS_COLOURS = {
  Pending: "#D99A2B",
  Ongoing: "#3F5F58",
  Completed: "#4C78A8",
  Paused: "#8A8F8C",
  Cancelled: "#B76565",
  "Design-only": "#8064A2",
};

const TYPE_COLOURS = ["#3F5F58", "#739087", "#B88745", "#6F7E95", "#8A6D78", "#7D8261"];

export function StatusDoughnutChart({ data }) {
  const total = data.reduce((sum, row) => sum + row.value, 0);
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const segments = data.map((row, index) => {
    const preceding = data
      .slice(0, index)
      .reduce((sum, item) => sum + item.value, 0);
    return {
      ...row,
      length: total ? (row.value / total) * circumference : 0,
      offset: total ? (preceding / total) * circumference : 0,
    };
  });

  return (
    // `min-w-0` is load-bearing: without it this card is a grid item that
    // refuses to shrink below its content, which is how a fixed-width sibling
    // used to push the whole page into horizontal scroll at phone width.
    <section aria-labelledby="status-chart-title" className="flex min-w-0 flex-col">
      <div className="mb-3">
        <h2 id="status-chart-title" className="text-base font-semibold">
          Project status
        </h2>
        <p className="mt-1 text-sm text-gray-500">Current distribution across the portfolio.</p>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-gray-500">No data yet</p>
      ) : (
        <div className="grid min-w-0 items-center gap-4 sm:grid-cols-[128px_minmax(0,1fr)]">
          <svg
            viewBox="0 0 120 120"
            className="mx-auto h-32 w-32"
            role="img"
            aria-labelledby="status-doughnut-title status-doughnut-desc"
          >
            <title id="status-doughnut-title">Project status doughnut chart</title>
            <desc id="status-doughnut-desc">
              {data.map((row) => `${row.label}: ${row.value}`).join(", ")}
            </desc>
            <circle cx="60" cy="60" r={radius} fill="none" stroke="#ECEDEA" strokeWidth="15" />
            {segments.map((row) => {
              const segment = (
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={STATUS_COLOURS[row.label] || "#739087"}
                  strokeWidth="15"
                  strokeDasharray={`${row.length} ${circumference - row.length}`}
                  strokeDashoffset={-row.offset}
                  transform="rotate(-90 60 60)"
                />
              );
              return <g key={row.label}>{segment}</g>;
            })}
            <text x="60" y="57" textAnchor="middle" className="fill-botanique-charcoal text-[24px] font-semibold">
              {total}
            </text>
            <text x="60" y="73" textAnchor="middle" className="fill-gray-500 text-[9px]">
              projects
            </text>
          </svg>

          <ul className="grid min-w-0 gap-1">
            {data.map((row) => (
              <li key={row.label} className="min-w-0">
                <Link
                  to={`/admin/projects?status=${encodeURIComponent(row.label)}`}
                  className="flex min-w-0 items-center justify-between gap-3 rounded px-2 py-1 text-sm hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-botanique-green/25"
                >
                  <span className="flex min-w-0 items-center gap-2 text-gray-600">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: STATUS_COLOURS[row.label] || "#739087" }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{row.label}</span>
                  </span>
                  <strong className="shrink-0 tabular-nums">{row.value}</strong>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// The stage chart previously carried a hard 620px floor (`Math.max(620, …)`
// plus `min-w-[620px]`). Its `overflow-x-auto` wrapper could not contain that
// floor, because a grid item defaults to `min-width: auto` and therefore
// refuses to shrink below its content. The 620px escaped into the shared
// visualisation grid, and at 400px it dragged the whole page — including the
// Project status card next to it — out to 657px of horizontal scroll.
//
// The chart is now RESOLUTION-INDEPENDENT: the SVG scales to whatever width the
// card gives it via `viewBox` + `preserveAspectRatio`, so it resizes instead of
// clipping, and no ancestor is ever forced wider than the viewport. Labels wrap
// onto a second line so a long stage name ("Concept Design", "Awaiting
// Approval") stays legible at phone width rather than being truncated.
// The viewBox is deliberately close to the card's own aspect ratio. An
// over-wide viewBox letterboxes inside `meet` scaling: the drawing shrinks to
// fit the width and leaves dead vertical space, with the stage labels scaled
// down until they are unreadable. Matching the ratio keeps type near its
// nominal size at every card width.
const STAGE_VIEWBOX_WIDTH = 360;
const STAGE_VIEWBOX_HEIGHT = 196;
const STAGE_BASELINE_Y = 150;
const STAGE_PLOT_HEIGHT = 118;

// Split a stage label into at most two lines so it never overprints a neighbour.
function stageLabelLines(label) {
  const words = label.split(" ");
  if (words.length < 2) return [label];
  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")];
}

export function StageColumnChart({ data }) {
  const max = data.reduce((peak, row) => Math.max(peak, row.value), 0) || 1;
  const slot = data.length ? (STAGE_VIEWBOX_WIDTH - 24) / data.length : 0;
  // Bars thin as stages multiply, so the chart stays inside its own viewBox.
  const barWidth = Math.min(34, Math.max(14, slot * 0.42));
  // With all five delivery stages present the slots are narrow enough that a
  // long single word ("Implementation") would touch its neighbour at phone
  // width, so the labels step down a size rather than collide.
  const labelClass = data.length > 4 ? "text-[9px]" : "text-[10px]";

  return (
    <section aria-labelledby="stage-chart-title" className="flex min-w-0 flex-col">
      <div className="mb-3">
        <h2 id="stage-chart-title" className="text-base font-semibold">
          Project stage
        </h2>
        <p className="mt-1 text-sm text-gray-500">Workload by delivery stage.</p>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-gray-500">No data yet</p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${STAGE_VIEWBOX_WIDTH} ${STAGE_VIEWBOX_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full"
            role="img"
            aria-labelledby="stage-column-title stage-column-desc"
          >
            <title id="stage-column-title">Project stage column chart</title>
            <desc id="stage-column-desc">
              {data.map((row) => `${row.label}: ${row.value}`).join(", ")}
            </desc>
            <line
              x1="12"
              y1={STAGE_BASELINE_Y}
              x2={STAGE_VIEWBOX_WIDTH - 12}
              y2={STAGE_BASELINE_Y}
              stroke="#D9DBD6"
            />
            {data.map((row, index) => {
              const centre = 12 + index * slot + slot / 2;
              const height = Math.max(8, (row.value / max) * STAGE_PLOT_HEIGHT);
              const y = STAGE_BASELINE_Y - height;
              return (
                <a
                  key={row.label}
                  href={`/admin/projects?stage=${encodeURIComponent(row.label)}`}
                  aria-label={`${row.label}: ${row.value} projects`}
                >
                  <rect
                    x={centre - barWidth / 2}
                    y={y}
                    width={barWidth}
                    height={height}
                    rx="3"
                    fill="#3F5F58"
                  />
                  <text
                    x={centre}
                    y={y - 7}
                    textAnchor="middle"
                    className="fill-botanique-charcoal text-[12px] font-semibold"
                  >
                    {row.value}
                  </text>
                  {stageLabelLines(row.label).map((line, lineIndex) => (
                    <text
                      key={line}
                      x={centre}
                      y={168 + lineIndex * 12}
                      textAnchor="middle"
                      className={`fill-gray-500 ${labelClass}`}
                    >
                      {line}
                    </text>
                  ))}
                </a>
              );
            })}
          </svg>
          <ul className="sr-only">
            {data.map((row) => (
              <li key={row.label}>
                <Link to={`/admin/projects?stage=${encodeURIComponent(row.label)}`}>
                  {row.label}: {row.value}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

// Project types is not on the authority screen, so it is retained only on the
// terms the screen allows: one compact strip that WRAPS, never a wide row that
// forces the page sideways. It stays because portfolio mix is real, already
// computed and drillable — but it is subordinate, not a fourth chart card.
//
// The management question it answers is "what kind of work is this portfolio
// made of", and that is answered by the LEADING types. On the Principal's full
// portfolio the untrimmed list rendered as a compressed legend of every
// category, which answers nothing at a glance. It now shows the largest few and
// rolls the tail into one honest "Other" count.
export const PROJECT_TYPE_LEADERS = 4;

// The rollup is called "Remaining", NOT "Other" — because "Other" is a real
// project type in `PROJECT_TYPES`. Calling the tail "Other" put two entries
// labelled "Other" side by side on the Principal's live Dashboard, both showing
// 3, which reads as a duplicate or a bug. Found in the hosted walkthrough; it
// could not surface locally, because the demo seed has no project of that type.
export const PROJECT_TYPE_ROLLUP_LABEL = "Remaining";

// The tail is summed, never dropped: the strip's numbers must still reconcile
// with the portfolio total. The rollup is not a link, because no single filter
// can express "everything except the leading four".
function leadingProjectTypes(data, limit = PROJECT_TYPE_LEADERS) {
  const ranked = [...data].sort((a, b) => b.value - a.value);
  if (ranked.length <= limit + 1) return { leaders: ranked, otherValue: 0, otherCount: 0 };
  const leaders = ranked.slice(0, limit);
  const tail = ranked.slice(limit);
  return {
    leaders,
    otherValue: tail.reduce((sum, row) => sum + row.value, 0),
    otherCount: tail.length,
  };
}

export function ProjectTypeSummary({ data }) {
  const { leaders, otherValue, otherCount } = leadingProjectTypes(data);
  return (
    <section
      className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-stone-200 bg-white px-5 py-3.5"
      aria-labelledby="type-summary-title"
    >
      <h2 id="type-summary-title" className="text-sm font-semibold">
        Project types
      </h2>
      {data.length === 0 ? (
        <p className="text-sm text-gray-500">No data yet</p>
      ) : (
        <ul className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
          {leaders.map((row, index) => (
            <li key={row.label} className="min-w-0">
              <Link
                to={`/admin/projects?projectType=${encodeURIComponent(row.label)}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-botanique-green"
              >
                <span
                  className="h-3 w-1 shrink-0 rounded-sm"
                  style={{ backgroundColor: TYPE_COLOURS[index % TYPE_COLOURS.length] }}
                  aria-hidden="true"
                />
                <span>{row.label}</span>
                <strong className="tabular-nums text-botanique-charcoal">{row.value}</strong>
              </Link>
            </li>
          ))}
          {otherCount > 0 && (
            <li className="flex items-center gap-2 text-sm text-gray-500">
              <span className="h-3 w-1 shrink-0 rounded-sm bg-stone-300" aria-hidden="true" />
              <span>{PROJECT_TYPE_ROLLUP_LABEL}</span>
              <strong className="tabular-nums text-botanique-charcoal">{otherValue}</strong>
              <span className="sr-only">
                across {otherCount} further project types
              </span>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
