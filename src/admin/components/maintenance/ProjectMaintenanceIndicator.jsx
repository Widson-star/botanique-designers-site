// Compact, READ-ONLY cross-domain summary for the Project detail page. Shows
// nothing when the project has no live Maintenance relationship — a
// truthful absence, never an invented one. The actual Maintenance workflow
// lives under Operations > Maintenance; this is a link into it, not a
// duplicate of it. A Completed project renders this exactly the same as an
// Ongoing one — nothing here reopens or reinterprets the project's own
// status.
import { Link } from "react-router-dom";
import { useMaintenance } from "../../context/maintenance";
import { canSeeMaintenance, relationshipStatusLabel } from "../../utils/maintenanceCapabilities";

const showDate = (value) => (value
  ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`))
  : "Not scheduled");

export default function ProjectMaintenanceIndicator({ project, role }) {
  const { summaryForProject } = useMaintenance();

  if (!canSeeMaintenance(role)) return null;
  const summary = summaryForProject(project.id);
  if (!summary) return null;

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5" aria-labelledby="project-maintenance-title">
      <div className="flex items-center justify-between">
        <h2 id="project-maintenance-title" className="text-base font-semibold">Maintenance</h2>
        <Link to={`/admin/maintenance/${summary.id}`} className="text-xs font-semibold text-botanique-green hover:underline">
          View →
        </Link>
      </div>
      <p className="mt-2 text-sm font-medium text-botanique-charcoal">
        {relationshipStatusLabel(summary.status)}
      </p>
      <p className="mt-0.5 text-xs text-gray-500">Next visit: {showDate(summary.nextVisitDate)}</p>
    </section>
  );
}
