// BD-ALERTS-01 — Alerts, behind the top-right header bell.
//
// Governed by `docs/ui-authority/operations-hub/02-alerts-popover-authority.png`:
// a bell beside the user profile carrying a small unread count, opening a
// compact popover of the few most pressing items, with "Mark all as read" and
// "View all alerts". Alerts are NOT a sidebar destination and NOT a full-page
// list — the Founder rejected both on 3 August 2026.
//
// The user-facing name is "Alerts" in every string below. The Stage 3 model it
// presents is unchanged: items are derived from authoritative source records on
// every read, nothing here stores business truth, and the only thing written is
// a personal seen-marker that resolves nothing.
//
// WHAT IS DELIBERATELY ABSENT: the authority screen shows a relative time on
// each row ("12m ago"). Derived items have no arrival time — nothing is stored,
// so there is no moment at which an item "arrived". Inventing one would be a
// fabricated business field, which the authority manifest forbids, so no
// timestamp is rendered.
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { INBOX_CATEGORY, INBOX_TAB, itemsForTab } from "../utils/workInboxItems";

// The authority screen shows five rows. The popover is a summary, not the
// archive: it stays short at any volume, and "View all alerts" carries the rest.
export const ALERTS_POPOVER_LIMIT = 5;

// Colour is carried by one small category mark per row, exactly as the
// authority screen does. Restraint is the point: no full-width tinted cards, no
// tinted row backgrounds.
const CATEGORY_TONE = {
  [INBOX_CATEGORY.CORRECTION]: "bg-amber-50 text-amber-700",
  [INBOX_CATEGORY.DECISION]: "bg-blue-50 text-blue-700",
  [INBOX_CATEGORY.SITE_ENTRY_MISSING]: "bg-red-50 text-red-700",
  [INBOX_CATEGORY.PROJECT_BLOCKER]: "bg-red-50 text-red-700",
  [INBOX_CATEGORY.PROJECT_ACTION_OVERDUE]: "bg-amber-50 text-amber-700",
  [INBOX_CATEGORY.ACTIVATION]: "bg-stone-100 text-gray-600",
};

const CATEGORY_ICON = {
  [INBOX_CATEGORY.CORRECTION]: "M10 6.5v4M10 13.5h.01M10 3l7 13H3l7-13Z",
  [INBOX_CATEGORY.DECISION]: "M10 5.5v5l3 2M10 17a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z",
  [INBOX_CATEGORY.SITE_ENTRY_MISSING]: "M10 6v4.5M10 13.5h.01M10 17a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z",
  [INBOX_CATEGORY.PROJECT_BLOCKER]: "M5 5l10 10M10 17a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z",
  [INBOX_CATEGORY.PROJECT_ACTION_OVERDUE]: "M10 5.5v5l3 2M10 17a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z",
  [INBOX_CATEGORY.ACTIVATION]: "M6 3v2m8-2v2M3.5 7.5h13M4.5 5.5h11a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z",
};

// One compact row. Category, short title, project context, unread mark and the
// exact drill-through — and nothing else. No long description, no record
// detail, no table.
function AlertRow({ item, onOpen }) {
  return (
    <li>
      <Link
        to={item.route}
        onClick={() => onOpen(item)}
        className="flex min-h-11 items-start gap-3 px-4 py-3 transition hover:bg-stone-50 focus:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-botanique-green/40"
      >
        <span
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            CATEGORY_TONE[item.category] || "bg-stone-100 text-gray-600"
          }`}
          aria-hidden="true"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path
              d={CATEGORY_ICON[item.category] || CATEGORY_ICON[INBOX_CATEGORY.ACTIVATION]}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-2">
            {item.isNew && (
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500"
                aria-hidden="true"
              />
            )}
            <span className="min-w-0 break-words text-sm font-medium leading-snug text-botanique-charcoal">
              {item.title}
            </span>
          </span>
          <span className="mt-0.5 block break-words text-xs leading-snug text-gray-500">
            {item.category} · {item.projectName}
          </span>
          {item.isNew && <span className="sr-only">Unread</span>}
        </span>
      </Link>
    </li>
  );
}

function EmptyState({ label }) {
  return (
    <p className="px-4 py-6 text-center text-sm text-gray-500" role="status">
      {label}
    </p>
  );
}

// "View all alerts" is a CONTAINED panel, not a page and not a sidebar
// destination. It is the least expansive treatment that stays usable when a
// reader genuinely has more than the popover shows: the same compact rows, the
// two honest Stage 3 groupings, and a bounded scroll area rather than an
// endless page.
function AllAlertsDialog({ items, failedSources, onClose, onOpenItem, onMarkAll, unreadCount }) {
  const panelRef = useRef(null);
  const titleId = useId();
  const [tab, setTab] = useState(INBOX_TAB.ACTION);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const actionItems = useMemo(() => itemsForTab(items, INBOX_TAB.ACTION), [items]);
  const awaitingItems = useMemo(() => itemsForTab(items, INBOX_TAB.AWAITING), [items]);
  const visible = tab === INBOX_TAB.ACTION ? actionItems : awaitingItems;

  // Rendered through a portal to the document body. The admin header carries
  // `backdrop-blur`, and a backdrop-filter makes an element the containing
  // block for its `fixed` descendants — so a panel rendered in place would be
  // positioned against the header rather than the viewport, and would hang off
  // the top of the screen instead of centring on it.
  // Sized in viewport units rather than with `inset-0`. A fixed element's
  // containing block follows the VISUAL viewport, which on a zoomed or pinched
  // phone is wider than the layout viewport — `inset-0` there produced a panel
  // wider than the screen, pushed off its right edge. `w-screen` and `dvh`
  // resolve against the layout viewport, so the panel always fits the phone.
  return createPortal(
    <div className="fixed left-0 top-0 z-50 flex h-[100dvh] w-screen items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-xl bg-white shadow-xl focus:outline-none sm:rounded-xl"
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <h2 id={titleId} className="text-sm font-semibold text-botanique-charcoal">
            All alerts
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-500 transition hover:bg-stone-100"
            aria-label="Close alerts"
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 px-4 py-2.5">
          <button
            type="button"
            role="tab"
            aria-selected={tab === INBOX_TAB.ACTION}
            onClick={() => setTab(INBOX_TAB.ACTION)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              tab === INBOX_TAB.ACTION
                ? "bg-botanique-green text-white"
                : "text-gray-600 hover:bg-stone-100"
            }`}
          >
            Needs my action ({actionItems.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === INBOX_TAB.AWAITING}
            onClick={() => setTab(INBOX_TAB.AWAITING)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              tab === INBOX_TAB.AWAITING
                ? "bg-botanique-green text-white"
                : "text-gray-600 hover:bg-stone-100"
            }`}
          >
            Awaiting others ({awaitingItems.length})
          </button>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAll}
              className="ml-auto rounded-md px-2 py-1.5 text-xs font-medium text-botanique-green transition hover:bg-stone-100"
            >
              Mark all as read
            </button>
          )}
        </div>

        {failedSources.length > 0 && (
          <p className="border-b border-red-100 bg-red-50 px-4 py-2.5 text-xs text-red-800" role="alert">
            Some sources could not be loaded ({failedSources.join(", ")}). This list is incomplete.
          </p>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <EmptyState
              label={
                tab === INBOX_TAB.ACTION
                  ? "Nothing needs your action right now."
                  : "You are not waiting on anyone."
              }
            />
          ) : (
            <ul className="divide-y divide-stone-100">
              {visible.map((item) => (
                <AlertRow key={item.key} item={item} onOpen={onOpenItem} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function AlertsBell({ items, unreadCount, failedSources, status, markSeen }) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const bellRef = useRef(null);
  const popoverRef = useRef(null);
  const popoverId = useId();

  const closePopover = useCallback(() => {
    setOpen(false);
    bellRef.current?.focus();
  }, []);

  // Escape closes, and a click outside closes — ordinary accessible popover
  // behaviour, with focus returned to the control that opened it.
  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.stopPropagation();
        closePopover();
      }
    }
    function onPointerDown(event) {
      if (
        !popoverRef.current?.contains(event.target) &&
        !bellRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [closePopover, open]);

  // Highest-priority first: the Stage 3 sort already puts work to do ahead of
  // work to wait for, then orders by category, so the top of the list is the
  // most pressing by construction.
  const visible = useMemo(() => items.slice(0, ALERTS_POPOVER_LIMIT), [items]);
  const unreadKeys = useMemo(
    () => items.filter((item) => item.isNew).map((item) => item.key),
    [items]
  );

  const openItem = useCallback(
    (item) => {
      markSeen([item.key]);
      setOpen(false);
      setShowAll(false);
    },
    [markSeen]
  );

  const markAll = useCallback(() => markSeen(unreadKeys), [markSeen, unreadKeys]);

  const badge = unreadCount !== null && unreadCount > 0 ? unreadCount : null;
  const bellLabel = badge
    ? `Alerts, ${badge} unread ${badge === 1 ? "item" : "items"}`
    : "Alerts";

  // Not `relative`: the popover anchors to the header's right-hand cluster, so
  // its right edge lands on the page margin exactly as
  // 02-alerts-popover-authority.png shows, rather than hanging from the bell
  // and stopping short of the profile. The unread badge is positioned against
  // the button itself, so nothing here needs a positioning context.
  return (
    <>
      <button
        ref={bellRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 text-gray-600 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-botanique-green/40"
        aria-label={bellLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
      >
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path
            d="M10 3a4.5 4.5 0 0 0-4.5 4.5c0 3-1.5 4-1.5 4h12s-1.5-1-1.5-4A4.5 4.5 0 0 0 10 3ZM8.5 14.5a1.75 1.75 0 0 0 3 0"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {badge && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={popoverRef}
          id={popoverId}
          role="dialog"
          aria-label="Alerts"
          className="absolute right-0 top-full z-40 mt-2 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-botanique-charcoal">Alerts</h2>
            {unreadKeys.length > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="rounded px-1 text-xs font-medium text-botanique-green transition hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          {status === "error" && (
            <p className="px-4 py-4 text-xs text-red-800" role="alert">
              Alerts could not be loaded. Nothing has been read, and no conclusion should be drawn
              about what may need attention.
            </p>
          )}

          {status === "ready" && failedSources.length > 0 && (
            <p className="border-b border-red-100 bg-red-50 px-4 py-2.5 text-xs text-red-800" role="alert">
              Some sources could not be loaded ({failedSources.join(", ")}). This list is incomplete.
            </p>
          )}

          {status === "loading" && <EmptyState label="Loading your alerts…" />}

          {status === "ready" && visible.length === 0 && failedSources.length === 0 && (
            <EmptyState label="Nothing needs your attention right now." />
          )}

          {status === "ready" && visible.length > 0 && (
            <ul className="divide-y divide-stone-100">
              {visible.map((item) => (
                <AlertRow key={item.key} item={item} onOpen={openItem} />
              ))}
            </ul>
          )}

          {status === "ready" && items.length > visible.length && (
            <div className="border-t border-stone-100 px-4 py-2.5">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setShowAll(true);
                }}
                className="text-xs font-medium text-botanique-green transition hover:underline"
              >
                View all alerts →
              </button>
            </div>
          )}
        </div>
      )}

      {showAll && (
        <AllAlertsDialog
          items={items}
          failedSources={failedSources}
          unreadCount={unreadKeys.length}
          onClose={() => {
            setShowAll(false);
            bellRef.current?.focus();
          }}
          onOpenItem={openItem}
          onMarkAll={markAll}
        />
      )}
    </>
  );
}
