// BD-REPORTS-01A — project selector.
//
// Backed by the ordinary projects read under the caller's own RLS, so the list
// is exactly the set of projects the reader may already see: the Principal
// company-wide; a manager only projects they lead or are actively assigned to;
// assigned staff only their assigned projects. An unassigned, non-lead manager
// never receives a project row, so Reports cannot offer one.
//
// Completed, paused and historical projects are included wherever RLS permits
// them, because they still hold reportable records. No project is hard-coded in
// or out, and internal_cost_claim_authorised_projects() is deliberately not
// used here — it is limited to ongoing projects and excludes fixed identifiers.
//
// The project NAME is the human identifier. No project number is invented and
// no database identifier is shown as a label.
export default function ReportProjectSelector({ projects, selectedProjectId, onSelect, disabled = false }) {
  return (
    <label className="block text-sm font-medium text-botanique-charcoal">
      Project
      <select
        value={selectedProjectId || ""}
        onChange={(event) => onSelect(event.target.value)}
        disabled={disabled}
        className="mt-1 block min-h-11 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm disabled:bg-stone-100"
      >
        <option value="">Choose a project…</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.projectName}
            {project.archived ? " (archived)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
