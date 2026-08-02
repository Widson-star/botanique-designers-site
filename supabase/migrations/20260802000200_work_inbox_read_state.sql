-- =====================================================================
-- BD-INBOX-01 (Stage 3) — Work Inbox read state
-- =====================================================================
-- The single database object added by Stage 3.
--
-- The Work Inbox itself is DERIVED. It stores no inbox row, no notification
-- row, no recipient row and no copy of any operational record. Every inbox item
-- is computed at read time from the authoritative source domains — projects,
-- approval_requests, internal_cost_claims, fund_requests and daily site
-- compliance — under the caller's own row level security. Nothing here becomes
-- a second place where operational truth lives.
--
-- This table stores exactly one fact, and it is a fact about a PERSON, not
-- about the business: "this user has already seen this inbox item". That fact
-- has nowhere else to live, because no source record knows who has looked at a
-- derived attention item. It is the minimum persistence needed for the
-- new/seen distinction and the reconciled unread badge required by Stage 3.
--
-- WHAT THIS TABLE MUST NEVER DO, and structurally cannot:
--   * It holds no project id, no record id, no amount, no status and no
--     decision. It cannot answer any operational question.
--   * Marking an item seen NEVER resolves the underlying issue. An inbox item
--     disappears only when its authoritative source record stops requiring
--     attention. Deleting every row in this table would change no operational
--     state whatsoever — it would only make items look new again.
--   * It is never read to decide what a user may access. Access is decided by
--     the source domains' existing RLS, unchanged by this migration.
--
-- ITEM KEY SEMANTICS. item_key is an opaque application-built string that
-- identifies a derived item AND the source state that produced it, for example
-- 'claim:<uuid>:awaiting_review'. When the source record moves to a materially
-- different state that needs fresh attention — awaiting_review becoming
-- amendment_requested — the key changes, so the item correctly returns to New
-- rather than inheriting a stale "seen" from the previous state. The database
-- attaches no meaning to the string and parses nothing out of it.
--
-- RETENTION. Rows are per-user and tiny. A row whose item_key no longer
-- corresponds to any derived item is simply never joined against again; it is
-- inert. No event-backed notification history, no delivery log and no
-- retention policy is created here — event-backed notification history remains
-- a later, separately authorised capability.
--
-- NOT AUTHORISED BY THIS MIGRATION: a notifications table, notification
-- triggers on any domain, email, SMS, WhatsApp or push delivery.

create table if not exists public.work_inbox_read_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null check (char_length(item_key) between 1 and 200),
  read_at timestamptz not null default now(),
  primary key (user_id, item_key)
);

alter table public.work_inbox_read_state enable row level security;

-- A user may read, create and clear ONLY their own seen-markers. There is no
-- policy by which one user can observe, set or clear another user's read state,
-- and no role — including owner — is granted a wider view. Read state is
-- personal; it is not management information.
create policy "work_inbox_read_state_select_own"
  on public.work_inbox_read_state for select
  to authenticated
  using (user_id = auth.uid());

create policy "work_inbox_read_state_insert_own"
  on public.work_inbox_read_state for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "work_inbox_read_state_update_own"
  on public.work_inbox_read_state for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Clearing a marker returns an item to New. It touches no operational record.
create policy "work_inbox_read_state_delete_own"
  on public.work_inbox_read_state for delete
  to authenticated
  using (user_id = auth.uid());

revoke all on public.work_inbox_read_state from anon;
grant select, insert, update, delete on public.work_inbox_read_state to authenticated;
