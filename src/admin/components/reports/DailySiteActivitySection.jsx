// BD-REPORTS-01A — Daily Site Activity.
//
// Reports the PLAN and its submission, and nothing beyond it: what was planned,
// whether a work day was planned or not, the recorded reason, the expected
// worker count, the crew reference, evidence status, submission timing and
// lateness, obligation and compliance state, and the entry's own state.
//
// It does not show, imply or allow an inference of actual work completed.
// Botanique records no day-end outcome, so no figure here can be read as work
// done, and an accepted entry means an accepted PLAN.
import ReportSection, {
  ReportDrillLink,
  ReportFigure,
  ReportFigureGrid,
  ReportRecordCard,
  ReportRecordList,
} from "./ReportSection";
import {
  COMPLIANCE_LABELS,
  DISPOSITION_LABELS,
  ENTRY_STATE_LABELS,
  EVIDENCE_STATUS_LABELS,
  formatReportCount,
  formatReportText,
} from "../../utils/reportFormat";
import { NO_WORK_REASON_LABELS } from "../../utils/dailySiteFormatters";
import { formatReportDate, formatReportDateTime } from "../../utils/reportPeriod";

export default function DailySiteActivitySection({ section, projectId }) {
  const summary = section.summary || {};
  const entries = section.entries || [];
  const compliance = section.compliance || [];

  return (
    <ReportSection
      title="Daily site activity"
      description="What was planned on site, and whether the morning entry was submitted. This section reports plans and submissions only — it does not report work completed."
      state={section.state}
      actions={
        <ReportDrillLink
          to={`/admin/daily-site-operations?project=${projectId}&status=all`}
        >
          Open daily site operations
        </ReportDrillLink>
      }
    >
      <ReportFigureGrid>
        <ReportFigure label="Entries submitted" value={formatReportCount(summary.submitted)} />
        <ReportFigure
          label="Submitted late"
          value={formatReportCount(summary.submittedLate)}
          tone={summary.submittedLate ? "attention" : "default"}
        />
        <ReportFigure
          label="Missing"
          value={formatReportCount(summary.missing)}
          tone={summary.missing ? "attention" : "default"}
          note="A morning entry was due and none was submitted or waived."
        />
        <ReportFigure label="Waived" value={formatReportCount(summary.waived)} />
      </ReportFigureGrid>

      {compliance.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-botanique-charcoal">Days in this period</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {compliance.slice(0, 40).map((day) => (
              <li
                key={`${day.workDate}-${day.projectId}`}
                className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-gray-600"
              >
                {formatReportDate(day.workDate)} — {COMPLIANCE_LABELS[day.complianceStatus] || "Not due"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {entries.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-botanique-charcoal">Site entries</h3>
          <ReportRecordList>
            {entries.map((entry) => (
              <ReportRecordCard
                key={entry.id}
                to={`/admin/daily-site-operations/${entry.id}`}
                title={formatReportDate(entry.workDate)}
                meta={`${DISPOSITION_LABELS[entry.disposition] || "Not recorded"}${
                  entry.disposition === "no_work"
                    ? ` — ${NO_WORK_REASON_LABELS[entry.noWorkReason] || "Reason not recorded"}`
                    : ""
                }`}
                state={ENTRY_STATE_LABELS[entry.state] || "Not recorded"}
              >
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  {entry.disposition === "working" && (
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        Work planned
                      </dt>
                      <dd className="mt-0.5 break-words">{formatReportText(entry.workPlanned)}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Supporting evidence
                    </dt>
                    <dd className="mt-0.5">
                      {EVIDENCE_STATUS_LABELS[entry.evidenceStatus] || "Not recorded"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Submitted
                    </dt>
                    <dd className="mt-0.5">
                      {entry.submittedAt ? formatReportDateTime(entry.submittedAt) : "Not submitted"}
                      {entry.isLate && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Submitted late
                        </span>
                      )}
                    </dd>
                  </div>
                  {entry.returnedReason && (
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        Returned for correction
                      </dt>
                      <dd className="mt-0.5 break-words">{entry.returnedReason}</dd>
                    </div>
                  )}
                </dl>
              </ReportRecordCard>
            ))}
          </ReportRecordList>
        </div>
      )}
    </ReportSection>
  );
}
