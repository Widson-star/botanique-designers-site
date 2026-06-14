import { Link, NavLink, Outlet } from "react-router-dom";
import { ROLE_LABELS } from "./constants/roles";

function navClass({ isActive }) {
  return `rounded-md px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-botanique-green text-white"
      : "text-gray-600 hover:bg-botanique-beige hover:text-botanique-green"
  }`;
}

export default function AdminLayout({ role, profileLabel, isDemo, onSignOut }) {
  return (
    <div className="min-h-screen bg-stone-100 text-botanique-charcoal">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Link to="/admin" className="text-lg font-bold text-botanique-charcoal">
              Botanique Admin
            </Link>
            <p className="text-xs text-gray-500 mt-1">
              {isDemo
                ? "Dev-only seed preview. Supabase Auth + RLS required before real data."
                : "Authenticated project tracker. Database access is enforced by Supabase RLS."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-botanique-beige px-3 py-1 text-xs font-semibold text-botanique-green">
              {ROLE_LABELS[role] || role}
            </span>
            <span className="text-xs text-gray-500">{profileLabel}</span>
            <button
              type="button"
              onClick={onSignOut}
              className="rounded-md border border-stone-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-stone-50 transition cursor-pointer"
            >
              {isDemo ? "Switch preview" : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-5">
        <nav className="flex flex-wrap gap-2 mb-5" aria-label="Admin navigation">
          <NavLink to="/admin" end className={navClass}>
            Dashboard
          </NavLink>
          <NavLink to="/admin/projects" className={navClass}>
            Projects
          </NavLink>
        </nav>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-5">
          {isDemo
            ? "This admin area is not linked from the public website. This dev preview is not real authentication; do not enter real operational data."
            : "This admin area is not linked from the public website. Financial references are owner-only and enforced by separate RLS-protected queries."}
        </div>

        <Outlet />
      </div>
    </div>
  );
}
