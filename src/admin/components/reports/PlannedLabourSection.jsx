// BD-REPORTS-01A — Attendance and Planned Labour.
//
// The section name is the approved one; its visible content is deliberately and
// entirely PLANNING-oriented. Everything here comes from the morning plan:
// the expected worker count, the crew reference, the rate per worker or agreed
// labour total, the planned labour amount and the supporting-evidence status.
//
// Botanique holds no attendance record. This section therefore never shows and
// never implies actual attendance, actual persons present, an actual worker
// count, actual labour cost, labour paid, payroll or completed work — those are
// unavailable future facts, and the section states so in plain words rather
// than showing a zero.
//
// The Daily Site row carries no currency column. Planned labour is presented in
// KES under the Kenya-only reporting rule, and the note below says so plainly
// rather than claiming the record stores a currency.
import ReportSection, {
  ReportDrillLink,
  ReportFigure,
  ReportFigureGrid,
  ReportRecordCard,
  ReportRecordList,
} from "./ReportSection";
import {
  EVIDENCE_STATUS_LABELS,
  formatReportCount,
  formatReportMoney,
  formatReportText,
  REPORT_LABELS,
  SECTION_STATE_MESSAGES,
  SECTION_STATE,
} from "../../utils/reportFormat";
import { formatReportDate } from "../../utils/reportPeriod";

export default function PlannedLabourSection({ section, projectId }) {
  const labour = section.labour || {};
  const entries = labour.entries || [];

  return (
    <ReportSection
      title="Attendance and planned labour"
      description="Planned workforce and planned labour from the morning site entries. These are plans, not a record of who attended or what was paid."
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
        <ReportFigure
          label={REPORT_LABELS.expectedWorkers}
          value={formatReportCount(labour.expectedWorkerTotal)}
          note="The number of workers planned for. This is not a record of attendance."
        />
        <ReportFigure
          label={REPORT_LABELS.plannedLabour}
          value={formatReportMoney(labour.plannedLabourTotal, "KES")}
          note="The labour amount planned. This is not labour cost incurred, labour paid or payroll."
        />
        <ReportFigure
          label="Site entries counted"
          value={formatReportCount(labour.entryCount)}
          note="Submitted, resubmitted or accepted work-planned entries. Drafts, returned, voided and superseded entries are excluded."
        />
        <ReportFigure
          label="Recorded attendance"
          value={SECTION_STATE_MESSAGES[SECTION_STATE.UNAVAILABLE]}
          note="Botanique does not yet record who was present on site, so no attendance figure exists to report."
        />
      </ReportFigureGrid>

      {entries.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-botanique-charcoal">Planned by day</h3>
          <ReportRecordList>
            {entries.map((entry) => (
              <ReportRecordCard
                key={entry.id}
                to={`/admin/daily-site-operations/${entry.id}`}
                title={formatReportDate(entry.workDate)}
                amount={formatReportMoney(entry.plannedLabourCost, "KES")}
                meta={formatReportCount(entry.expectedWorkerCount, "expected worker")}
              >
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Crew</dt>
                    <dd className="mt-0.5 break-words">{formatReportText(entry.crewReference)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Labour basis
                    </dt>
                    <dd className="mt-0.5">
                      {entry.agreedLabourTotal !== null && entry.agreedLabourTotal !== undefined
                        ? `Agreed labour total ${formatReportMoney(entry.agreedLabourTotal, "KES")}`
                        : entry.ratePerWorker !== null && entry.ratePerWorker !== undefined
                          ? `${formatReportMoney(entry.ratePerWorker, "KES")} per worker`
                          : "Not recorded"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Supporting evidence
                    </dt>
                    <dd className="mt-0.5">
                      {EVIDENCE_STATUS_LABELS[entry.evidenceStatus] || "Not recorded"}
                    </dd>
                  </div>
                </dl>
              </ReportRecordCard>
            ))}
          </ReportRecordList>
        </div>
      )}

      <p className="mt-4 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-xs leading-relaxed text-gray-600">
        Planned labour is shown in Kenyan shillings under the Kenya-only reporting rule. The site
        entry itself does not store a currency.
      </p>
    </ReportSection>
  );
}
