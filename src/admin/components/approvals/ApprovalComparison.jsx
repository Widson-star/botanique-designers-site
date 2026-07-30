import { approvalComparison } from "../../utils/approvalFormatters";

// Field-by-field diff (never raw JSON). Pass `profilesById` to resolve an
// accountable-lead UUID to a name, and the live `project` to show the current
// value and flag a stale row (live value drifted from the captured original).
export default function ApprovalComparison({ request, profilesById = null, project = null }) {
  const rows = approvalComparison(request, { profilesById, project });
  const showCurrent = rows.some((row) => Object.prototype.hasOwnProperty.call(row, "current"));
  const anyStale = rows.some((row) => row.stale);
  return (
    <div className="overflow-x-auto rounded-md border border-stone-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-stone-50 text-xs text-gray-500">
          <tr>
            <th className="px-3 py-2 font-medium">Field</th>
            <th className="px-3 py-2 font-medium">At submission</th>
            {showCurrent && <th className="px-3 py-2 font-medium">Current</th>}
            <th className="px-3 py-2 font-medium">Proposed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((row) => (
            <tr key={row.key} className={row.stale ? "bg-amber-50" : undefined}>
              <th className="px-3 py-2 font-medium text-gray-600">{row.label}</th>
              <td className="px-3 py-2 text-gray-600">{row.before}</td>
              {showCurrent && (
                <td className={`px-3 py-2 ${row.stale ? "font-medium text-amber-800" : "text-gray-600"}`}>
                  {row.current}
                  {row.stale && <span className="ml-1 text-xs">(changed)</span>}
                </td>
              )}
              <td className="px-3 py-2 font-medium text-botanique-charcoal">{row.proposed}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {anyStale && (
        <p className="border-t border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" role="status">
          The live project changed since this proposal was submitted. Approving now is
          blocked as stale — request an amendment or reject.
        </p>
      )}
    </div>
  );
}
