// Compact attention panel, per `docs/ui-authority/operations-hub/01-dashboard-authority.png`.
//
// The authority screen pairs this beside "Due today" as one of two SHORT action
// panels. It is deliberately not an operational history: only the most pressing
// few projects are listed, each as one row with a single clear action, and the
// rest are reached through "View all". Nothing here is invented — every row and
// every reason comes from `projectsNeedingAttention`, which reads only fields
// already present on the visible project record.
import { Link } from "react-router-dom";
import { canEditProjects, canSeePendingActivation } from "../utils/projectCapabilities";
import { projectsNeedingAttention } from "../utils/dashboardMetrics";
import { compactPersonName } from "../utils/personName";

// How many projects the panel shows before deferring to the full Projects list.
export const ATTENTION_PREVIEW_LIMIT = 4;

// PRESENTATION ONLY. `projectAttentionReasons` decides WHICH conditions are
// true; nothing here changes that, adds one or hides one. This table decides
// only how a true condition is shown.
//
// The problem it solves: a project can legitimately carry four conditions at
// once, and rendering them as one joined red sentence turned the row into a
// paragraph of raw system state — the densest thing on the Dashboard, and
// louder than the genuinely urgent single-condition rows beside it.
//
// So exactly ONE condition — the most severe — is spoken in full and in
// colour. The rest survive as short neutral tags, which keeps every condition
// visible and countable without four of them competing for the same emphasis.
//
// `severity` orders them. `short` is the tag label. `tone` is used only when a
// condition is the primary one: red is reserved for a blocker or an overdue
// action, because those mean delivery has actually stopped or slipped.
const REASON_PRESENTATION = [
  { match: /^Blocker:/, severity: 0, short: "Blocker", tone: "red" },
  { match: /^Overdue next action$/, severity: 1, short: "Overdue action", tone: "red" },
  { match: /^Accountable lead missing$/, severity: 2, short: "No lead", tone: "amber" },
  { match: /^Next action missing$/, severity: 3, short: "No next action", tone: "amber" },
  { match: /^Pending activation$/, severity: 4, short: "Pending activation", tone: "amber" },
  { match: /^Upcoming start:/, severity: 5, short: "Upcoming start", tone: "neutral" },
];

const FALLBACK_PRESENTATION = { severity: 9, short: null, tone: "amber" };

function describeReason(reason) {
  const found = REASON_PRESENTATION.find((entry) => entry.match.test(reason));
  return {
    text: reason,
    severity: found ? found.severity : FALLBACK_PRESENTATION.severity,
    short: found && found.short ? found.short : reason,
    tone: found ? found.tone : FALLBACK_PRESENTATION.tone,
  };
}

// Beyond this the tags wrap to a third line and the row grows taller than the
// Due today rows beside it. The overflow becomes a count, which the Founder
// explicitly allowed and which still tells the reader there is more.
export const ATTENTION_TAG_LIMIT = 2;

// The most severe condition leads; the remainder keep their own order.
function splitAttentionReasons(reasons) {
  const described = reasons.map(describeReason);
  const ranked = [...described].sort((a, b) => a.severity - b.severity);
  const primary = ranked[0] || null;
  const rest = described.filter((entry) => entry !== primary);
  return {
    primary,
    rest: rest.slice(0, ATTENTION_TAG_LIMIT),
    overflow: Math.max(0, rest.length - ATTENTION_TAG_LIMIT),
  };
}

const PRIMARY_TONE_CLASS = {
  red: "text-red-700",
  amber: "text-amber-700",
  neutral: "text-gray-600",
};

const DOT_TONE_CLASS = {
  red: "bg-red-500",
  amber: "bg-amber-500",
  neutral: "bg-gray-400",
};

// A blocker's text is free-form and can run to 500 characters. The full text
// lives on the project; the row states the condition and enough of the text to
// recognise it, and stops.
const MAX_PRIMARY_LENGTH = 64;

function clampPrimary(text) {
  return text.length > MAX_PRIMARY_LENGTH
    ? `${text.slice(0, MAX_PRIMARY_LENGTH - 1).trimEnd()}…`
    : text;
}

export default function ProjectAttentionList({ projects, role }) {
  const showPendingActivation = canSeePendingActivation(role);
  const canEdit = canEditProjects(role);
  const items = projectsNeedingAttention(projects, undefined, {
    includePendingActivation: showPendingActivation,
  });
  const visible = items.slice(0, ATTENTION_PREVIEW_LIMIT);

  return (
    <section
      className="flex min-w-0 flex-col rounded-lg border border-stone-200 bg-white"
      aria-labelledby="attention-title"
    >
      <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
        <div className="flex min-w-0 items-center gap-2">
          <h2 id="attention-title" className="text-base font-semibold">
            Projects needing attention
          </h2>
          {items.length > 0 && (
            <span
              className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-700"
              data-attention-count
            >
              {items.length}
            </span>
          )}
        </div>
        {items.length > visible.length && (
          <Link
            to="/admin/projects"
            className="shrink-0 text-sm font-medium text-botanique-green hover:underline"
          >
            View all
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <p className="px-5 pb-4 text-sm text-gray-500">No projects need attention.</p>
      ) : (
        <ul className="divide-y divide-stone-100 border-t border-stone-100">
          {visible.map(({ project, reasons }) => {
            const pendingActivation =
              showPendingActivation && project.status === "Pending" && !project.archived;
            const { primary, rest, overflow } = splitAttentionReasons(reasons);
            return (
              <li key={project.id} className="flex min-w-0 items-start gap-3 px-5 py-3">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    DOT_TONE_CLASS[primary?.tone] || DOT_TONE_CLASS.amber
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/admin/projects/${project.id}`}
                    className="block truncate text-sm font-semibold text-botanique-charcoal hover:text-botanique-green hover:underline"
                  >
                    {project.projectName}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {project.status} · {project.stage} ·{" "}
                    {compactPersonName(project.leadPersonName) || "Not assigned"}
                  </p>
                  {/* Every condition still reaches assistive technology as one
                      complete sentence, so nothing is hidden by the visual
                      split into a primary line and neutral tags. */}
                  <p className="sr-only">{reasons.join(" · ")}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1" aria-hidden="true">
                    {primary && (
                      <span
                        className={`text-xs leading-5 ${
                          PRIMARY_TONE_CLASS[primary.tone] || PRIMARY_TONE_CLASS.amber
                        }`}
                        data-attention-primary
                      >
                        {clampPrimary(primary.text)}
                      </span>
                    )}
                    {rest.map((entry) => (
                      <span
                        key={entry.text}
                        className="rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[11px] leading-4 text-gray-500"
                        data-attention-tag
                      >
                        {entry.short}
                      </span>
                    ))}
                    {overflow > 0 && (
                      <span className="text-[11px] leading-4 text-gray-400" data-attention-overflow>
                        +{overflow}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {/* One quiet action. The row is a pointer into the project,
                      not a place to work, so the button carries no fill: the
                      authority screen's attention rows show a plain "Open". */}
                  <Link
                    to={`/admin/projects/${project.id}`}
                    className="rounded-md border border-stone-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-stone-50"
                  >
                    {pendingActivation ? "Activate" : "Open"}
                  </Link>
                  {canEdit && (
                    <Link
                      to={`/admin/projects/${project.id}/edit`}
                      className="text-[11px] font-medium text-gray-400 hover:text-botanique-green hover:underline"
                    >
                      Edit
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
