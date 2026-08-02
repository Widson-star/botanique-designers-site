// BD-REPORTS-01A — Recent Activity.
//
// A safe, non-persistent projection over the immutable event sources. Only six
// things survive it: the source domain, a plain user-facing event label, the
// actor, the normalised event timestamp, the originating record id (used as a
// link target, never displayed as a label) and the project.
//
// It never returns or renders a complete claim snapshot, a claim-line snapshot,
// a Daily Site snapshot, an unrestricted fund-request payload, previous or new
// project JSON values, or a raw technical event-type identifier. Those columns
// are not even selected by the readers, so they cannot reach this component.
import { Link } from "react-router-dom";
import ReportSection from "./ReportSection";
import { activityEventLabel, SOURCE_DOMAIN_LABELS } from "../../utils/reportFormat";
import { formatReportDateTime } from "../../utils/reportPeriod";
import { resolveActorLabel } from "../../utils/activityFormat";

export default function RecentActivitySection({ section, profilesById = {} }) {
  const items = section.items || [];
  return (
    <ReportSection
      title="Recent activity"
      description="What happened on this project between the selected dates, newest first."
      state={section.state}
    >
      <ol className="space-y-3">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              to={item.route}
              className="block min-h-11 rounded-lg border border-stone-200 bg-white p-3 transition hover:border-botanique-green/40 hover:bg-stone-50"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="min-w-0 break-words text-sm font-medium text-botanique-charcoal">
                  {activityEventLabel(item.sourceDomain, item.eventType)}
                </span>
                <span className="shrink-0 text-xs text-gray-500">
                  {formatReportDateTime(item.occurredAt)}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {SOURCE_DOMAIN_LABELS[item.sourceDomain]} · {resolveActorLabel(item.actorId, profilesById)}
              </p>
            </Link>
          </li>
        ))}
      </ol>
    </ReportSection>
  );
}
