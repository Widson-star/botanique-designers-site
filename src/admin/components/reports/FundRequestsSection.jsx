// BD-REPORTS-01A — Fund Requests.
//
// Two figures, again kept apart:
//   * funding REQUESTED  — requests at submitted status, dated by submission.
//   * funding AUTHORISED — requests at approved status, dated by decision, and
//     labelled "Funding authorised — not released" everywhere it appears.
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
  ReportRecordCard,
  ReportRecordList,
} from "./ReportSection";
import {
  CUSTODY_LABELS,
  formatReportCount,
  formatReportMoney,
  FUND_STATUS_LABELS,
  REPORT_LABELS,
} from "../../utils/reportFormat";
import { formatReportTimestampDate } from "../../utils/reportPeriod";

export default function FundRequestsSection({ section, projectId }) {
  const totals = section.totals || {};
  const requests = section.requests || [];
  const currency = totals.currency || "KES";

  return (
    <ReportSection
      title="Fund requests"
      description="Requests for Principal authority to make money available against approved internal costs. No funds have been released, transferred or paid."
      state={section.state}
      actions={
        <ReportDrillLink to={`/admin/fund-requests?project=${projectId}&status=all`}>
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

      {requests.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-botanique-charcoal">Requests in this period</h3>
          <ReportRecordList>
            {requests.map((request) => (
              <ReportRecordCard
                key={request.id}
                to={`/admin/fund-requests/${request.id}`}
                title={request.requestNumber || "Fund request"}
                amount={formatReportMoney(request.totalRequestedAmount, request.currency)}
                meta={CUSTODY_LABELS[request.intendedCustodyType] || "Intended custody not recorded"}
                state={FUND_STATUS_LABELS[request.status] || "Not recorded"}
              >
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Submitted
                    </dt>
                    <dd className="mt-0.5">
                      {formatReportTimestampDate(request.submittedAt, "Not submitted")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Decided
                    </dt>
                    <dd className="mt-0.5">
                      {formatReportTimestampDate(request.decidedAt, "No decision yet")}
                    </dd>
                  </div>
                </dl>
              </ReportRecordCard>
            ))}
          </ReportRecordList>
        </div>
      )}
    </ReportSection>
  );
}
