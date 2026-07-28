import { approvalComparison } from "../../utils/approvalFormatters";

export default function ApprovalComparison({ request }) {
  const rows = approvalComparison(request);
  return (
    <div className="overflow-hidden rounded-md border border-stone-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-stone-50 text-xs text-gray-500">
          <tr>
            <th className="px-3 py-2 font-medium">Field</th>
            <th className="px-3 py-2 font-medium">Current</th>
            <th className="px-3 py-2 font-medium">Proposed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((row) => (
            <tr key={row.key}>
              <th className="px-3 py-2 font-medium text-gray-600">{row.label}</th>
              <td className="px-3 py-2 text-gray-600">{row.before}</td>
              <td className="px-3 py-2 font-medium text-botanique-charcoal">{row.proposed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
