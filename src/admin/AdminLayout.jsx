// Operating-model admin shell: the corrected navigation domains, a 104px
// collapsible desktop rail and a mobile drawer using the same in-place
// disclosures.
//
// Visual authority: docs/ui-authority/operations-hub/operating-model-authority/
// (Founder-approved, merged PR #93), which supersedes the collapsed rail,
// Finance, Approvals and People placement Stage 6 shipped
// (docs/ui-authority/operations-hub/stage-6-navigation-authority/, PR #92).
//
// Grouping is presentation only. Every destination keeps its existing route
// (Finance is the one new shell destination — see ./navigation.js), and every
// child is gated by the SAME capability function the flat sidebar used, so no
// role gains or loses a destination here. Row level security remains the real
// boundary. See ./navigation.js.
//
// Two things deliberately do NOT live in the URL: which group is open, and
// whether the sidebar is collapsed. Opening a group is local shell state, so a
// disclosure never pushes a history entry and browser back/forward continue to
// move between pages only.
//
// BD-ALERTS-01 still applies: attention items reach the reader through the
// header bell, never as a navigation destination, and this is not a
// notification centre.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ROLE_LABELS } from "./constants/roles";
import SaveFeedback from "./components/SaveFeedback";
import AlertsBell from "./components/AlertsBell";
import { resolveDisplayName } from "./utils/personName";
import { useAlerts } from "./utils/useAlerts";
import { useAdminData } from "./context/adminData";
import { resolveActive, visibleDomains } from "./navigation";

const COLLAPSE_KEY = "botanique.admin.sidebarCollapsed";

function readCollapsePreference() {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false; // storage unavailable — stay expanded
  }
}

function Icon({ path, className = "h-[17px] w-[17px] shrink-0" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Company identity: the official, unaltered public/botanique.png asset — the
// same file already used on the public site (Header.jsx, Footer.jsx). Product
// identity ("Operations Hub") sits subordinate beside it. Operating-model
// authority: no reconstructed/retyped "BOTANIQUE DESIGNERS" text, no invented
// compact logo or monogram, at any size.
function BrandMark({ collapsed }) {
  if (collapsed) {
    // 60x74px (height x width), the asset's 1440:1163 ratio, never stretched
    // or cropped. No product label at this width — there is no room for it,
    // and the badge alone stays recognisable.
    return (
      <img
        src="/botanique.png"
        alt="Botanique Designers"
        className="h-[60px] w-[74px] shrink-0 object-contain"
      />
    );
  }
  return (
    <span className="flex items-center gap-2.5">
      <img src="/botanique.png" alt="Botanique Designers" className="h-10 w-auto shrink-0" />
      <span className="text-[13px] font-semibold tracking-[0.02em] text-gray-500">
        Operations Hub
      </span>
    </span>
  );
}

const ROW_BASE =
  "group relative flex items-center gap-3 rounded-[9px] px-3 text-[14.5px] font-semibold transition";
const ROW_IDLE = "text-[#3d4a4f] hover:bg-stone-100/70";
const ROW_ACTIVE = "bg-[#ecefe9] text-botanique-green";
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-botanique-green focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf9f8]";

// The collapsed rail has no visible text, so every icon-only row carries its
// destination name as an accessible name AND surfaces it visibly on hover and
// on keyboard focus.
function RailLabel({ children }) {
  return (
    <span
      className="pointer-events-none absolute left-[56px] top-1/2 z-20 hidden -translate-y-1/2 whitespace-nowrap rounded-[9px] border border-stone-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-botanique-charcoal shadow-[0_6px_18px_rgba(31,41,51,0.10)] group-hover:block group-focus-visible:block"
      role="presentation"
    >
      {children}
    </span>
  );
}

// `touch` is set for the mobile drawer, where every row must stay at or above
// the 44px minimum tap size. The desktop sidebar keeps the authority's tighter
// 41px/36px rhythm, which is pointer-driven.
function NavTree({ role, collapsed, activeDomainId, openDomain, onToggleDomain, onNavigate, idPrefix, touch }) {
  const domains = useMemo(() => visibleDomains(role), [role]);
  const domainRow = touch ? "h-[46px]" : "h-[41px]";
  const childRow = touch ? "h-11" : "h-9";

  return (
    // 12px between rows on a 41px row gives the authority's 53px pitch.
    <nav className="space-y-3" aria-label="Admin sections">
      {domains.map((domain) => {
        if (!domain.children) {
          // A plain Link, not NavLink: active is driven entirely by
          // resolveActive()/activeDomainId, because a direct domain like
          // Finance stays "current" while viewing a drill-through page under
          // a different base path (/admin/site-costs, /admin/fund-requests —
          // see navigation.js's `matches`), which NavLink's own path-based
          // active check cannot express. NavLink also treats a caller-supplied
          // `aria-current` as the value to use only when ITS OWN check is
          // true, silently dropping it otherwise, so Link is the only way to
          // set aria-current unconditionally here.
          const isActive = domain.id === activeDomainId;
          return (
            <Link
              key={domain.id}
              to={domain.to}
              onClick={onNavigate}
              aria-label={collapsed ? domain.label : undefined}
              aria-current={isActive ? "page" : undefined}
              className={[
                ROW_BASE,
                domainRow,
                FOCUS_RING,
                isActive ? ROW_ACTIVE : ROW_IDLE,
                collapsed ? "justify-center px-0" : "",
              ].join(" ")}
            >
              <Icon path={domain.icon} />
              {collapsed ? <RailLabel>{domain.label}</RailLabel> : <span className="flex-1">{domain.label}</span>}
            </Link>
          );
        }

        const open = !collapsed && openDomain === domain.id;
        const panelId = `${idPrefix}-${domain.id}-panel`;

        return (
          <div key={domain.id}>
            <button
              type="button"
              onClick={() => onToggleDomain(domain.id)}
              aria-expanded={collapsed ? undefined : open}
              aria-controls={collapsed ? undefined : panelId}
              aria-label={collapsed ? domain.label : undefined}
              className={[
                ROW_BASE,
                domainRow,
                FOCUS_RING,
                "w-full text-left",
                open ? "text-botanique-charcoal font-bold" : ROW_IDLE,
                collapsed ? "justify-center px-0" : "",
              ].join(" ")}
            >
              <Icon path={domain.icon} />
              {collapsed ? (
                <RailLabel>{domain.label}</RailLabel>
              ) : (
                <>
                  <span className="flex-1">{domain.label}</span>
                  <Icon
                    path="M4.6 7.4 10 12.6l5.4-7.4"
                    className={`h-3 w-3 shrink-0 transition ${
                      open ? "rotate-180 text-botanique-charcoal" : "text-gray-400"
                    }`}
                  />
                </>
              )}
            </button>

            {open && (
              // 36px child rows on a 6px gap give the authority's 42px pitch.
              <div id={panelId} className="-mt-1.5 space-y-1.5 rounded-[11px] bg-[#f6f5f3] py-1.5 pl-10 pr-2">
                {domain.children.map((child) => (
                  <NavLink
                    key={child.to}
                    to={child.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      [
                        `relative flex ${childRow} items-center gap-2 rounded-lg px-2.5 text-[13.5px] transition`,
                        FOCUS_RING,
                        isActive
                          ? "bg-[#ecefe9] font-semibold text-botanique-green"
                          : "font-medium text-[#3d4a4f] hover:text-botanique-charcoal",
                      ].join(" ")
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className="flex-1">{child.label}</span>
                        {isActive && (
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-botanique-green"
                            aria-hidden="true"
                          />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function HelpCard() {
  return (
    <div className="mx-3.5 mb-2.5 flex items-center gap-2.5 rounded-[11px] border border-stone-200 bg-white px-3 py-2.5">
      <Icon path="M4 12.4v-2.2a6 6 0 0 1 12 0v2.2M2.6 13a1.5 1.5 0 0 1 1.5-1.5h.2V16h-.2A1.5 1.5 0 0 1 2.6 14.5V13Zm14.8 0v1.5A1.5 1.5 0 0 1 15.9 16h-.2v-4.5h.2A1.5 1.5 0 0 1 17.4 13Z" />
      <span>
        <span className="block text-[12.5px] font-semibold text-botanique-charcoal">Need help?</span>
        <span className="block text-[11px] text-gray-500">Contact your system admin</span>
      </span>
    </div>
  );
}

function ProjectSearch({ id, onSubmitted }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = term.trim();
    navigate(trimmed ? `/admin/projects?search=${encodeURIComponent(trimmed)}` : "/admin/projects");
    onSubmitted?.();
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-[450px]" role="search">
      <label htmlFor={id} className="sr-only">
        Search projects
      </label>
      <svg
        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <circle cx="8.9" cy="8.9" r="5.4" />
        <path d="m12.9 12.9 3.6 3.6" strokeLinecap="round" />
      </svg>
      <input
        id={id}
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Search projects, sites, people…"
        className="h-[46px] w-full rounded-[11px] border border-stone-200 bg-[#fbfbfa] pl-11 pr-3 text-sm transition focus:border-botanique-green focus:bg-white focus:outline-none focus:ring-2 focus:ring-botanique-green/20"
      />
    </form>
  );
}

// Identity follows the authority: the person's name is primary, the role is
// visually subordinate beneath it, and both sit beside a circular initials
// avatar that opens the profile menu. Below `md` the text collapses into the
// avatar, which still carries the initials, and the menu shows the full name
// and role — so which account is signed in is never unanswerable.
function ProfileMenu({ name, roleLabel, initials, isDemo, onSignOut }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointerDown(event) {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${name}, ${roleLabel}`}
        className={`flex items-center gap-2.5 rounded-lg px-1 py-1 transition hover:bg-stone-100 ${FOCUS_RING}`}
      >
        <span className="hidden text-right md:block">
          <span className="block text-sm font-semibold leading-tight text-botanique-charcoal">
            {name}
          </span>
          <span className="mt-0.5 block text-xs leading-tight text-gray-500">{roleLabel}</span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-botanique-green text-[13px] font-bold text-white">
          {initials}
        </span>
        <Icon path="M4.6 7.4 10 12.6l5.4-7.4" className="h-3 w-3 shrink-0 text-gray-400" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-40 w-60 rounded-[13px] border border-stone-200 bg-white p-1.5 shadow-[0_12px_30px_rgba(28,42,48,0.14)]"
        >
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-botanique-green text-[13px] font-bold text-white">
              {initials}
            </span>
            <span>
              <span className="block text-[14.5px] font-bold text-botanique-charcoal">{name}</span>
              <span className="mt-0.5 block text-xs text-gray-500">{roleLabel}</span>
            </span>
          </div>
          <div className="my-0.5 h-px bg-stone-100" />
          <button
            type="button"
            role="menuitem"
            onClick={onSignOut}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13.5px] font-semibold text-[#3d4a4f] transition hover:bg-stone-50 ${FOCUS_RING}`}
          >
            <Icon path="M8 16.4H5a1 1 0 0 1-1-1V4.6a1 1 0 0 1 1-1h3M12.4 13.2 15.6 10l-3.2-3.2M15.6 10H8" />
            {isDemo ? "Switch preview" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminLayout({ role, profile, profileLabel, isDemo, onSignOut }) {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Collapse is a per-browser preference. `/admin` is a client-only route (the
  // prerenderer never renders it), so reading storage in the initialiser is
  // safe and avoids a flash of the wrong width. Expanded is the default.
  const [collapsed, setCollapsed] = useState(readCollapsePreference);
  const drawerRef = useRef(null);
  const roleLabel = ROLE_LABELS[role] || role;
  const { accessToken, currentUserId } = useAdminData();
  const alerts = useAlerts({ accessToken, role, currentUserId, isDemo });
  const visibleProfileLabel = resolveDisplayName(profile, profileLabel);
  const initials = useMemo(() => initialsOf(visibleProfileLabel), [visibleProfileLabel]);

  const active = useMemo(() => resolveActive(location.pathname), [location.pathname]);
  const activeDomainId = active?.domainId ?? null;
  const [openDomain, setOpenDomain] = useState(activeDomainId);
  const [lastActiveDomainId, setLastActiveDomainId] = useState(activeDomainId);

  // Arriving on a route opens the group that owns it, so a typed URL, a
  // refresh, a bookmark or browser back/forward all land with the correct group
  // open and the correct child marked. Adjusting during render (rather than in
  // an effect) keeps the very first paint correct — there is no frame where the
  // wrong group is open — and still leaves a manual toggle in force until the
  // route actually changes.
  if (activeDomainId !== lastActiveDomainId) {
    setLastActiveDomainId(activeDomainId);
    if (activeDomainId) setOpenDomain(activeDomainId);
  }

  const toggleCollapsed = useCallback(() => {
    setCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* storage unavailable — preference is simply not remembered */
      }
      return next;
    });
  }, []);

  const toggleDomain = useCallback((id) => {
    // One group open at a time, matching the authority screens.
    setOpenDomain((current) => (current === id ? null : id));
  }, []);

  // Escape closes the drawer, and Tab is contained inside it while it is open.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const node = drawerRef.current;
    node?.focus();

    function onKeyDown(event) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const focusable = node.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <div className="admin-shell min-h-screen bg-[#faf9f8] text-botanique-charcoal">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to main content
      </a>

      <div className="lg:flex">
        <aside
          className={`hidden border-r border-stone-200 bg-[#faf9f8] lg:fixed lg:inset-y-0 lg:flex lg:flex-col ${
            collapsed ? "lg:w-[104px]" : "lg:w-[235px]"
          }`}
        >
          <div
            className={`flex shrink-0 items-center ${
              collapsed ? "h-24 justify-center" : "h-[81px] px-[22px]"
            }`}
          >
            <Link to="/admin" aria-label="Botanique Designers Operations Hub" className={FOCUS_RING}>
              <BrandMark collapsed={collapsed} />
            </Link>
          </div>

          <div className={`flex-1 overflow-visible pt-3.5 ${collapsed ? "px-2.5" : "px-3.5"}`}>
            <NavTree
              role={role}
              collapsed={collapsed}
              activeDomainId={activeDomainId}
              openDomain={openDomain}
              onToggleDomain={toggleDomain}
              idPrefix="desktop"
            />
          </div>

          {!collapsed && <HelpCard />}

          <button
            type="button"
            onClick={toggleCollapsed}
            aria-pressed={collapsed}
            className={`flex h-14 shrink-0 items-center gap-2.5 border-t border-stone-200 text-[12.5px] font-semibold text-gray-600 transition hover:text-botanique-charcoal ${FOCUS_RING} ${
              collapsed ? "justify-center px-0" : "px-[26px]"
            }`}
          >
            <Icon path={collapsed ? "M7.8 4.4 13.4 10l-5.6 5.6" : "M12.2 4.4 6.6 10l5.6 5.6"} />
            {collapsed ? <span className="sr-only">Expand sidebar</span> : "Collapse sidebar"}
          </button>
        </aside>

        <div className={`min-w-0 flex-1 ${collapsed ? "lg:pl-[104px]" : "lg:pl-[235px]"}`}>
          <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
            <div className="flex min-h-[81px] items-center gap-3 px-4 md:px-7">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className={`rounded-md border border-stone-200 p-2 text-gray-600 hover:bg-stone-50 lg:hidden ${FOCUS_RING}`}
                aria-label="Open navigation menu"
                aria-expanded={drawerOpen}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M3 5h14M3 10h14M3 15h14"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              <div className="hidden flex-1 sm:block">
                <ProjectSearch id="admin-project-search-desktop" />
              </div>

              <div className="relative ml-auto flex items-center gap-3 sm:gap-5">
                {alerts.permitted && (
                  <AlertsBell
                    items={alerts.items}
                    unreadCount={alerts.unreadCount}
                    failedSources={alerts.failedSources}
                    status={alerts.status}
                    markSeen={alerts.markSeen}
                  />
                )}
                <ProfileMenu
                  name={visibleProfileLabel}
                  roleLabel={roleLabel}
                  initials={initials}
                  isDemo={isDemo}
                  onSignOut={onSignOut}
                />
              </div>
            </div>
            <div className="px-4 pb-3 sm:hidden">
              <ProjectSearch id="admin-project-search-mobile" />
            </div>
          </header>

          <main id="admin-main" className="mx-auto max-w-[88rem] px-4 py-5 md:px-7 lg:py-6" tabIndex={-1}>
            {isDemo && (
              <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
                Dev preview only. This is not real authentication and no change here is saved to Supabase.
              </div>
            )}
            <Outlet />
          </main>
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-[rgba(28,42,48,0.42)]"
            onClick={closeDrawer}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className="absolute inset-y-0 left-0 flex w-[290px] max-w-[84%] flex-col bg-[#faf9f8] shadow-xl focus:outline-none"
          >
            <div className="flex h-[81px] shrink-0 items-center gap-2 px-4">
              <BrandMark collapsed={false} />
              <button
                type="button"
                onClick={closeDrawer}
                className={`ml-auto rounded-[9px] border border-stone-200 bg-white p-2 text-gray-600 hover:bg-stone-50 ${FOCUS_RING}`}
                aria-label="Close navigation menu"
              >
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path
                    d="M4 4l10 10M14 4L4 14"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pt-2">
              <NavTree
                role={role}
                collapsed={false}
                activeDomainId={activeDomainId}
                openDomain={openDomain}
                onToggleDomain={toggleDomain}
                onNavigate={closeDrawer}
                idPrefix="mobile"
                touch
              />
            </div>
            <HelpCard />
          </div>
        </div>
      )}

      <SaveFeedback />
    </div>
  );
}

function initialsOf(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "BD";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
