// BD-REPORTS-01B — Attendance and planned labour, as a statistical summary.
//
// Four figures over the period: the workforce planned, the labour planned, how
// many site entries those totals were counted from, and the plain statement
// that recorded attendance does not exist. The per-day planning cards were
// removed — Daily Site Operations owns each day's crew, rate and evidence, and
// the link below opens them for this project and this period.
//
// Botanique holds no attendance record. This section therefore never shows and
// never implies actual attendance, actual persons present, an actual worker
// count, actual labour cost, labour paid, payroll or completed work — those
// are unavailable future facts, and the section states so in plain words
// rather than showing a zero.
import ReportSection, {
  ReportDrillLink,
  ReportFigure,
  ReportFigureGrid,
} from "./ReportSection";
import { moduleLink } from "../../utils/reportLinks";
import {
  formatReportCount,
  formatReportMoney,
  REPORT_LABELS,
  SECTION_STATE_MESSAGES,
  SECTION_STATE,
} from "../../utils/reportFormat";

export default function PlannedLabourSection({ section, projectId, range }) {
  const labour = section.labour || {};

  return (
    <ReportSection
      title="Attendance and planned labour"
      description="Planned workforce and planned labour from the morning site entries. These are plans, not a record of who attended or what was paid."
      state={section.state}
      actions={
        <ReportDrillLink
          to={moduleLink("/admin/daily-site-operations", { projectId, status: "all", range })}
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
          // The site entry stores no currency column. Planned labour is shown
          // in Kenyan shillings under the Kenya-only reporting rule.
          value={formatReportMoney(labour.plannedLabourTotal, "KES")}
          note="The labour amount planned, in Kenyan shillings. This is not labour cost incurred, labour paid or payroll."
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
    </ReportSection>
  );
}
