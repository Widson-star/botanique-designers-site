// Initial live project dashboard. Every KPI and chart is computed from the
// currently visible live project records (see dashboardMetrics). No fabricated
// figures; empty data renders "No data yet". Cards/charts link into filtered
// Projects views via URL search parameters.
import { Link } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { canSeePendingActivation } from "../utils/projectCapabilities";
import {
  calculateDashboardMetrics,
  projectsByStage,
  projectsByStatus,
  projectsByType,
} from "../utils/dashboardMetrics";
import StatCard from "../components/StatCard";
import BarChart from "../components/BarChart";
import PendingActivationList from "../components/PendingActivationList";

export default function AdminDashboard() {
  const { role, projects, dataStatus, dataError } = useAdminData();
  const metrics = calculateDashboardMetrics(projects);
  const showPendingActivation = canSeePendingActivation(role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Live operational overview for Botanique Designers projects.
          </p>
        </div>
        <Link
          to="/admin/projects/new"
          className="inline-flex rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white hover:bg-botanique-dark transition"
        >
          New project
        </Link>
      </div>

      {dataStatus === "loading" && (
        <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-gray-600">
          Loading project records…
        </div>
      )}

      {dataStatus === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {dataError || "Unable to load project records."}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total projects" value={metrics.total} href="/admin/projects" />
        <StatCard label="Active" value={metrics.active} href="/admin/projects?status=Ongoing" hint="Ongoing or Paused" />
        <StatCard label="Pending" value={metrics.pending} href="/admin/projects?status=Pending" />
        <StatCard label="Completed" value={metrics.completed} href="/admin/projects?status=Completed" />
        <StatCard label="Overdue actions" value={metrics.overdueActions} href="/admin/projects" />
        <StatCard label="Upcoming starts" value={metrics.upcomingStarts} href="/admin/projects?status=Pending" />
        {showPendingActivation && (
          <StatCard label="Pending activation" value={metrics.pendingActivation} href="/admin/projects?status=Pending" />
        )}
      </div>

      {showPendingActivation && <PendingActivationList projects={projects} />}

      <div className="grid lg:grid-cols-3 gap-5">
        <BarChart
          title="Projects by status"
          data={projectsByStatus(projects)}
          hrefFor={(row) => `/admin/projects?status=${encodeURIComponent(row.label)}`}
        />
        <BarChart
          title="Projects by stage"
          data={projectsByStage(projects)}
          hrefFor={(row) => `/admin/projects?stage=${encodeURIComponent(row.label)}`}
        />
        <BarChart
          title="Projects by type"
          data={projectsByType(projects)}
          hrefFor={(row) => `/admin/projects?projectType=${encodeURIComponent(row.label)}`}
        />
      </div>

      <section className="bg-white border border-stone-200 rounded-lg p-5">
        <h2 className="font-bold text-lg mb-2">Simple Invoice boundary</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Financial documents remain managed in Simple Invoice Manager. This Operations Hub
          creates no invoices, estimates, receipts, PDFs, document numbers, or payments.
        </p>
      </section>
    </div>
  );
}
