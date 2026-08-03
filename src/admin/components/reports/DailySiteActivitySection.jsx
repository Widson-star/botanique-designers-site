// BD-REPORTS-01B — Daily site activity, as a statistical summary.
//
// Reports how the period's morning obligation turned out — days due, entries
// submitted, submitted late, missing, waived, and the resulting compliance
// rate — and nothing record by record. The list of dates and the individual
// site-entry cards were removed: Daily Site Operations owns those records, and
// the link below opens them for this project and this period.
//
// It reports the PLAN and its submission, and nothing beyond it. It does not
// show, imply or allow an inference of actual work completed. Botanique
// records no day-end outcome, so no figure here can be read as work done, and
// an accepted entry means an accepted PLAN.
import ReportSection, {
  ReportDrillLink,
  ReportFigure,
  ReportFigureGrid,
} from "./ReportSection";
import { moduleLink } from "../../utils/reportLinks";
import ComplianceBreakdown from "./ComplianceBreakdown";
import { formatReportCount } from "../../utils/reportFormat";
import { complianceRate } from "../../utils/reportMetrics";

export default function DailySiteActivitySection({ section, projectId, range }) {
  const summary = section.summary || {};
  const rate = complianceRate(summary);
  const onTime = (summary.submitted || 0) - (summary.submittedLate || 0);

  return (
    <ReportSection
      title="Daily site activity"
      description="How the morning site obligation was met over this period. Plans and submissions only — never work completed."
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
          label="Entries due"
          value={formatReportCount(summary.due)}
          note="Days a morning entry was required for this project."
        />
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
          note="A morning entry was due and none was submitted or marked not required."
        />
        <ReportFigure label="Not required" value={formatReportCount(summary.waived)} />
        <ReportFigure
          label="Compliance rate"
          // A period in which nothing was due has no rate. It is stated as
          // such: neither 0% nor 100% would be true.
          value={rate === null ? "No entries were due" : `${rate}%`}
          note="Of the days an entry was due, the share met by a submitted entry or one marked not required."
        />
      </ReportFigureGrid>

      <ComplianceBreakdown
        rows={[
          { key: "submitted", label: "Submitted on time", value: onTime > 0 ? onTime : 0 },
          { key: "late", label: "Submitted late", value: summary.submittedLate || 0 },
          { key: "waived", label: "Not required", value: summary.waived || 0 },
          { key: "missing", label: "Missing", value: summary.missing || 0 },
        ]}
      />
    </ReportSection>
  );
}
