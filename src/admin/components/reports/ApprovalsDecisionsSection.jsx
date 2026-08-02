// BD-REPORTS-01B — Approvals and decisions, as a statistical summary.
//
// Counts over a labelled projection of three source groups: project approval
// requests, Internal Cost Claim decisions and Fund Request decisions. Reading
// the project approvals table alone would omit every finance decision, so all
// three are projected together.
//
// The per-record decision and awaiting cards were removed. The counts are
// taken from that same projection, so a figure and its module always agree,
// and each of the three modules owns its own records. Approvals carries no
// period filter, so its link narrows by project and open state only.
//
// Nothing is written: no finance decision is inserted into approval_requests
// and no generic approval ledger is created. Project Intakes are excluded from
// this project report.
import ReportSection, {
  ReportDrillLink,
  ReportFigure,
  ReportFigureGrid,
} from "./ReportSection";
import { moduleLink } from "../../utils/reportLinks";
import { formatReportCount } from "../../utils/reportFormat";
import { approvalsSummary } from "../../utils/reportMetrics";

export default function ApprovalsDecisionsSection({ projection, projectId }) {
  const notes = projection.sourceNotes || [];
  const summary = approvalsSummary(projection);

  return (
    <ReportSection
      title="Approvals and decisions"
      description="Decisions recorded in this period, and requests still awaiting one, across project changes, internal costs and fund requests."
      state={projection.state}
      actions={
        <ReportDrillLink to={moduleLink("/admin/approvals", { projectId, status: "open" })}>
          Open approvals
        </ReportDrillLink>
      }
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

      <ReportFigureGrid>
        <ReportFigure
          label="Awaiting a decision"
          value={formatReportCount(summary.awaiting)}
          tone={summary.awaiting ? "attention" : "default"}
          note="Open now, across the sections you can see. This is not a period figure."
        />
        <ReportFigure
          label="Approved"
          value={formatReportCount(summary.approved)}
          note="Decided in this period. An approval is authority, not money released or paid."
        />
        <ReportFigure
          label="Returned for correction"
          value={formatReportCount(summary.returned)}
          note="Returned to the requester in this period. These are excluded from every reported total."
        />
        <ReportFigure
          label="Rejected"
          value={formatReportCount(summary.rejected)}
          note="Decided against in this period."
        />
        {/* Any decision the three named groups do not cover — a withdrawal, for
            instance — is shown rather than silently dropped, so the counts
            always account for every decision in the projection. */}
        {summary.otherDecisions > 0 && (
          <ReportFigure
            label="Other decisions recorded"
            value={formatReportCount(summary.otherDecisions)}
            note="Closed in this period without an approval, return or rejection."
          />
        )}
      </ReportFigureGrid>

      <p className="mt-4 text-xs leading-relaxed text-gray-500">
        Each request, its full decision history and any action sit in the module that owns it.
        Nothing on this page changes a record.
      </p>
    </ReportSection>
  );
}
