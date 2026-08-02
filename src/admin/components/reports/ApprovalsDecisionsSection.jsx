// BD-REPORTS-01A — Approvals and Decisions.
//
// A labelled projection over three source groups: project approval requests,
// Internal Cost Claim decisions and Fund Request decisions. Reading the project
// approvals table alone would omit every finance decision, so all three are
// projected together and each item is labelled with the source it came from.
//
// Nothing is written: no finance decision is inserted into approval_requests
// and no generic approval ledger is created. The current decision summary here
// is deliberately separate from the event history, which appears in Recent
// Activity, and each record contributes at most one current-decision row.
//
// Project Intakes are excluded from this first project report.
import ReportSection, { ReportRecordCard, ReportRecordList } from "./ReportSection";
import { APPROVAL_TYPE_LABELS } from "../../utils/approvalFormatters";
import {
  CLAIM_LIFECYCLE_LABELS,
  FUND_STATUS_LABELS,
  formatReportText,
  SOURCE_DOMAIN_LABELS,
} from "../../utils/reportFormat";
import { formatReportTimestampDate } from "../../utils/reportPeriod";

const APPROVAL_STATE_LABELS = {
  submitted: "Submitted",
  awaiting_review: "Awaiting review",
  amendment_requested: "Returned for amendment",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

function stateLabel(item) {
  if (item.sourceDomain === "internal_cost") {
    return CLAIM_LIFECYCLE_LABELS[item.state] || "Not recorded";
  }
  if (item.sourceDomain === "fund_request") {
    return FUND_STATUS_LABELS[item.state] || "Not recorded";
  }
  return APPROVAL_STATE_LABELS[item.state] || "Not recorded";
}

function referenceLabel(item) {
  if (item.sourceDomain === "approval") {
    return APPROVAL_TYPE_LABELS[item.reference] || "Project change request";
  }
  return formatReportText(item.reference);
}

export default function ApprovalsDecisionsSection({ projection }) {
  const decisions = projection.decisions || [];
  const awaiting = projection.awaiting || [];
  const notes = projection.sourceNotes || [];

  return (
    <ReportSection
      title="Approvals and decisions"
      description="Decisions recorded in this period, and requests still awaiting one, across project changes, internal costs and fund requests."
      state={projection.state}
    >
      {notes.length > 0 && (
        <ul className="mb-4 space-y-2">
          {notes.map((note) => (
            <li
              key={note}
              className="rounded-md border border-stone-300 bg-white px-3 py-2 text-xs text-gray-500"
            >
              {note}
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-botanique-charcoal">Decisions made in this period</h3>
          {decisions.length === 0 ? (
            <p className="mt-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-gray-600">
              No decisions were recorded between the selected dates.
            </p>
          ) : (
            <ReportRecordList>
              {decisions.map((item) => (
                <ReportRecordCard
                  key={item.id}
                  to={item.route}
                  title={referenceLabel(item)}
                  meta={`${SOURCE_DOMAIN_LABELS[item.sourceDomain]} · decided ${formatReportTimestampDate(
                    item.decidedAt
                  )}`}
                  state={stateLabel(item)}
                />
              ))}
            </ReportRecordList>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-botanique-charcoal">Awaiting a decision</h3>
          {awaiting.length === 0 ? (
            <p className="mt-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-gray-600">
              Nothing is currently awaiting a decision in the sections you can see.
            </p>
          ) : (
            <ReportRecordList>
              {awaiting.map((item) => (
                <ReportRecordCard
                  key={item.id}
                  to={item.route}
                  title={referenceLabel(item)}
                  meta={`${SOURCE_DOMAIN_LABELS[item.sourceDomain]} · raised ${formatReportTimestampDate(
                    item.requestedAt
                  )}`}
                  state={stateLabel(item)}
                />
              ))}
            </ReportRecordList>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-gray-500">
        The full decision history for each record is in Recent activity below, and on the record
        itself. Decisions are made in their own module — nothing on this page changes a record.
      </p>
    </ReportSection>
  );
}
