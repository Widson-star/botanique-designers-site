import { Link } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { canCreateProjects, canSeePendingActivation } from "../utils/projectCapabilities";
import {
  calculateAttentionSummary,
  calculateDashboardMetrics,
  operationalSummary,
  projectsByStage,
  projectsByStatus,
  projectsByType,
} from "../utils/dashboardMetrics";
import StatCard from "../components/StatCard";
import BarChart from "../components/BarChart";
import ProjectAttentionList from "../components/ProjectAttentionList";
import RecentActivity from "../components/RecentActivity";

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
  const attention = calculateAttentionSummary(projects);
  const summary = operationalSummary(projects, {
    includePendingActivation: showPendingActivation,
  });
  const attentionLabels = [
    ["pendingProjects", showPendingActivation ? "Awaiting activation" : "Pending projects"],
    ["withoutLead", "Without leads"],
    ["withoutNextAction", "Without next actions"],
    ["withBlockers", "With blockers"],
    ["overdueActions", "Overdue actions"],
    ["upcomingStarts", "Upcoming starts"],
  ];
  const showNewProject = canCreateProjects(role);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-botanique-green">
            Operations Hub
          </p>
          <h1 className="mt-1 text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Live project control for planning and office briefings.
          </p>
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

      <section
        className="overflow-hidden rounded-xl bg-botanique-dark text-white shadow-sm"
        aria-labelledby="operational-summary-title"
      >
        <div className="grid gap-6 px-5 py-5 lg:grid-cols-[1.35fr_1fr] lg:px-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
              Live operational summary
            </p>
            <h2 id="operational-summary-title" className="mt-2 text-xl font-bold">
              Current project position
            </h2>
            {summary ? (
              <>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85">
                  {summary.overview}
                </p>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-white/60">
                  Attention: {summary.attention}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-white/70">
                No project data is available for an operational summary.
              </p>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
            {attentionLabels.map(([key, label]) => (
              <div key={key} className="rounded-lg bg-white/10 px-3 py-2.5">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-white/55">
                  {label}
                </dt>
                <dd className="mt-1 text-lg font-bold tabular-nums">{attention[key]}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

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

      <section
        className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-stone-200 bg-white px-5 py-3.5 shadow-sm"
        aria-label="Secondary project summary"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
          Portfolio totals
        </p>
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

      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <section
          className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
          aria-labelledby="portfolio-summaries-title"
        >
          <div className="border-b border-stone-100 pb-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-botanique-green">
              Live portfolio
            </p>
            <h2 id="portfolio-summaries-title" className="mt-1 text-lg font-bold">
              Project composition
            </h2>
          </div>
          <div className="mt-4 grid gap-5 md:grid-cols-3 md:divide-x md:divide-stone-100">
            <BarChart
              title="By status"
              data={projectsByStatus(projects)}
              hrefFor={(row) => `/admin/projects?status=${encodeURIComponent(row.label)}`}
              embedded
            />
            <div className="md:pl-5">
              <BarChart
                title="By stage"
                data={projectsByStage(projects)}
                hrefFor={(row) => `/admin/projects?stage=${encodeURIComponent(row.label)}`}
                embedded
              />
            </div>
            <div className="md:pl-5">
              <BarChart
                title="By type"
                data={projectsByType(projects)}
                hrefFor={(row) =>
                  `/admin/projects?projectType=${encodeURIComponent(row.label)}`
                }
                embedded
              />
            </div>
          </div>
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
