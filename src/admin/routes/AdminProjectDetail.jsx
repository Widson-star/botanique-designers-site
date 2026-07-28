// Project detail: Overview + read-only Activity History only (no empty future
// tabs). Material actions and portfolio fields remain role-scoped. Section
// shown via a `tab` URL search parameter.
import { Link, useParams, useSearchParams } from "react-router-dom";
import ProjectBadge from "../components/ProjectBadge";
import OwnerProjectActions from "../components/OwnerProjectActions";
import ActivityHistory from "../components/ActivityHistory";
import { useAdminData } from "../context/adminData";
import { canViewProject } from "../utils/permissions";
import { canEditProjects, isOwner } from "../utils/projectCapabilities";
import { formatDateTime } from "../utils/activityFormat";
import { compactPersonName } from "../utils/personName";

function DetailCard({ title, children }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5">
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="border-b border-stone-100 py-2.5 last:border-b-0">
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-botanique-charcoal">{value || "Not set"}</dd>
    </div>
  );
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "activity", label: "Activity History" },
];

export default function AdminProjectDetail() {
  const { id } = useParams();
  const { role, projects, dataStatus, dataError } = useAdminData();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "activity" ? "activity" : "overview";
  const canEdit = canEditProjects(role);
  const showPortfolio = isOwner(role);

  const project = projects.find((item) => item.id === id);

  if (!project || !canViewProject(project, role)) {
    return (
      <div className="bg-white border border-stone-200 rounded-lg p-8">
        <h1 className="text-xl font-bold">Project unavailable</h1>
        <p className="text-sm text-gray-500 mt-2">
          {dataStatus === "loading"
            ? "Project records are still loading."
            : dataError || "This role cannot access that project, or the record does not exist."}
        </p>
        <Link to="/admin/projects" className="inline-flex mt-5 text-botanique-green font-semibold hover:underline">
          Back to projects
        </Link>
      </div>
    );
  }

  function selectTab(key) {
    const next = new URLSearchParams(searchParams);
    if (key === "overview") next.delete("tab");
    else next.set("tab", key);
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="space-y-5">
      <div>
        <Link to="/admin/projects" className="text-sm text-botanique-green font-semibold hover:underline">
          ← Back to projects
        </Link>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{project.projectName}</h1>
              {project.archived && (
                <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                  Archived
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">{project.clientSiteName || "Site label not set"}</p>
          </div>
          <div className="flex max-w-2xl flex-wrap items-center justify-start gap-2 lg:justify-end">
            <OwnerProjectActions role={role} project={project} />
            <ProjectBadge value={project.status} />
            <ProjectBadge value={project.stage} />
            {canEdit && (
              <Link
                to={`/admin/projects/${project.id}/edit`}
                className="rounded-md bg-botanique-green px-3 py-1.5 text-sm font-semibold text-white hover:bg-botanique-dark"
              >
                Edit project
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-stone-200" role="tablist" aria-label="Project sections">
        <div className="flex gap-2">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              onClick={() => selectTab(item.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                tab === item.key
                  ? "border-botanique-green text-botanique-green"
                  : "border-transparent text-gray-500 hover:text-botanique-charcoal"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" ? (
        <div className="space-y-5" role="tabpanel">
          <section className="overflow-hidden rounded-lg border border-stone-200 bg-white" aria-labelledby="project-overview-title">
            <div className="border-b border-stone-200 px-5 py-4">
              <h2 id="project-overview-title" className="text-base font-semibold">
                Project overview
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Delivery position, responsibility and the next decision required.
              </p>
            </div>

            <div className="grid lg:grid-cols-[1.45fr_1fr] lg:divide-x lg:divide-stone-200">
              <div className="p-5">
                <div className="grid gap-6 md:grid-cols-2">
                  <section aria-labelledby="identity-title">
                    <h3 id="identity-title" className="text-sm font-semibold">Identity and responsibility</h3>
                    <dl className="mt-2">
                      <DetailRow label="Project type" value={project.projectType} />
                      <DetailRow
                        label="Accountable lead"
                        value={compactPersonName(project.leadPersonName)}
                      />
                      <DetailRow label="Location" value={[project.location, project.county].filter(Boolean).join(", ")} />
                      <DetailRow label="Last modified" value={formatDateTime(project.updatedAt)} />
                    </dl>
                  </section>

                  <section aria-labelledby="schedule-title">
                    <h3 id="schedule-title" className="text-sm font-semibold">Schedule</h3>
                    <dl className="mt-2">
                      <DetailRow label="Planned start" value={project.startDate} />
                      <DetailRow label="Actual start" value={project.actualStartDate} />
                      <DetailRow label="Target completion" value={project.targetCompletionDate} />
                      <DetailRow label="Actual completion" value={project.actualCompletionDate} />
                    </dl>
                  </section>
                </div>

                <div className="mt-6 grid gap-6 border-t border-stone-200 pt-5 md:grid-cols-2">
                  <section aria-labelledby="next-step-title">
                    <h3 id="next-step-title" className="text-sm font-semibold">Next step</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-700">
                      {project.nextAction || "No next action set."}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Due {project.nextActionDate || "date not set"}
                    </p>
                  </section>
                  <section aria-labelledby="blocker-title">
                    <h3 id="blocker-title" className="text-sm font-semibold">Current blocker</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-700">
                      {project.blocker || "Nothing recorded."}
                    </p>
                  </section>
                </div>

                <section className="mt-6 border-t border-stone-200 pt-5" aria-labelledby="internal-note-title">
                  <h3 id="internal-note-title" className="text-sm font-semibold">Internal note</h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">
                    {project.notes || "No internal notes recorded."}
                  </p>
                </section>
              </div>

              {showPortfolio && (
                <aside className="bg-stone-50/60 p-5" aria-labelledby="portfolio-overview-title">
                  <h3 id="portfolio-overview-title" className="text-sm font-semibold">
                    Portfolio Overview
                  </h3>
                  <dl className="mt-2">
                    <DetailRow label="Eligible" value={project.portfolioEligible ? "Yes" : "No"} />
                    <DetailRow label="Permission status" value={project.portfolioPermissionStatus} />
                    <DetailRow label="Archived" value={project.archived ? "Yes" : "No"} />
                  </dl>
                </aside>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div role="tabpanel">
          <DetailCard title="Activity History">
            <ActivityHistory projectId={project.id} />
          </DetailCard>
        </div>
      )}
    </div>
  );
}
