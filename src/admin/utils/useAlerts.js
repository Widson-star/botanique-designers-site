// BD-ALERTS-01 — the Alerts state behind the header bell.
//
// PRESENTATION ONLY. This hook changed the *surface* the Stage 3 attention
// model is shown on; it changed none of the model. Items are still DERIVED from
// current authoritative source state on every read by `loadWorkInbox`, still
// carry no stored business truth, and are still bounded by the caller's own row
// level security. The stored `work_inbox_read_state` table, its RLS and the
// migration behind it are untouched, which is why the internal identifiers
// below keep the persisted name rather than being renamed to match the
// user-facing "Alerts".
//
// One load serves the whole shell. The former Work Inbox page and the nav badge
// each ran the loader separately; with the page retired there is a single read
// per navigation, and the bell's count and the popover's list are by
// construction the same data — they cannot disagree.
//
// A failure produces NO count rather than a zero, because a confident "0" the
// reader could act on must never be shown when the sources were not read.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { markInboxItemsRead } from "../lib/workInbox";
import { canSeeAlerts } from "./workInboxCapabilities";
import { unreadActionCount } from "./workInboxItems";
import { loadWorkInbox } from "./workInboxLoader";
import { eatToday } from "./reportPeriod";

export function useAlerts({ accessToken, role, currentUserId, isDemo }) {
  const [items, setItems] = useState([]);
  const [failedSources, setFailedSources] = useState([]);
  const [status, setStatus] = useState("loading");
  // The shell persists across route changes, so without this the alerts would
  // be computed once per session and then go stale — a reader who acted on an
  // item would still see it. Recomputing on navigation is what keeps the bell
  // honest about what is outstanding right now.
  const { pathname } = useLocation();

  const permitted = canSeeAlerts(role);

  useEffect(() => {
    // No session, or a role that receives nothing: no source is read at all,
    // and nothing is claimed about what may need attention.
    if (isDemo || !accessToken || !permitted) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const result = await loadWorkInbox({
          accessToken,
          role,
          currentUserId,
          today: eatToday(),
        });
        if (cancelled) return;
        setItems(result.items);
        setFailedSources(result.failedSources);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, currentUserId, isDemo, permitted, role, pathname]);

  // An incomplete or failed read must not produce a confident count.
  const unreadCount = useMemo(() => {
    if (status !== "ready" || failedSources.length > 0) return null;
    return unreadActionCount(items);
  }, [failedSources, items, status]);

  // Marking seen writes ONLY the personal seen-marker. It touches no source
  // record and resolves nothing: the item stays until its own record stops
  // requiring attention.
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
        // unchanged and simply reads as new again on the next load.
      }
    },
    [accessToken, currentUserId, isDemo, items]
  );

  return {
    items,
    unreadCount,
    failedSources,
    // The dev preview holds no operational records, so it is ready and empty.
    status: isDemo ? "ready" : status,
    permitted,
    markSeen,
  };
}
