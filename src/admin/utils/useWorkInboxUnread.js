// BD-INBOX-01 (Stage 3) — the unread count shown on the Work Inbox nav item.
//
// The badge RECONCILES with the inbox by construction: it runs exactly the same
// loader, the same recipient rules and the same unread definition the Work
// Inbox page uses, so the number on the nav item and the length of the "Needs
// my action" list can never be computed differently.
//
// It counts UNREAD ITEMS NEEDING ACTION only. Items the reader has already seen
// do not inflate it, and items merely awaiting someone else never enter it, so
// the number always means "new things waiting for you".
//
// A failure produces no badge rather than a zero, because a confident "0" the
// reader could act on must never be shown when the sources were not actually
// read.
import { useEffect, useState } from "react";
import { canSeeWorkInbox } from "./workInboxCapabilities";
import { unreadActionCount } from "./workInboxItems";
import { loadWorkInbox } from "./workInboxLoader";
import { eatToday } from "./reportPeriod";

export function useWorkInboxUnread({ accessToken, role, currentUserId, isDemo }) {
  const [count, setCount] = useState(null);

  useEffect(() => {
    if (isDemo || !accessToken || !canSeeWorkInbox(role)) return undefined;
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
        // An incomplete read must not produce a confident count.
        setCount(result.failedSources.length > 0 ? null : unreadActionCount(result.items));
      } catch {
        if (!cancelled) setCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, currentUserId, isDemo, role]);

  return count;
}
