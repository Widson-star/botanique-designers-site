// Phase 1B-A2 admin shell: persistent desktop sidebar, responsive mobile drawer,
// top bar with authenticated profile, role badge, and a project search that
// navigates to the real Projects screen via URL search parameters.
//
// Only working destinations are exposed. No disabled or decorative links.
//
// BD-INBOX-01 (Stage 3) adds the Work Inbox destination and an unread count on
// it. There is still NO notification bell, dropdown or notification centre:
// event-backed notification history is a later, separately authorised
// capability, and nothing in the shell may imply it exists.
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { ROLE_LABELS } from "./constants/roles";
import SaveFeedback from "./components/SaveFeedback";
import { profilePresentationName } from "./utils/personName";
import { canSeeApprovals } from "./utils/approvalCapabilities";
import { canManageStaff } from "./utils/permissions";
import { canSeeDailySiteOperations } from "./utils/dailySiteCapabilities";
import { canSeeSiteCosts } from "./utils/siteCostCapabilities";
import { canSeeFundRequests } from "./utils/fundRequestCapabilities";
import { canSeeReports } from "./utils/reportCapabilities";
import { canSeeWorkInbox } from "./utils/workInboxCapabilities";
import { useWorkInboxUnread } from "./utils/useWorkInboxUnread";
import { useAdminData } from "./context/adminData";

const NAV_ITEMS = [
  {
    to: "/admin",
    label: "Dashboard",
    end: true,
    icon: "M3 10.5 10 4l7 6.5V17a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1v-6.5Z",
  },
  {
    // BD-INBOX-01 (Stage 3). Placed directly after Dashboard because it is the
    // authoritative place for what needs attention: a reader who opens the
    // portal to find out what to do next should reach it first.
    to: "/admin/work-inbox",
    label: "Work Inbox",
    end: false,
    capability: canSeeWorkInbox,
    icon: "M3 11.5h4l1.5 2h3l1.5-2h4M3.5 11.5 5 5.5h10l1.5 6v4a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-4Z",
  },
  {
    to: "/admin/projects",
    label: "Projects",
    end: false,
    icon: "M4 5.5h12v11H4v-11Zm3-2h6v2H7v-2Z",
  },
  {
    to: "/admin/project-intakes",
    label: "Project intakes",
    end: false,
    capability: canManageStaff,
    icon: "M10 3.5v13M3.5 10h13",
  },
  {
    to: "/admin/daily-site-operations",
    // BD-REPORTS-01B navigation review: "Daily site ops" was the only
    // abbreviated label in the sidebar, and it did not match the destination,
    // which titles itself "Daily site operations". The remaining naming
    // findings — mixed sentence and title case, and the transitional Site
    // Costs / Fund Requests names — are recorded in WORKSTREAMS.md and remain
    // deferred to the gated progressive navigation stage, because each needs
    // authority this workstream does not hold.
    label: "Daily site operations",
    end: false,
    capability: canSeeDailySiteOperations,
    icon: "M6 3v2m8-2v2M3.5 7.5h13M4.5 5.5h11a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z",
  },
  {
    to: "/admin/site-costs",
    label: "Site Costs",
    end: false,
    capability: canSeeSiteCosts,
    icon: "M4 5h12v10H4V5Zm3 3h6M7 11h4",
  },
  {
    to: "/admin/fund-requests",
    label: "Fund Requests",
    end: false,
    capability: canSeeFundRequests,
    icon: "M10 3v14M6.5 6.5h5a2 2 0 0 1 0 4h-3a2 2 0 0 0 0 4h5",
  },
  {
    to: "/admin/approvals",
    label: "Approvals",
    end: false,
    capability: canSeeApprovals,
    icon: "M5 10.5 8.25 14 15 6.5M3.5 3.5h13v13h-13v-13Z",
  },
  {
    to: "/admin/reports",
    // The route keeps its `/admin/reports` path — removing or moving it would
    // break every link already in use — but the DESTINATION is no longer
    // presented as Reports. The Founder rejected the Reports information
    // architecture on 2 August 2026, and the page that ships today is a
    // provisional single-project summary, not the Reports Centre. The
    // category-based Reports Centre is deferred to the expanded management
    // reporting stage; until it exists, nothing in the shell may claim the
    // Reports product has been delivered.
    label: "Project Summary",
    end: false,
    capability: canSeeReports,
    icon: "M4 16V8m4 8V5m4 11v-6m4 6V9M3 17h14",
  },
];

function navItemClass({ isActive }) {
  return `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
    isActive
      ? "bg-[#edf2ef] text-botanique-green"
      : "text-gray-600 hover:bg-stone-100 hover:text-botanique-charcoal"
  }`;
}

function NavItems({ onNavigate, role, inboxUnread }) {
  return (
    <nav className="space-y-1" aria-label="Admin sections">
      {NAV_ITEMS.filter((item) => !item.capability || item.capability(role)).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={navItemClass}
        >
          <svg
            className="h-4 w-4 shrink-0"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {item.label}
          {item.to === "/admin/work-inbox" && inboxUnread > 0 && (
            <span
              className="ml-auto rounded-full bg-botanique-green px-2 py-0.5 text-xs font-semibold text-white"
              aria-label={`${inboxUnread} new ${inboxUnread === 1 ? "item" : "items"} needing action`}
            >
              {inboxUnread}
            </span>
          )}
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
    <form onSubmit={handleSubmit} className="relative w-full max-w-lg" role="search">
      <label htmlFor={id} className="sr-only">
        Search projects
      </label>
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <circle cx="8.5" cy="8.5" r="5.5" />
        <path d="m13 13 4 4" strokeLinecap="round" />
      </svg>
      <input
        id={id}
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Search projects…"
        className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-3 text-sm transition focus:border-botanique-green focus:bg-white focus:outline-none focus:ring-2 focus:ring-botanique-green/20"
      />
    </form>
  );
}

export default function AdminLayout({ role, profile, profileLabel, isDemo, onSignOut }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef(null);
  const roleLabel = ROLE_LABELS[role] || role;
  const { accessToken, currentUserId } = useAdminData();
  const inboxUnread = useWorkInboxUnread({ accessToken, role, currentUserId, isDemo });
  const visibleProfileLabel = profile
    ? profilePresentationName(profile)
    : profileLabel || "Authenticated admin";

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
    <div className="admin-shell min-h-screen bg-[#f6f7f4] text-botanique-charcoal">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to main content
      </a>

      <div className="lg:flex">
        {/* Persistent desktop sidebar */}
        <aside className="hidden border-r border-stone-200 bg-white lg:fixed lg:inset-y-0 lg:flex lg:w-56 lg:flex-col">
          <div className="border-b border-stone-200 px-5 py-4">
            <Link to="/admin" className="text-lg font-semibold text-botanique-charcoal">
              Botanique
            </Link>
            <p className="mt-0.5 text-xs text-gray-500">
              Operations Hub
            </p>
          </div>
          <div className="flex-1 px-3 py-5">
            <NavItems role={role} inboxUnread={inboxUnread} />
          </div>
          <div className="border-t border-stone-200 px-5 py-4 text-[11px] leading-relaxed text-gray-400">
            Financial documents remain managed in Simple Invoice Manager.
          </div>
        </aside>

        <div className="min-w-0 flex-1 lg:pl-56">
          {/* Top bar */}
          <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
            <div className="flex items-center gap-3 px-4 py-2.5 md:px-6">
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

              <div className="hidden flex-1 sm:block">
                <ProjectSearch id="admin-project-search-desktop" />
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <span className="border-l-2 border-botanique-green pl-2 text-xs font-medium text-botanique-green">
                  {roleLabel}
                </span>
                <span className="hidden whitespace-nowrap text-xs font-medium text-gray-600 md:inline">
                  {visibleProfileLabel}
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

          <main id="admin-main" className="mx-auto max-w-[88rem] px-4 py-5 md:px-6 lg:py-6" tabIndex={-1}>
            {isDemo && (
              <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
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
            className="absolute inset-y-0 left-0 flex w-72 max-w-[80%] flex-col bg-white p-5 text-botanique-charcoal shadow-xl focus:outline-none"
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
            <NavItems role={role} inboxUnread={inboxUnread} onNavigate={() => setDrawerOpen(false)} />
            <p className="mt-auto border-t border-stone-200 pt-4 text-[11px] leading-relaxed text-gray-400">
              Financial documents remain managed in Simple Invoice Manager.
            </p>
          </div>
        </div>
      )}

      <SaveFeedback />
    </div>
  );
}
