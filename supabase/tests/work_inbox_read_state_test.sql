-- BD-INBOX-01 (Stage 3) — Work Inbox read-state database tests.
--
-- Runs on an isolated PostgreSQL 17 database after every migration is applied
-- in order (see scripts/test-work-inbox-db.sh). No hosted Supabase is touched.
--
-- Covers: read state is strictly personal — no role, including owner, can read,
-- set or clear another user's markers; a marker carries no operational meaning;
-- and clearing markers changes no operational record.
\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$
begin
  if value is not true then raise exception 'ASSERTION FAILED: %', message; end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'inbox-owner@test.local'),
  ('00000000-0000-0000-0000-0000000000c2', 'inbox-manager@test.local');

insert into public.profiles (id, email, full_name, role, is_active) values
  ('00000000-0000-0000-0000-0000000000c1', 'inbox-owner@test.local', 'Inbox Owner', 'owner', true),
  ('00000000-0000-0000-0000-0000000000c2', 'inbox-manager@test.local', 'Inbox Manager', 'manager', true);

set local role authenticated;

-- =====================================================================
-- 1. A user may create and read their OWN markers
-- =====================================================================
do $$
declare
  visible integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c2', true);
  insert into public.work_inbox_read_state (user_id, item_key)
  values ('00000000-0000-0000-0000-0000000000c2', 'claim:c1:awaiting_review');

  select count(*) into visible from public.work_inbox_read_state;
  perform pg_temp.assert_true(
    visible = 1, 'a user must see their own read-state marker'
  );
end;
$$;

-- =====================================================================
-- 2. Read state is PERSONAL — the Principal cannot see the manager's markers
-- =====================================================================
-- Read state is not management information. No role widens it.
do $$
declare
  visible integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
  select count(*) into visible from public.work_inbox_read_state;
  perform pg_temp.assert_true(
    visible = 0, 'the owner must NOT see another user''s read state'
  );
end;
$$;

-- =====================================================================
-- 3. A user cannot write a marker on someone else's behalf
-- =====================================================================
do $$
declare
  rejected boolean := false;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
  begin
    insert into public.work_inbox_read_state (user_id, item_key)
    values ('00000000-0000-0000-0000-0000000000c2', 'claim:c2:awaiting_review');
  exception when insufficient_privilege then
    rejected := true;
  end;
  perform pg_temp.assert_true(
    rejected, 'inserting a marker for another user must be rejected'
  );
end;
$$;

-- =====================================================================
-- 4. A user cannot clear someone else's markers
-- =====================================================================
do $$
declare
  remaining integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
  delete from public.work_inbox_read_state;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c2', true);
  select count(*) into remaining from public.work_inbox_read_state;
  perform pg_temp.assert_true(
    remaining = 1, 'another user''s delete must not remove this user''s markers'
  );
end;
$$;

-- =====================================================================
-- 5. Marking seen again is idempotent — no duplicate marker is possible
-- =====================================================================
do $$
declare
  total integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c2', true);
  insert into public.work_inbox_read_state (user_id, item_key)
  values ('00000000-0000-0000-0000-0000000000c2', 'claim:c1:awaiting_review')
  on conflict (user_id, item_key) do update set read_at = now();

  select count(*) into total from public.work_inbox_read_state;
  perform pg_temp.assert_true(
    total = 1, 'a repeated seen-marker must not create a second row'
  );
end;
$$;

-- =====================================================================
-- 6. Read state carries no operational meaning
-- =====================================================================
-- The table holds a user, an opaque key and a timestamp — no project, no
-- record, no amount, no status and no decision. It therefore cannot answer any
-- operational question, and clearing it can change no operational fact.
do $$
declare
  operational integer;
begin
  select count(*) into operational
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'work_inbox_read_state'
    and column_name not in ('user_id', 'item_key', 'read_at');
  perform pg_temp.assert_true(
    operational = 0,
    'read state must hold no column beyond user_id, item_key and read_at'
  );
end;
$$;

-- =====================================================================
-- 7. anon has no access at all
-- =====================================================================
do $$
declare
  granted integer;
begin
  select count(*) into granted
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'work_inbox_read_state'
    and grantee = 'anon';
  perform pg_temp.assert_true(granted = 0, 'anon must hold no grant on read state');
end;
$$;

rollback;
