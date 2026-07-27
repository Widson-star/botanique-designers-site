// Project detail: Overview + read-only Activity History only (no empty future
// tabs). Owner material actions and the owner-only finance reference panel are
// shown where permitted. Section shown via a `tab` URL search parameter.
import { Link, useParams, useSearchParams } from "react-router-dom";
import FinancialReferencesPanel from "../components/FinancialReferencesPanel";
import ProjectBadge from "../components/ProjectBadge";
import OwnerProjectActions from "../components/OwnerProjectActions";
import ActivityHistory from "../components/ActivityHistory";
import { useAdminData } from "../context/adminData";
import { canViewProject } from "../utils/permissions";
import { formatDateTime } from "../utils/activityFormat";

function DetailCard({ title, children }) {
  return (
    <section className="bg-white border border-stone-200 rounded-lg p-5">
      <h2 className="font-bold text-lg mb-4">{title}</h2>
      {children}
    </section>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="py-3 border-b border-stone-100 last:border-b-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
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
  const { role, projects, financialReferences, isDemo, dataStatus, dataError } = useAdminData();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "activity" ? "activity" : "overview";

  const project = projects.find((item) => item.id === id);
  const financialReference = financialReferences[project?.id] || {};

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
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mt-3">
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
          <div className="flex flex-wrap items-start gap-2">
            <ProjectBadge value={project.status} />
            <ProjectBadge value={project.stage} />
            <Link
              to={`/admin/projects/${project.id}/edit`}
              className="rounded-md bg-botanique-green px-3 py-1.5 text-sm font-semibold text-white hover:bg-botanique-dark"
            >
              Edit
            </Link>
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
          <OwnerProjectActions role={role} project={project} />

          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
              <DetailCard title="Operational details">
                <dl className="grid md:grid-cols-2 gap-x-6">
                  <DetailRow label="Status" value={project.status} />
                  <DetailRow label="Stage" value={project.stage} />
                  <DetailRow label="Project type" value={project.projectType} />
                  <DetailRow label="Accountable lead" value={project.leadPersonName} />
                  <DetailRow label="Location" value={project.location} />
                  <DetailRow label="County" value={project.county} />
                  <DetailRow label="Planned start" value={project.startDate} />
                  <DetailRow label="Actual start" value={project.actualStartDate} />
                  <DetailRow label="Target completion" value={project.targetCompletionDate} />
                  <DetailRow label="Actual completion" value={project.actualCompletionDate} />
                  <DetailRow label="Archived" value={project.archived ? "Yes" : "No"} />
                  <DetailRow label="Last modified" value={formatDateTime(project.updatedAt)} />
                </dl>
              </DetailCard>

              <DetailCard title="Notes">
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {project.notes || "No notes recorded."}
                </p>
              </DetailCard>
            </div>

            <div className="space-y-5">
              <DetailCard title="Next action">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {project.nextAction || "No next action set."}
                </p>
                <p className="text-xs text-gray-400 mt-3">Date: {project.nextActionDate || "Not dated"}</p>
              </DetailCard>

              <DetailCard title="Blocker">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {project.blocker || "None recorded."}
                </p>
              </DetailCard>

              <DetailCard title="Portfolio">
                <dl>
                  <DetailRow label="Eligible" value={project.portfolioEligible ? "Yes" : "No"} />
                  <DetailRow label="Permission status" value={project.portfolioPermissionStatus} />
                </dl>
              </DetailCard>
            </div>
          </div>

          <FinancialReferencesPanel financialReference={financialReference} role={role} isDemo={isDemo} />
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
