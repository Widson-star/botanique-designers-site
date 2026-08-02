// BD-REPORTS-01A — Project Overview.
//
// Only facts the project record actually holds. The deprecated `last_updated`
// column is never read and never shown.
import ReportSection, { ReportDrillLink } from "./ReportSection";
import { formatReportDate } from "../../utils/reportPeriod";
import { NOT_RECORDED } from "../../utils/reportFormat";
import { resolveProfileLabel } from "../../utils/activityFormat";

function Fact({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-botanique-charcoal">{children}</dd>
    </div>
  );
}

function text(value) {
  const trimmed = typeof value === "string" ? value.trim() : value;
  return trimmed ? String(trimmed) : NOT_RECORDED;
}

function date(value) {
  return value ? formatReportDate(value) : NOT_RECORDED;
}

export default function ProjectOverviewSection({ section, profilesById = {} }) {
  const project = section?.project;
  return (
    <ReportSection
      title="Project overview"
      description="The project record as it currently stands."
      state={section.state}
      actions={
        project && (
          <ReportDrillLink to={`/admin/projects/${project.id}`}>
            Open the project record
          </ReportDrillLink>
        )
      }
    >
      {project && (
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Fact label="Project">{text(project.projectName)}</Fact>
          <Fact label="Client / site">{text(project.clientSiteName)}</Fact>
          <Fact label="Location">
            {[project.location, project.county].filter(Boolean).join(", ") || NOT_RECORDED}
          </Fact>
          <Fact label="Status">{text(project.status)}</Fact>
          <Fact label="Stage">{text(project.stage)}</Fact>
          <Fact label="Accountable lead">
            {project.leadPersonId ? resolveProfileLabel(project.leadPersonId, profilesById) : NOT_RECORDED}
          </Fact>
          <Fact label="Planned start">{date(project.startDate)}</Fact>
          <Fact label="Actual start">{date(project.actualStartDate)}</Fact>
          <Fact label="Target completion">{date(project.targetCompletionDate)}</Fact>
          <Fact label="Actual completion">{date(project.actualCompletionDate)}</Fact>
          <Fact label="Next action">
            {text(project.nextAction)}
            {project.nextActionDate && (
              <span className="mt-0.5 block text-xs text-gray-500">
                Due {formatReportDate(project.nextActionDate)}
              </span>
            )}
          </Fact>
          <Fact label="Blocker">{text(project.blocker)}</Fact>
          {project.archived && (
            <Fact label="Archive state">
              Archived{project.archivedAt ? ` on ${formatReportDate(project.archivedAt.slice(0, 10))}` : ""}
            </Fact>
          )}
        </dl>
      )}
    </ReportSection>
  );
}
