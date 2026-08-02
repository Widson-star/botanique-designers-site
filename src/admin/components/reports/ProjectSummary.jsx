// BD-REPORTS-01A — the responsive Project Summary.
//
// One project, one period, eight sections, in the order a reader needs them:
// what this project is, what needs attention, what was planned on site, what
// workforce was planned, what internal costs were submitted and approved, what
// funding was requested and authorised, what was decided, and what happened.
//
// The layout is a single stacked column of cards on every width. Mobile is a
// primary environment, so nothing depends on a horizontal table, and the
// project and period stay visible in the header above.
import ProjectOverviewSection from "./ProjectOverviewSection";
import NeedsAttentionSection from "./NeedsAttentionSection";
import DailySiteActivitySection from "./DailySiteActivitySection";
import PlannedLabourSection from "./PlannedLabourSection";
import InternalCostsSection from "./InternalCostsSection";
import FundRequestsSection from "./FundRequestsSection";
import ApprovalsDecisionsSection from "./ApprovalsDecisionsSection";
import RecentActivitySection from "./RecentActivitySection";

export default function ProjectSummary({ report, profilesById = {} }) {
  return (
    <div className="space-y-4">
      <ProjectOverviewSection section={report.overview} profilesById={profilesById} />
      <NeedsAttentionSection items={report.needsAttention} />
      <DailySiteActivitySection section={report.dailySite} projectId={report.projectId} />
      <PlannedLabourSection section={report.dailySite} projectId={report.projectId} />
      <InternalCostsSection section={report.claims} projectId={report.projectId} />
      <FundRequestsSection section={report.fundRequests} projectId={report.projectId} />
      <ApprovalsDecisionsSection projection={report.approvalsProjection} />
      <RecentActivitySection section={report.recentActivity} profilesById={profilesById} />
    </div>
  );
}
