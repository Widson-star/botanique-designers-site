// BD-REPORTS-01B — Internal cost claims, as a statistical summary.
//
// Two figures, kept apart because they mean different things:
//   * internal costs SUBMITTED — claims awaiting review, valued at their
//     submitted total, dated by submission. This is not an amount owed.
//   * internal costs APPROVED  — approved claims, valued at their approved
//     total, dated by decision. This is not an amount spent, released or paid.
//
// Each carries its own claim count. The individual claim cards were removed —
// Site Costs owns each claim, its recipient, its category and its history, and
// the link below opens them for this project and this period.
//
// Draft, returned for correction, rejected, withdrawn and cancelled claims are
// excluded from both totals. Claims are amended in place, so no supersession
// rule applies to them. A claim submitted in one period and decided in another
// contributes to each period's own figure exactly once — never to both in the
// same period, and never twice.
import ReportSection, {
  ReportDrillLink,
  ReportFigure,
  ReportFigureGrid,
} from "./ReportSection";
import { moduleLink } from "../../utils/reportLinks";
import { formatReportCount, formatReportMoney, REPORT_LABELS } from "../../utils/reportFormat";

export default function InternalCostsSection({ section, projectId, range }) {
  const totals = section.totals || {};
  const currency = totals.currency || "KES";

  return (
    <ReportSection
      title="Internal cost claims"
      description="Internal project-cost claims raised against this project. An approved claim is an authorised internal cost — it is not money spent, released or paid."
      state={section.state}
      actions={
        <ReportDrillLink to={moduleLink("/admin/site-costs", { projectId, status: "all", range })}>
          Open Project Costs
        </ReportDrillLink>
      }
    >
      <ReportFigureGrid>
        <ReportFigure
          label={REPORT_LABELS.internalCostsSubmitted}
          value={formatReportMoney(totals.submittedTotal, currency)}
          note={`${formatReportCount(totals.submittedCount, "claim")} awaiting review, by submission date.`}
        />
        <ReportFigure
          label={REPORT_LABELS.internalCostsApproved}
          value={formatReportMoney(totals.approvedTotal, currency)}
          note={`${formatReportCount(totals.approvedCount, "claim")} approved, by decision date. Approved is not spent.`}
        />
      </ReportFigureGrid>
    </ReportSection>
  );
}
