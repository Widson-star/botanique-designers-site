// Dashboard composition, governed by
// `docs/ui-authority/operations-hub/01-dashboard-authority.png`.
//
// The screen's structure is: a compact header; ONE metrics card carrying the
// four KPIs with the portfolio totals inside it; TWO short action panels side
// by side; then THREE compact visual cards in one row. Every figure is still
// computed by `dashboardMetrics` from the records this role can already see —
// the screen changed how the Dashboard is composed, not what it may claim.
//
// Deliberately NOT taken from the screen: the grouped sidebar (still gated by
// Blueprint §5), and any "View full report" link, because no such destination
// is built. Rule 7 of the authority pack: an image is never a licence to show
// something the system cannot truthfully deliver.
import { Link } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { canCreateProjects, canSeePendingActivation } from "../utils/projectCapabilities";
import { greetingFirstName } from "../utils/personName";
import { dashboardGreeting } from "../utils/greeting";
import {
  calculateDashboardMetrics,
  projectsByStage,
  projectsByStatus,
  projectsByType,
} from "../utils/dashboardMetrics";
import StatCard from "../components/StatCard";
import ProjectAttentionList from "../components/ProjectAttentionList";
import RecentActivity from "../components/RecentActivity";
import MorningComplianceCard from "../components/dailysite/MorningComplianceCard";
import { canSeeDailySiteOperations } from "../utils/dailySiteCapabilities";
import {
  ProjectTypeSummary,
  StageColumnChart,
  StatusDoughnutChart,
} from "../components/DashboardVisualizations";

// KPI glyphs, matching the authority screen's icon tiles. Each is a plain path
// on the shared 20x20 grid already used by the shell's navigation icons.
const KPI_ICONS = {
  active: "M4 6.5h12v9H4v-9Zm4-2h4v2H8v-2Z",
  pending: "M10 5.5v4.5l3 1.75M10 3.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Z",
  overdue: "M10 6.5v4m0 2.5h.01M10 3.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Z",
  upcoming: "M6.5 3v2.5m7-2.5v2.5M3.5 8h13M4.5 5.5h11a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z",
};

export default function AdminDashboard() {
  const {
    role,
    projects,
    profilesById,
    dataStatus,
    dataError,
    fetchActivities,
    profile,
    profileLabel,
  } = useAdminData();
  const showPendingActivation = canSeePendingActivation(role);
  const metrics = calculateDashboardMetrics(projects);
  const showNewProject = canCreateProjects(role);
  const showDailySite = canSeeDailySiteOperations(role);
  // Operating-model authority: a live, Africa/Nairobi-local greeting using the
  // authenticated profile's first name, degrading gracefully to a plain
  // time-of-day phrase when no usable given name can be resolved.
  const greeting = dashboardGreeting(greetingFirstName(profile, profileLabel));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{greeting}</h1>
          {/* One short supporting line. The long generated paragraph that used
              to sit here restated the KPI strip immediately below it, and the
              separate "Portfolio notes" card only explained that filters
              filter. Both are gone; this single line carries the one fact
              neither of them made clear — that everything on this page is
              scoped to what this account is permitted to see. */}
          <p className="mt-1.5 text-sm text-gray-500">
            {projects.length === 0
              ? "No project data is available yet."
              : "Operations overview — here's what's happening across the projects you can see."}
          </p>
        </div>
        {showNewProject && (
          <Link
            to="/admin/projects/new"
            className="inline-flex shrink-0 items-center justify-center rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white transition hover:bg-botanique-dark"
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

      {/* One metrics surface: the four KPIs, with the portfolio totals inside
          the same card rather than floating loose beneath it, exactly as the
          authority screen groups them. */}
      <section aria-label="Primary project indicators">
        <div
          className="grid grid-cols-2 overflow-hidden rounded-t-lg border border-stone-200 bg-white lg:grid-cols-4"
          role="group"
          aria-label="Management metrics"
        >
          <StatCard
            label="Active projects"
            value={metrics.active}
            href="/admin/projects?view=active"
            hint="Ongoing or paused"
            icon={KPI_ICONS.active}
            className="border-b border-r border-stone-200 lg:border-b-0"
          />
          <StatCard
            label={showPendingActivation ? "Pending activation" : "Pending projects"}
            value={showPendingActivation ? metrics.pendingActivation : metrics.pending}
            href={
              showPendingActivation
                ? "/admin/projects?view=pending-activation"
                : "/admin/projects?view=pending"
            }
            hint={showPendingActivation ? "Awaiting approval" : "Not yet started"}
            icon={KPI_ICONS.pending}
            tone="attention"
            className="border-b border-stone-200 lg:border-b-0 lg:border-r"
          />
          {/* Red is reserved for genuine urgency, and an overdue action is the
              one KPI that qualifies. At zero it stays neutral. */}
          <StatCard
            label="Overdue actions"
            value={metrics.overdueActions}
            href="/admin/projects?view=overdue-actions"
            hint="Require attention"
            icon={KPI_ICONS.overdue}
            tone="urgent"
            className="border-r border-stone-200"
          />
          <StatCard
            label="Upcoming starts"
            value={metrics.upcomingStarts}
            href="/admin/projects?view=upcoming-starts"
            hint="Pending with a start date"
            icon={KPI_ICONS.upcoming}
          />
        </div>
        <div
          className="flex flex-wrap items-center gap-x-6 gap-y-1.5 rounded-b-lg border border-t-0 border-stone-200 bg-white px-4 py-3 sm:px-5"
          aria-label="Portfolio totals"
        >
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
        </div>
      </section>

      {/* Two short action panels, side by side from `lg` up. Below that they
          stack, which is the useful mobile order: what must be done today,
          then what is drifting. */}
      {/* `items-start` matters here. The two panels hold different numbers of
          rows, and stretching the shorter one to match left a large empty
          region inside it — measured at 160px on the Principal's portfolio,
          which is exactly the "giant blank region" the authority pack
          prohibits. Each panel now ends where its content ends. */}
      <div
        className={`grid min-w-0 items-start gap-4 ${showDailySite ? "lg:grid-cols-2" : ""}`}
        data-dashboard-action-panels
      >
        {showDailySite && <MorningComplianceCard role={role} />}
        <ProjectAttentionList projects={projects} role={role} />
      </div>

      {/* Three compact visual cards in one row, as the authority screen shows.
          Each is an independent card with `min-w-0`, so none can force another
          — or the page — wider than the viewport. */}
      <div className="grid min-w-0 gap-4 lg:grid-cols-3" data-dashboard-visual-cards>
        <section className="min-w-0 rounded-lg border border-stone-200 bg-white p-5">
          <StatusDoughnutChart data={projectsByStatus(projects)} />
        </section>
        <section className="min-w-0 rounded-lg border border-stone-200 bg-white p-5">
          <StageColumnChart data={projectsByStage(projects)} />
        </section>
        <RecentActivity
          projects={projects}
          profilesById={profilesById}
          fetchActivities={fetchActivities}
        />
      </div>

      <ProjectTypeSummary data={projectsByType(projects)} />
    </div>
  );
}
