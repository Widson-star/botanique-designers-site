import {
  PAYMENT_STATUSES,
  PORTFOLIO_PERMISSION_STATUSES,
  PROJECT_STAGES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
} from "../constants/projectStatus";
import { canViewFinancialReferences } from "../utils/permissions";

function SelectFilter({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-botanique-green focus:outline-none"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function ProjectFilters({ filters, setFilters, leadPeople, role }) {
  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4">
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="block md:col-span-2">
          <span className="block text-xs font-medium text-gray-500 mb-1">Search</span>
          <input
            type="search"
            value={filters.search}
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder="Search projects, site labels, location..."
            className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm focus:border-botanique-green focus:outline-none"
          />
        </label>

        <SelectFilter label="Status" value={filters.status} onChange={(value) => updateFilter("status", value)} options={PROJECT_STATUSES} />
        <SelectFilter label="Stage" value={filters.stage} onChange={(value) => updateFilter("stage", value)} options={PROJECT_STAGES} />
        <SelectFilter label="Lead person" value={filters.leadPerson} onChange={(value) => updateFilter("leadPerson", value)} options={leadPeople} />
        <SelectFilter label="Project type" value={filters.projectType} onChange={(value) => updateFilter("projectType", value)} options={PROJECT_TYPES} />
        <SelectFilter label="Portfolio" value={filters.portfolioPermissionStatus} onChange={(value) => updateFilter("portfolioPermissionStatus", value)} options={PORTFOLIO_PERMISSION_STATUSES} />

        {canViewFinancialReferences(role) && (
          <SelectFilter label="Payment" value={filters.paymentStatus} onChange={(value) => updateFilter("paymentStatus", value)} options={PAYMENT_STATUSES} />
        )}
      </div>
    </div>
  );
}
