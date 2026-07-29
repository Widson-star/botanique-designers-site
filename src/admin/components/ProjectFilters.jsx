// Project list filters. State is owned by the Projects route (synced to URL
// search parameters) so dashboard/chart links can open filtered views.
import {
  PORTFOLIO_PUBLICATION_OPTIONS,
  PROJECT_STAGES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
} from "../constants/projectStatus";
import { isOwner } from "../utils/projectCapabilities";
import { profilePresentationName } from "../utils/personName";

function SelectFilter({ label, value, onChange, options, allLabel = "All" }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-botanique-green focus:outline-none"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value ?? option} value={option.value ?? option}>
            {option.label ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function ProjectFilters({ filters, updateFilter, resetFilters, leadOptions, role }) {
  const leadSelectOptions = [
    { value: "unassigned", label: "Unassigned" },
    ...leadOptions.map((option) => ({
      value: option.id,
      label: profilePresentationName(option, "Team member"),
    })),
  ];

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4">
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="block md:col-span-2">
          <span className="block text-xs font-medium text-gray-500 mb-1">Search</span>
          <input
            type="search"
            value={filters.search}
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder="Search projects, site labels, location…"
            className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm focus:border-botanique-green focus:outline-none"
          />
        </label>

        <SelectFilter label="Status" value={filters.status} onChange={(v) => updateFilter("status", v)} options={PROJECT_STATUSES} />
        <SelectFilter label="Stage" value={filters.stage} onChange={(v) => updateFilter("stage", v)} options={PROJECT_STAGES} />
        <SelectFilter label="Accountable lead" value={filters.lead} onChange={(v) => updateFilter("lead", v)} options={leadSelectOptions} />
        <SelectFilter label="Project type" value={filters.projectType} onChange={(v) => updateFilter("projectType", v)} options={PROJECT_TYPES} />

        {isOwner(role) && (
          <SelectFilter
            label="Portfolio status"
            value={filters.portfolio}
            onChange={(v) => updateFilter("portfolio", v)}
            options={PORTFOLIO_PUBLICATION_OPTIONS}
          />
        )}

        <SelectFilter
          label="Archived state"
          value={filters.archived}
          onChange={(v) => updateFilter("archived", v)}
          options={[
            { value: "active", label: "Active only" },
            { value: "archived", label: "Archived only" },
          ]}
          allLabel="All"
        />
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={resetFilters}
          className="text-xs font-semibold text-botanique-green hover:underline"
        >
          Reset filters
        </button>
      </div>
    </div>
  );
}
