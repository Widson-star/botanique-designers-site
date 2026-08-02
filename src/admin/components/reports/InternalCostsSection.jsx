// BD-REPORTS-01A — Internal Cost Claims.
//
// Two figures, kept apart because they mean different things:
//   * internal costs SUBMITTED — claims awaiting review, valued at their
//     submitted total, dated by submission. This is not an amount owed.
//   * internal costs APPROVED  — approved claims, valued at their approved
//     total, dated by decision. This is not an amount spent, released or paid.
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
  ReportRecordCard,
  ReportRecordList,
} from "./ReportSection";
import {
  CLAIM_CATEGORY_LABELS,
  CLAIM_LIFECYCLE_LABELS,
  CLAIM_RECIPIENT_TYPE_LABELS,
  formatReportCount,
  formatReportMoney,
  formatReportText,
  REPORT_LABELS,
} from "../../utils/reportFormat";
import { formatReportTimestampDate } from "../../utils/reportPeriod";

export default function InternalCostsSection({ section, projectId }) {
  const totals = section.totals || {};
  const claims = section.claims || [];
  const currency = totals.currency || "KES";

  return (
    <ReportSection
      title="Internal cost claims"
      description="Internal project-cost claims raised against this project. An approved claim is an authorised internal cost — it is not money spent, released or paid."
      state={section.state}
      actions={
        <ReportDrillLink to={`/admin/site-costs?project=${projectId}&status=all`}>
          Open site costs
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

      {claims.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-botanique-charcoal">Claims in this period</h3>
          <ReportRecordList>
            {claims.map((claim) => (
              <ReportRecordCard
                key={claim.id}
                to={`/admin/site-costs/${claim.id}`}
                title={formatReportText(claim.recipientLabel)}
                amount={formatReportMoney(
                  claim.lifecycle === "approved" ? claim.approvedTotal : claim.submittedTotal,
                  claim.currency
                )}
                meta={`${CLAIM_CATEGORY_LABELS[claim.category] || "Other"} · ${
                  CLAIM_RECIPIENT_TYPE_LABELS[claim.recipientType] || "Recipient"
                }`}
                state={CLAIM_LIFECYCLE_LABELS[claim.lifecycle] || "Not recorded"}
              >
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Submitted
                    </dt>
                    <dd className="mt-0.5">
                      {formatReportTimestampDate(claim.submittedAt, "Not submitted")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Decided
                    </dt>
                    <dd className="mt-0.5">
                      {formatReportTimestampDate(claim.decidedAt, "No decision yet")}
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
