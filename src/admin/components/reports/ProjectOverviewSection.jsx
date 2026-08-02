// BD-REPORTS-01B — Project overview: the report's project-and-period header.
//
// Only the context a reader needs to know WHICH project and WHICH period the
// figures below describe: identity, where it is, where it has got to, who is
// accountable, and when it is meant to finish.
//
// The rest of the project record — planned and actual start, actual
// completion, the next action, the recorded blocker and the archive timestamp
// — is not reproduced here. Projects owns it, one click away. A blocker, an
// overdue next action and an approaching target completion still reach the
// reader, through Needs attention, which is where an alert belongs.
//
// The deprecated `last_updated` column is never read and never shown.
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

// The reporting period is NOT repeated here. The sticky bar above carries the
// project and the period, stays visible the whole way down the report, and the
// period control states the range in full — a third copy on the first screen
// is the repetition this workstream set out to remove.
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
          <Fact label="Status">
            {text(project.status)}
            {project.archived && (
              <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                Archived
              </span>
            )}
          </Fact>
          <Fact label="Stage">{text(project.stage)}</Fact>
          <Fact label="Accountable lead">
            {project.leadPersonId ? resolveProfileLabel(project.leadPersonId, profilesById) : NOT_RECORDED}
          </Fact>
          <Fact label="Target completion">
            {project.targetCompletionDate ? formatReportDate(project.targetCompletionDate) : NOT_RECORDED}
          </Fact>
        </dl>
      )}
    </ReportSection>
  );
}
