import { Link, useParams } from "react-router-dom";
import FinancialReferencesPanel from "../components/FinancialReferencesPanel";
import ProjectBadge from "../components/ProjectBadge";
import { canManageStaff, canViewProject } from "../utils/permissions";

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

export default function AdminProjectDetail({ role, projects, financialReferences, dataStatus, dataError, isDemo }) {
  const { id } = useParams();
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

  return (
    <div className="space-y-5">
      <div>
        <Link to="/admin/projects" className="text-sm text-botanique-green font-semibold hover:underline">
          Back to projects
        </Link>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mt-3">
          <div>
            <h1 className="text-2xl font-bold">{project.projectName}</h1>
            <p className="text-sm text-gray-500 mt-1">{project.clientSiteName || "Site label not set"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ProjectBadge value={project.status} />
            <ProjectBadge value={project.stage} />
            <ProjectBadge value={project.portfolioPermissionStatus} />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DetailCard title="Operational details">
            <dl className="grid md:grid-cols-2 gap-x-6">
              <DetailRow label="Project type" value={project.projectType} />
              <DetailRow label="Lead person" value={project.leadPerson} />
              <DetailRow label="Location" value={project.location} />
              <DetailRow label="County" value={project.county} />
              <DetailRow label="Start date" value={project.startDate} />
              <DetailRow label="Last updated" value={project.lastUpdated} />
              <DetailRow label="Archived" value={project.archived ? "Yes" : "No"} />
              <DetailRow label="Portfolio eligible" value={project.portfolioEligible ? "Yes" : "No"} />
            </dl>
          </DetailCard>

          <DetailCard title="Notes">
            <p className="text-sm text-gray-600 leading-relaxed">{project.notes || "No notes recorded."}</p>
          </DetailCard>

          <DetailCard title="Assignments">
            <div className="flex flex-wrap gap-2">
              {(project.assignments || []).map((assignment) => (
                <span
                  key={assignment}
                  className="rounded-full bg-botanique-beige px-3 py-1 text-xs font-medium text-botanique-green"
                >
                  {assignment}
                </span>
              ))}
            </div>
            {canManageStaff(role) && (
              <button
                type="button"
                disabled
                className="mt-4 rounded-md border border-stone-200 bg-stone-100 px-4 py-2 text-sm font-semibold text-gray-400 cursor-not-allowed"
              >
                Assign staff - future
              </button>
            )}
          </DetailCard>
        </div>

        <div className="space-y-5">
          <DetailCard title="Next action">
            <p className="text-sm text-gray-700 leading-relaxed">{project.nextAction || "No next action set."}</p>
            <p className="text-xs text-gray-400 mt-3">Date: {project.nextActionDate || "Not dated"}</p>
            <button
              type="button"
              disabled
              className="mt-4 w-full rounded-md border border-stone-200 bg-stone-100 px-4 py-2 text-sm font-semibold text-gray-400 cursor-not-allowed"
            >
              Edit next action - future
            </button>
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

      <section className="bg-white border border-stone-200 rounded-lg p-5">
        <h2 className="font-bold text-lg mb-2">Simple Invoice boundary</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          This admin preview stores no official financial documents and does not create
          estimates, invoices, receipts, payment records, PDFs, or document numbers.
          Simple Invoice Manager remains the financial source of truth.
        </p>
      </section>
    </div>
  );
}
