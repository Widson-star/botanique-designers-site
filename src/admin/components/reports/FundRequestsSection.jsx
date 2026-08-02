// BD-REPORTS-01B — Fund requests, as a statistical summary.
//
// Two figures, again kept apart:
//   * funding REQUESTED  — requests at submitted status, dated by submission.
//   * funding AUTHORISED — requests at approved status, dated by decision, and
//     labelled "Funding authorised — not released" everywhere it appears.
//
// Each carries its own request count. The individual request cards were
// removed — Fund Requests owns each request, its intended custody model and
// its history, and the link below opens them for this project and this period.
//
// Approval of a fund request is Principal authority to make money available. It
// records no release, no transfer, no advance receipt, no payment, no
// settlement and no reconciliation, and this section never implies otherwise.
//
// Both figures use `total_requested_amount`, the single stored amount, which
// stands at approved status. There is no approved-amount column and none is
// invented. Draft, returned for correction, rejected, withdrawn and cancelled
// requests are excluded from both totals.
import ReportSection, {
  ReportDrillLink,
  ReportFigure,
  ReportFigureGrid,
} from "./ReportSection";
import { moduleLink } from "../../utils/reportLinks";
import { formatReportCount, formatReportMoney, REPORT_LABELS } from "../../utils/reportFormat";

export default function FundRequestsSection({ section, projectId, range }) {
  const totals = section.totals || {};
  const currency = totals.currency || "KES";

  return (
    <ReportSection
      title="Fund requests"
      description="Requests for Principal authority to make money available against approved internal costs. No funds have been released, transferred or paid."
      state={section.state}
      actions={
        <ReportDrillLink to={moduleLink("/admin/fund-requests", { projectId, status: "all", range })}>
          Open fund requests
        </ReportDrillLink>
      }
    >
      <ReportFigureGrid>
        <ReportFigure
          label={REPORT_LABELS.fundingRequested}
          value={formatReportMoney(totals.requestedTotal, currency)}
          note={`${formatReportCount(totals.requestedCount, "request")} submitted for decision, by submission date.`}
        />
        <ReportFigure
          label={REPORT_LABELS.fundingAuthorised}
          value={formatReportMoney(totals.authorisedTotal, currency)}
          note={`${formatReportCount(totals.authorisedCount, "request")} authorised, by decision date. Authorised is not released.`}
        />
      </ReportFigureGrid>
    </ReportSection>
  );
}
