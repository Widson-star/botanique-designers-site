// Phase 1B-A2 admin shell: persistent desktop sidebar, responsive mobile drawer,
// top bar with authenticated profile, role badge, and a project search that
// navigates to the real Projects screen via URL search parameters.
//
// Only working destinations are exposed (Dashboard, Projects). No disabled or
// decorative links, no notifications icon (notifications do not exist yet).
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { ROLE_LABELS } from "./constants/roles";
import SaveFeedback from "./components/SaveFeedback";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/projects", label: "Projects", end: false },
];

function navItemClass({ isActive }) {
  return `flex items-center rounded-md px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-botanique-green text-white"
      : "text-gray-600 hover:bg-botanique-beige hover:text-botanique-green"
  }`;
}

function NavItems({ onNavigate }) {
  return (
    <nav className="space-y-1" aria-label="Admin sections">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={navItemClass}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function ProjectSearch({ id }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = term.trim();
    navigate(trimmed ? `/admin/projects?search=${encodeURIComponent(trimmed)}` : "/admin/projects");
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md" role="search">
      <label htmlFor={id} className="sr-only">
        Search projects
      </label>
      <input
        id={id}
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Search projects…"
        className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-botanique-green focus:outline-none focus:ring-2 focus:ring-botanique-green/30"
      />
    </form>
  );
}

export default function AdminLayout({ role, profileLabel, isDemo, onSignOut }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef(null);
  const roleLabel = ROLE_LABELS[role] || role;

  // Close the mobile drawer on Escape for keyboard operability.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    drawerRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  return (
    <div className="min-h-screen bg-stone-100 text-botanique-charcoal">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to main content
      </a>

      <div className="lg:flex">
        {/* Persistent desktop sidebar */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-stone-200 bg-white">
          <div className="px-5 py-5 border-b border-stone-200">
            <Link to="/admin" className="text-lg font-bold text-botanique-charcoal">
              Botanique Operations
            </Link>
            <p className="mt-1 text-xs text-gray-500">
              {isDemo ? "Dev preview" : "Operations Hub"}
            </p>
          </div>
          <div className="flex-1 px-3 py-4">
            <NavItems />
          </div>
          <div className="px-5 py-4 border-t border-stone-200 text-xs text-gray-400">
            Financial documents remain in Simple Invoice Manager.
          </div>
        </aside>

        <div className="lg:pl-64 flex-1 min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
            <div className="flex items-center gap-3 px-4 md:px-6 py-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="lg:hidden rounded-md border border-stone-200 p-2 text-gray-600 hover:bg-stone-50"
                aria-label="Open navigation menu"
                aria-expanded={drawerOpen}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>

              <div className="hidden sm:block flex-1">
                <ProjectSearch id="admin-project-search-desktop" />
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <span className="rounded-full bg-botanique-beige px-3 py-1 text-xs font-semibold text-botanique-green">
                  {roleLabel}
                </span>
                <span className="hidden md:inline text-xs text-gray-500 max-w-[12rem] truncate">
                  {profileLabel}
                </span>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="rounded-md border border-stone-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-stone-50 transition"
                >
                  {isDemo ? "Switch preview" : "Sign out"}
                </button>
              </div>
            </div>
            <div className="sm:hidden px-4 pb-3">
              <ProjectSearch id="admin-project-search-mobile" />
            </div>
          </header>

          <main id="admin-main" className="px-4 md:px-6 py-5 max-w-6xl mx-auto" tabIndex={-1}>
            {isDemo && (
              <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Dev preview only. This is not real authentication and no change here is saved to Supabase.
              </div>
            )}
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className="absolute inset-y-0 left-0 w-72 max-w-[80%] bg-white shadow-xl p-5 focus:outline-none"
          >
            <div className="flex items-center justify-between mb-5">
              <span className="text-lg font-bold">Botanique Operations</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-md border border-stone-200 p-2 text-gray-600 hover:bg-stone-50"
                aria-label="Close navigation menu"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <NavItems onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <SaveFeedback />
    </div>
  );
}
