import { Link } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { canCreateProjects, canSeePendingActivation } from "../utils/projectCapabilities";
import {
  calculateDashboardMetrics,
  operationalSummary,
  projectsByStage,
  projectsByStatus,
  projectsByType,
} from "../utils/dashboardMetrics";
import StatCard from "../components/StatCard";
import ProjectAttentionList from "../components/ProjectAttentionList";
import RecentActivity from "../components/RecentActivity";
import {
  ProjectTypeSummary,
  StageColumnChart,
  StatusDoughnutChart,
} from "../components/DashboardVisualizations";

export default function AdminDashboard() {
  const {
    role,
    projects,
    profilesById,
    dataStatus,
    dataError,
    fetchActivities,
  } = useAdminData();
  const showPendingActivation = canSeePendingActivation(role);
  const metrics = calculateDashboardMetrics(projects);
  const summary = operationalSummary(projects, {
    includePendingActivation: showPendingActivation,
  });
  const showNewProject = canCreateProjects(role);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-stone-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Operations overview</h1>
          {summary ? (
            <p className="mt-2 max-w-4xl text-sm leading-6 text-gray-600">
              {summary.overview} {summary.attention}
            </p>
          ) : (
            <p className="mt-2 text-sm text-gray-500">No project data is available yet.</p>
          )}
        </div>
        {showNewProject && (
          <Link
            to="/admin/projects/new"
            className="inline-flex rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white transition hover:bg-botanique-dark"
          >
            New project
          </Link>
        )}
      </div>

      {dataStatus === "loading" && (
        <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-gray-600">
          Loading project records…
        </div>
      )}

      {dataStatus === "error" && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {dataError || "Unable to load project records."}
        </div>
      )}

      <section aria-label="Primary project indicators">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Active projects"
            value={metrics.active}
            href="/admin/projects?view=active"
            hint="Ongoing or paused"
          />
          <StatCard
            label={showPendingActivation ? "Pending activation" : "Pending projects"}
            value={showPendingActivation ? metrics.pendingActivation : metrics.pending}
            href={
              showPendingActivation
                ? "/admin/projects?view=pending-activation"
                : "/admin/projects?view=pending"
            }
            tone="attention"
          />
          <StatCard
            label="Overdue actions"
            value={metrics.overdueActions}
            href="/admin/projects?view=overdue-actions"
            tone={metrics.overdueActions > 0 ? "attention" : "default"}
          />
          <StatCard
            label="Upcoming starts"
            value={metrics.upcomingStarts}
            href="/admin/projects?view=upcoming-starts"
          />
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-x-8 gap-y-2 px-1" aria-label="Secondary project summary">
        <p className="text-sm font-medium text-gray-500">Portfolio totals</p>
        <Link to="/admin/projects" className="text-sm text-gray-600 hover:text-botanique-green">
          Total <strong className="ml-1 tabular-nums text-botanique-charcoal">{metrics.total}</strong>
        </Link>
        <Link
          to="/admin/projects?view=completed"
          className="text-sm text-gray-600 hover:text-botanique-green"
        >
          Completed{" "}
          <strong className="ml-1 tabular-nums text-botanique-charcoal">
            {metrics.completed}
          </strong>
        </Link>
        <Link
          to="/admin/projects?view=design-only"
          className="text-sm text-gray-600 hover:text-botanique-green"
        >
          Design-only{" "}
          <strong className="ml-1 tabular-nums text-botanique-charcoal">
            {metrics.designOnly}
          </strong>
        </Link>
      </section>

      <ProjectAttentionList projects={projects} role={role} />

      <section className="rounded-lg border border-stone-200 bg-white p-5" aria-label="Project visualisations">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.4fr] lg:divide-x lg:divide-stone-200">
          <StatusDoughnutChart data={projectsByStatus(projects)} />
          <div className="lg:pl-8">
            <StageColumnChart data={projectsByStage(projects)} />
          </div>
        </div>
        <div className="mt-5">
          <ProjectTypeSummary data={projectsByType(projects)} />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <section className="rounded-lg border border-stone-200 bg-white p-5" aria-labelledby="portfolio-summary-title">
          <h2 id="portfolio-summary-title" className="text-base font-semibold">Portfolio notes</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Metrics and charts use only the project records visible to this role. Open a
            chart legend or column to review the matching filtered projects.
          </p>
        </section>

        <RecentActivity
          projects={projects}
          profilesById={profilesById}
          fetchActivities={fetchActivities}
        />
      </div>
    </div>
  );
}
