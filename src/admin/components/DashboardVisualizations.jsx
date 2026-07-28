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
    <section aria-labelledby="status-chart-title">
      <div className="mb-4">
        <h2 id="status-chart-title" className="text-base font-semibold">
          Project status
        </h2>
        <p className="mt-1 text-sm text-gray-500">Current distribution across the portfolio.</p>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-gray-500">No data yet</p>
      ) : (
        <div className="grid items-center gap-5 sm:grid-cols-[150px_1fr]">
          <svg
            viewBox="0 0 120 120"
            className="mx-auto h-36 w-36"
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

          <ul className="grid gap-2">
            {data.map((row) => (
              <li key={row.label}>
                <Link
                  to={`/admin/projects?status=${encodeURIComponent(row.label)}`}
                  className="flex items-center justify-between gap-4 rounded px-2 py-1.5 text-sm hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-botanique-green/25"
                >
                  <span className="flex items-center gap-2 text-gray-600">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: STATUS_COLOURS[row.label] || "#739087" }}
                      aria-hidden="true"
                    />
                    {row.label}
                  </span>
                  <strong className="tabular-nums">{row.value}</strong>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function StageColumnChart({ data }) {
  const max = data.reduce((peak, row) => Math.max(peak, row.value), 0) || 1;
  const width = Math.max(620, data.length * 112);
  const chartHeight = 128;
  const barWidth = 34;

  return (
    <section aria-labelledby="stage-chart-title">
      <div className="mb-4">
        <h2 id="stage-chart-title" className="text-base font-semibold">
          Project stage
        </h2>
        <p className="mt-1 text-sm text-gray-500">Workload by delivery stage.</p>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-gray-500">No data yet</p>
      ) : (
        <>
          <div className="overflow-x-auto pb-1">
            <svg
              viewBox={`0 0 ${width} 190`}
              className="h-48 min-w-[620px] w-full"
              role="img"
              aria-labelledby="stage-column-title stage-column-desc"
            >
              <title id="stage-column-title">Project stage column chart</title>
              <desc id="stage-column-desc">
                {data.map((row) => `${row.label}: ${row.value}`).join(", ")}
              </desc>
              <line x1="26" y1="150" x2={width - 12} y2="150" stroke="#D9DBD6" />
              {data.map((row, index) => {
                const slot = (width - 52) / data.length;
                const x = 32 + index * slot + (slot - barWidth) / 2;
                const height = Math.max(8, (row.value / max) * chartHeight);
                const y = 150 - height;
                return (
                  <a
                    key={row.label}
                    href={`/admin/projects?stage=${encodeURIComponent(row.label)}`}
                    aria-label={`${row.label}: ${row.value} projects`}
                  >
                    <rect x={x} y={y} width={barWidth} height={height} rx="3" fill="#3F5F58" />
                    <text x={x + barWidth / 2} y={y - 7} textAnchor="middle" className="fill-botanique-charcoal text-[12px] font-semibold">
                      {row.value}
                    </text>
                    <text
                      x={x + barWidth / 2}
                      y="169"
                      textAnchor="middle"
                      className="fill-gray-500 text-[10px]"
                    >
                      {row.label}
                    </text>
                  </a>
                );
              })}
            </svg>
          </div>
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

export function ProjectTypeSummary({ data }) {
  return (
    <section className="border-t border-stone-200 pt-4" aria-labelledby="type-summary-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="type-summary-title" className="text-base font-semibold">
            Project types
          </h2>
          <p className="mt-1 text-sm text-gray-500">Portfolio mix by brief.</p>
        </div>
        {data.length === 0 ? (
          <p className="text-sm text-gray-500">No data yet</p>
        ) : (
          <ul className="flex max-w-4xl flex-wrap gap-x-7 gap-y-3">
            {data.map((row, index) => (
              <li key={row.label}>
                <Link
                  to={`/admin/projects?projectType=${encodeURIComponent(row.label)}`}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-botanique-green"
                >
                  <span
                    className="h-3 w-1 rounded-sm"
                    style={{ backgroundColor: TYPE_COLOURS[index % TYPE_COLOURS.length] }}
                    aria-hidden="true"
                  />
                  <span>{row.label}</span>
                  <strong className="tabular-nums text-botanique-charcoal">{row.value}</strong>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
