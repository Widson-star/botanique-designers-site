// BD-REPORTS-01B — the concise Project Summary.
//
// Reports answers management questions at a glance: how is site recording
// holding up, how much workforce was planned, what was claimed, what was
// asked for, and what is still waiting on a decision. It is a statistical
// summary, not a second copy of the operational modules.
//
// Every section is therefore figures plus one exact drill-through link. The
// individual records behind those figures — each site day, each entry, each
// claim, each request, each decision, and the cross-domain activity feed —
// live in the module that owns them, and the link carries the same project and
// the same period so the reader lands where the figure came from.
//
// The layout is a single stacked column of cards on every width. Mobile is a
// primary environment, so nothing depends on a horizontal table.
import ProjectOverviewSection from "./ProjectOverviewSection";
import NeedsAttentionSection from "./NeedsAttentionSection";
import DailySiteActivitySection from "./DailySiteActivitySection";
import PlannedLabourSection from "./PlannedLabourSection";
import InternalCostsSection from "./InternalCostsSection";
import FundRequestsSection from "./FundRequestsSection";
import ApprovalsDecisionsSection from "./ApprovalsDecisionsSection";

export default function ProjectSummary({ report, profilesById = {} }) {
  const { projectId, range } = report;
  return (
    <div className="space-y-4">
      <ProjectOverviewSection section={report.overview} profilesById={profilesById} />
      <NeedsAttentionSection items={report.needsAttention} />
      <DailySiteActivitySection section={report.dailySite} projectId={projectId} range={range} />
      <PlannedLabourSection section={report.dailySite} projectId={projectId} range={range} />
      <InternalCostsSection section={report.claims} projectId={projectId} range={range} />
      <FundRequestsSection section={report.fundRequests} projectId={projectId} range={range} />
      <ApprovalsDecisionsSection projection={report.approvalsProjection} projectId={projectId} />
    </div>
  );
}
