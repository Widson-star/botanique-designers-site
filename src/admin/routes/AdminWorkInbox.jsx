// BD-INBOX-01 (Stage 3) — /admin/work-inbox, the Work Inbox.
//
// The authoritative place to see what requires human attention. It answers, for
// one signed-in person: what needs attention, why, which project it concerns,
// whether it is new or already seen, and where to go to act.
//
// It is an ATTENTION LAYER, not a second copy of any module. It carries short
// items and routes the reader to the module that owns the underlying record;
// every decision is still made in that module, under that module's own
// authority, role and version checks. The inbox itself mutates no operational
// record and stores no operational fact.
//
// Items are DERIVED from current source state on every read. Nothing about an
// item is stored except one personal seen-marker, so an item disappears exactly
// when its source stops requiring attention — never because someone read it.
//
// The layout is cards, not a table. Martine works from a phone: each item is a
// single tappable block carrying its project, what is needed and its state, and
// nothing here depends on horizontal scrolling.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { markInboxItemsRead } from "../lib/workInbox";
import { canSeeWorkInbox } from "../utils/workInboxCapabilities";
import { INBOX_TAB, itemsForTab, unreadActionCount } from "../utils/workInboxItems";
import { loadWorkInbox } from "../utils/workInboxLoader";
import { eatToday } from "../utils/reportPeriod";

const CATEGORY_TONE = {
  "Correction required": "bg-amber-100 text-amber-900",
  "Decision required": "bg-blue-100 text-blue-900",
  "Site entry missing": "bg-red-100 text-red-900",
  "Project blocker": "bg-red-100 text-red-900",
  "Project action overdue": "bg-amber-100 text-amber-900",
  "Project activation required": "bg-stone-200 text-botanique-charcoal",
};

function InboxItemCard({ item, onOpen }) {
  return (
    <li>
      <Link
        to={item.route}
        onClick={() => onOpen(item)}
        className="block min-h-11 rounded-lg border border-stone-200 bg-white px-4 py-3 transition hover:bg-stone-50"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              CATEGORY_TONE[item.category] || "bg-stone-200 text-botanique-charcoal"
            }`}
          >
            {item.category}
          </span>
          {item.isNew && (
            <span className="rounded-full bg-botanique-green px-2 py-0.5 text-xs font-semibold text-white">
              New
            </span>
          )}
          {!item.isNew && <span className="text-xs text-gray-500">Seen</span>}
        </div>
        <p className="mt-2 break-words text-sm font-semibold text-botanique-charcoal">
          {item.title}
        </p>
        <p className="mt-1 break-words text-xs leading-relaxed text-gray-600">{item.detail}</p>
        <p className="mt-1.5 break-words text-xs font-medium text-gray-500">{item.projectName}</p>
      </Link>
    </li>
  );
}

export default function AdminWorkInbox() {
  const { role, isDemo, accessToken, currentUserId } = useAdminData();
  const today = eatToday();
  const permitted = canSeeWorkInbox(role);

  const [items, setItems] = useState([]);
  const [failedSources, setFailedSources] = useState([]);
  const [remoteStatus, setRemoteStatus] = useState("loading");
  const [tab, setTab] = useState(INBOX_TAB.ACTION);

  // The dev preview holds no operational records, so it is ready and empty.
  // Deriving this rather than setting it keeps the preview and the real path
  // obviously equivalent, and leaves the effect responsible only for the read.
  const status = isDemo ? "ready" : remoteStatus;

  useEffect(() => {
    // No session, or a role that receives nothing: no source is read at all,
    // and the page stays in its loading state rather than claiming an empty
    // inbox it never actually checked.
    if (isDemo || !accessToken || !permitted) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const result = await loadWorkInbox({ accessToken, role, currentUserId, today });
        if (cancelled) return;
        setItems(result.items);
        setFailedSources(result.failedSources);
        setRemoteStatus("ready");
      } catch {
        if (!cancelled) setRemoteStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, currentUserId, isDemo, permitted, role, today]);

  const actionItems = useMemo(() => itemsForTab(items, INBOX_TAB.ACTION), [items]);
  const awaitingItems = useMemo(() => itemsForTab(items, INBOX_TAB.AWAITING), [items]);
  const unread = useMemo(() => unreadActionCount(items), [items]);

  // Opening an item marks it seen. This writes ONLY the personal seen-marker:
  // the source record is untouched, and the item stays in the inbox until the
  // source itself no longer requires attention.
  const markSeen = useCallback(
    async (keys) => {
      const fresh = keys.filter((key) => items.find((item) => item.key === key && item.isNew));
      if (fresh.length === 0) return;
      setItems((current) =>
        current.map((item) => (fresh.includes(item.key) ? { ...item, isNew: false } : item))
      );
      if (isDemo || !accessToken || !currentUserId) return;
      try {
        await markInboxItemsRead(accessToken, currentUserId, fresh);
      } catch {
        // A failed seen-marker is not an operational failure. The item is
        // unchanged and will simply read as New again on the next load.
      }
    },
    [accessToken, currentUserId, isDemo, items]
  );

  const visible = tab === INBOX_TAB.ACTION ? actionItems : awaitingItems;

  if (!permitted) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-8">
        <h1 className="text-xl font-bold">Work Inbox unavailable</h1>
        <p className="mt-2 text-sm text-gray-500">
          This role does not receive work inbox items.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="border-b border-stone-200 pb-5">
        <h1 className="text-2xl font-semibold">Work Inbox</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-600">
          What needs your attention right now, drawn live from the records that own it. Marking an
          item seen does not resolve it — an item leaves this list only when its own record no
          longer needs action.
        </p>
      </header>

      {isDemo && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This dev preview holds no operational records, so the Work Inbox reads as empty.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Work inbox tabs">
        <button
          type="button"
          role="tab"
          aria-selected={tab === INBOX_TAB.ACTION}
          onClick={() => setTab(INBOX_TAB.ACTION)}
          className={`min-h-11 rounded-md px-4 py-2 text-sm font-medium transition ${
            tab === INBOX_TAB.ACTION
              ? "bg-botanique-green text-white"
              : "border border-stone-200 bg-white text-gray-600 hover:bg-stone-100"
          }`}
        >
          Needs my action ({actionItems.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === INBOX_TAB.AWAITING}
          onClick={() => setTab(INBOX_TAB.AWAITING)}
          className={`min-h-11 rounded-md px-4 py-2 text-sm font-medium transition ${
            tab === INBOX_TAB.AWAITING
              ? "bg-botanique-green text-white"
              : "border border-stone-200 bg-white text-gray-600 hover:bg-stone-100"
          }`}
        >
          Awaiting others ({awaitingItems.length})
        </button>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => markSeen(items.filter((item) => item.isNew).map((item) => item.key))}
            className="min-h-11 rounded-md border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-stone-100"
          >
            Mark all as seen
          </button>
        )}
      </div>

      {status === "loading" && (
        <p className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-gray-600">
          Loading your work inbox…
        </p>
      )}

      {status === "error" && (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          The work inbox could not be loaded. Nothing has been read, and no conclusion should be
          drawn about what may need attention.
        </p>
      )}

      {/* A partial failure is stated plainly and never presented as an empty
          inbox, because "nothing needs attention" and "we could not find out"
          are different answers. */}
      {status === "ready" && failedSources.length > 0 && (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          Some sources could not be loaded ({failedSources.join(", ")}). This list is incomplete.
        </p>
      )}

      {status === "ready" && visible.length === 0 && failedSources.length === 0 && (
        <div
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-6 text-center"
          role="status"
        >
          <p className="text-sm font-medium text-green-800">
            {tab === INBOX_TAB.ACTION
              ? "Nothing needs your action right now."
              : "You are not waiting on anyone."}
          </p>
          <p className="mt-1 text-xs text-green-700">
            Only the records you have access to are checked.
          </p>
        </div>
      )}

      {status === "ready" && visible.length > 0 && (
        <ul className="space-y-3">
          {visible.map((item) => (
            <InboxItemCard key={item.key} item={item} onOpen={(opened) => markSeen([opened.key])} />
          ))}
        </ul>
      )}
    </div>
  );
}
