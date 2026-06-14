import { Link } from "react-router-dom";
import ProjectBadge from "../components/ProjectBadge";

function StatCard({ label, value }) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-3xl font-bold text-botanique-charcoal mt-2">{value}</p>
    </div>
  );
}

export default function AdminDashboard({ projects, dataStatus, dataError, isDemo }) {
  const activeProjects = projects.filter((project) => ["Ongoing", "Pending", "Paused"].includes(project.status));
  const pendingNextActions = projects.filter((project) => project.nextAction && !project.archived);
  const portfolioPermissionNeeded = projects.filter((project) => project.portfolioPermissionStatus === "Permission Needed");

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Project tracker dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isDemo
              ? "Dev-only seed preview for Botanique Designers projects."
              : "Authenticated operational project tracker for Botanique Designers."}
          </p>
        </div>
        <Link
          to="/admin/projects"
          className="inline-flex rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white hover:bg-botanique-dark transition"
        >
          View projects
        </Link>
      </div>

      {dataStatus === "loading" && (
        <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-gray-600">
          Loading project records...
        </div>
      )}

      {dataStatus === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {dataError || "Unable to load project records."}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total projects" value={projects.length} />
        <StatCard label="Ongoing" value={projects.filter((project) => project.status === "Ongoing").length} />
        <StatCard label="Pending" value={projects.filter((project) => project.status === "Pending").length} />
        <StatCard label="Completed" value={projects.filter((project) => project.status === "Completed").length} />
        <StatCard label="Design-only" value={projects.filter((project) => project.status === "Design-only").length} />
        <StatCard label="Next actions" value={pendingNextActions.length} />
        <StatCard label="Portfolio permission needed" value={portfolioPermissionNeeded.length} />
        <StatCard label="Archived" value={projects.filter((project) => project.archived).length} />
      </div>

      <section className="bg-white border border-stone-200 rounded-lg p-5">
        <h2 className="font-bold text-lg mb-3">Simple Invoice boundary</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Financial documents remain managed in Simple Invoice Manager. This admin preview
          does not create invoices, estimates, receipts, PDFs, document numbers, or payments.
        </p>
      </section>

      <div className="grid lg:grid-cols-2 gap-5">
        <section className="bg-white border border-stone-200 rounded-lg p-5">
          <h2 className="font-bold text-lg mb-4">Active projects</h2>
          {activeProjects.length === 0 ? (
            <p className="text-sm text-gray-500">No active projects in this preview.</p>
          ) : (
            <div className="space-y-3">
              {activeProjects.slice(0, 5).map((project) => (
                <Link
                  key={project.id}
                  to={`/admin/projects/${project.id}`}
                  className="block rounded-md border border-stone-100 p-3 hover:border-botanique-green transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{project.projectName}</p>
                      <p className="text-xs text-gray-500 mt-1">{project.location || "Location not set"}</p>
                    </div>
                    <ProjectBadge value={project.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-stone-200 rounded-lg p-5">
          <h2 className="font-bold text-lg mb-4">Pending next actions</h2>
          <div className="space-y-3">
            {pendingNextActions.slice(0, 6).map((project) => (
              <Link
                key={project.id}
                to={`/admin/projects/${project.id}`}
                className="block rounded-md border border-stone-100 p-3 hover:border-botanique-green transition"
              >
                <p className="font-medium">{project.projectName}</p>
                <p className="text-sm text-gray-600 mt-1">{project.nextAction}</p>
                <p className="text-xs text-gray-400 mt-2">
                  Due: {project.nextActionDate || "Not dated"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
