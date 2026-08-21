-- =====================================================================
-- BD-OPERATIONS-HUB-01 — Permanent BD-TE asset identity, and atomic handover
-- =====================================================================
-- Forward correction. No previously applied Inventory migration is rewritten:
-- 20260819220000_inventory_tools_equipment_v1 (production 20260820071700),
-- 20260821090000_inventory_site_register (production 20260821073611) and
-- 20260822090000_inventory_automatic_asset_codes (production 20260821120725)
-- all stand.
--
-- THREE THINGS, all at the database boundary because all three are truth
-- rather than presentation:
--
--   1. The internal asset identity namespace becomes BD-TE-001. BD = Botanique
--      Designers, TE = Tools & Equipment. It is PERMANENT: it names one
--      individually tracked physical item for the whole of that item's life.
--   2. Handing several tools to one person becomes ONE atomic operation, so a
--      handover can never half-happen.
--   3. An expected return date in the past is refused, because it describes a
--      future obligation and a past one is not a fact anyone can act on.

-- ---------------------------------------------------------------------------
-- 1. IDENTITY
-- ---------------------------------------------------------------------------

-- The format changes; the allocator does not. It is still the same
-- concurrency-safe sequence, for the same reason: nextval() is atomic and
-- non-transactional, so two overlapping registrations can never draw the same
-- number even while both are uncommitted. max()+1, client numbering,
-- timestamps and randomness all remain wrong here.
--
-- THREE digits MINIMUM, and deliberately no maximum.
--
-- The pad width is greatest(3, length) rather than a bare lpad(n, 3, '0'),
-- because PostgreSQL's lpad TRUNCATES when the string is longer than the
-- requested length: lpad('1000', 3, '0') is '100', not '1000'. A bare lpad
-- would therefore have made the thousandth asset BD-TE-100 — colliding with
-- the hundredth, and rejected by the unique index. The previous EQP allocator
-- carried the same latent flaw at five digits; it is fixed here rather than
-- carried forward.
create or replace function public.private_next_equipment_asset_code()
returns text
language sql
volatile
security definer
set search_path = pg_catalog, public
--
-- Drawn ONCE into a subquery. Calling nextval twice in one expression — or
-- pairing it with currval and relying on argument evaluation order — would be
-- a quietly broken allocator.
as $$
  select 'BD-TE-' || case when drawn.n < 1000 then lpad(drawn.n::text, 3, '0') else drawn.n::text end
  from (select nextval('public.equipment_asset_code_seq') as n) drawn
$$;

revoke execute on function public.private_next_equipment_asset_code() from public, anon, authenticated;

-- Initialisation now spans BOTH namespaces. Production reached this migration
-- holding EQP-0001, and that asset's numeric identity is being carried across
-- to BD-TE-001 below, so the counter has to sit above the highest suffix in
-- either namespace or the next registration would collide with it.
--
-- The NUMERIC parse from the previous migration is retained deliberately.
-- asset_code allows 64 characters, so a hand-entered
-- 'EQP-99999999999999999999' is schema-valid and could be in the data; casting
-- that straight to bigint raises "out of range" and aborts the migration.
-- numeric is arbitrary-precision, so the scan cannot overflow, and only values
-- that fit in bigint are considered. Discarding the oversized ones stays
-- correct: a bigint sequence can never emit a number above
-- 9223372036854775807, so a longer suffix cannot collide with anything this
-- system will ever generate.
create or replace function public.private_initialise_equipment_asset_code_seq()
returns bigint
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
  highest bigint;
begin
  select coalesce(max(suffix) filter (where suffix <= 9223372036854775807::numeric), 0)::bigint
    into highest
  from (
    select (regexp_match(asset_code, '^(?:BD-TE|EQP)-([0-9]+)$', 'i'))[1]::numeric as suffix
    from public.equipment_assets
    where asset_code ~* '^(?:BD-TE|EQP)-[0-9]+$'
  ) candidates;

  -- is_called = true means the NEXT nextval() returns highest + 1.
  perform setval('public.equipment_asset_code_seq', greatest(highest, 1), highest > 0);
  return highest;
end;
$$;

revoke execute on function public.private_initialise_equipment_asset_code_seq() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. CARRYING THE EXISTING ASSET ACROSS
-- ---------------------------------------------------------------------------
-- Production holds exactly one real physical asset: Secateurs, EQP-0001,
-- currently issued. Its identity moves to BD-TE-001 — the NUMERIC SUFFIX IS
-- PRESERVED, so 0001 becomes 001 and the same physical tool keeps the same
-- number in the new namespace.
--
-- Done through the controlled correction path, so the audit trigger records it
-- as a correction rather than being bypassed. The immutable event ledger is
-- NOT rewritten: historical events keep saying EQP-0001, because that is
-- genuinely the identity the asset carried at the time each event happened.
-- Rewriting them would be falsifying history to make a rename look tidy.
--
-- Guarded and idempotent. It renames only rows still in the legacy namespace,
-- and only where the destination name is genuinely free, so re-running it is
-- safe and a database that never held an EQP code is untouched.
--
-- ATTRIBUTION. equipment_assets.updated_by is NOT NULL and the audit trigger
-- stamps it from auth.uid(), which is NULL during a migration — so the rename
-- has to run as somebody. It adopts an active Principal resolved FROM THE DATA
-- (no hard-coded uuid), and records the reason on the event, which is exactly
-- how this system already represents an exceptional audited correction. If
-- there is no Principal to attribute it to, it does nothing rather than
-- inventing an actor.
--
-- In a function so the regression exercises the migration's real code path
-- rather than a copy of its SQL: at migration time the table is empty on a
-- fresh database, so an inline block would ship completely untested.
create or replace function public.private_migrate_equipment_asset_codes_to_bdte()
returns integer
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid;
  previous_claim text := current_setting('request.jwt.claim.sub', true);
  moved integer := 0;
begin
  if not exists (select 1 from public.equipment_assets where asset_code ~* '^EQP-[0-9]+$') then
    return 0;
  end if;

  select p.id into actor
  from public.profiles p
  where p.role = 'owner' and p.is_active
  order by p.created_at, p.id
  limit 1;

  if actor is null then
    raise notice 'BD-TE identity migration: no active Principal to attribute the correction to; leaving legacy codes alone';
    return 0;
  end if;

  perform set_config('request.jwt.claim.sub', actor::text, true);
  perform public.private_set_equipment_asset_event(
    'corrected', 'Botanique asset identity moved to the BD-TE namespace'
  );

  -- The suffix is re-normalised, not reused verbatim: EQP used four digits and
  -- BD-TE uses three, so 'EQP-0001' has to become 'BD-TE-001' and not
  -- 'BD-TE-0001'. Leading zeros are stripped and the number re-padded, and
  -- again NOT with a bare lpad — lpad('0001', 3, '0') truncates to '000',
  -- which would have renamed the Founder's Secateurs to BD-TE-000.
  --
  -- Kept as string operations throughout so an oversized legacy suffix passes
  -- through untouched instead of overflowing a numeric cast.
  with renamable as (
    select a.id,
           'BD-TE-' || case
             when length(trimmed.digits) < 3 then lpad(trimmed.digits, 3, '0')
             else trimmed.digits
           end as next_code
    from public.equipment_assets a
    cross join lateral (
      select coalesce(nullif(ltrim((regexp_match(a.asset_code, '^EQP-([0-9]+)$', 'i'))[1], '0'), ''), '0') as digits
    ) trimmed
    where a.asset_code ~* '^EQP-[0-9]+$'
  )
  update public.equipment_assets target
  set asset_code = renamable.next_code
  from renamable
  where target.id = renamable.id
    and not exists (
      select 1 from public.equipment_assets clash
      where upper(btrim(clash.asset_code)) = upper(renamable.next_code)
        and clash.id <> target.id
    );

  get diagnostics moved = row_count;
  perform public.private_clear_equipment_asset_event();
  perform set_config('request.jwt.claim.sub', coalesce(previous_claim, ''), true);
  raise notice 'BD-TE identity migration: % asset(s) carried across from the EQP namespace', moved;
  return moved;
end;
$$;

revoke execute on function public.private_migrate_equipment_asset_codes_to_bdte() from public, anon, authenticated;

do $$
begin
  perform public.private_migrate_equipment_asset_codes_to_bdte();
end;
$$;

-- Re-seat the counter AFTER the rename, so it accounts for the carried-across
-- suffixes in their new form.
do $$
begin
  perform public.private_initialise_equipment_asset_code_seq();
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. EXPECTED RETURN DATE
-- ---------------------------------------------------------------------------
-- An expected return date describes a future obligation. Production already
-- demonstrates the failure this prevents: Secateurs issued 21 Aug 2026 with an
-- expected return of 20 Aug 2026 — a tool due back before it left.
--
-- WHAT DAY IS IT, FOR BOTANIQUE?
--
-- Not what day it is for the database. Supabase production runs with TimeZone
-- = UTC, so between 00:00 and 02:59 EAT the server's current_date is still the
-- PREVIOUS Kenyan calendar day. At 01:00 on 22 August in Nairobi the database
-- believes it is 21 August, and a return date of 21 August — genuinely
-- yesterday to everyone actually holding the tools — would be waved through as
-- "today".
--
-- Botanique operates in Kenya, so the operational day is Africa/Nairobi, said
-- once, explicitly, and never inherited from a session or server setting that
-- can be changed underneath it.
create or replace function public.private_inventory_operational_date()
returns date
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select (current_timestamp at time zone 'Africa/Nairobi')::date
$$;

revoke execute on function public.private_inventory_operational_date() from public, anon;
grant execute on function public.private_inventory_operational_date() to authenticated;

-- Today is valid, the future is valid, the past is not — measured in Nairobi.
-- Deliberately a shared helper rather than a CHECK constraint on the column:
-- the existing production row is already in the invalid state, and a table
-- constraint would either reject it retroactively or have to be added NOT
-- VALID. This refuses the invalid value at the moment somebody tries to SET
-- one, and leaves recorded history alone.
create or replace function public.private_assert_expected_return_date(target_date date)
returns void
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if target_date is not null and target_date < public.private_inventory_operational_date() then
    raise exception 'An expected return date cannot be in the past'
      using errcode = '22023';
  end if;
end;
$$;

revoke execute on function public.private_assert_expected_return_date(date) from public, anon;
grant execute on function public.private_assert_expected_return_date(date) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. ATOMIC HANDOVER
-- ---------------------------------------------------------------------------
-- The Founder hands several tools to one person at once. Doing that as N
-- separate browser calls means a handover can half-happen: three tools issued,
-- the fourth refused because somebody else had already taken it, and no way to
-- tell from the register that the group was ever meant to be one act.
--
-- This is ONE transaction. Every asset is locked and fully validated before
-- any of them is issued, so the outcome is all or nothing. A single asset is
-- not a special case — it is an array of one — which is what keeps one
-- authoritative issue behaviour rather than two that can drift apart.
--
-- target_assets is [{"asset_id": uuid, "expected_version": int}, ...]: the
-- optimistic-concurrency contract is per asset, because each carries its own
-- version and any one of them may have moved since the operator's screen
-- loaded.
create or replace function public.issue_equipment_assets(
  target_assets jsonb,
  target_site_id uuid default null,
  target_custodian_person_id uuid default null,
  target_expected_return_date date default null,
  target_project_id uuid default null,
  target_maintenance_visit_id uuid default null,
  note text default null
)
returns setof public.equipment_assets
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  requested_count integer;
  distinct_count integer;
  member record;
  locked public.equipment_assets;
begin
  if public.private_inventory_role() is null then
    raise exception 'You are not authorised to manage Tools & Equipment' using errcode = '42501';
  end if;
  if target_assets is null or jsonb_typeof(target_assets) <> 'array' or jsonb_array_length(target_assets) = 0 then
    raise exception 'Choose at least one asset to hand over' using errcode = '22023';
  end if;
  if target_site_id is null then
    raise exception 'A Site is required when equipment is issued' using errcode = '22023';
  end if;

  -- The same asset twice in one handover is a mistake, not an instruction: the
  -- second copy would fail its own version check having just been bumped by
  -- the first, and the operator would get a confusing stale-data error for
  -- something they did themselves.
  select count(*), count(distinct (entry ->> 'asset_id')::uuid)
    into requested_count, distinct_count
  from jsonb_array_elements(target_assets) as entry;

  if requested_count <> distinct_count then
    raise exception 'The same asset appears more than once in this handover' using errcode = '22023';
  end if;

  -- Shared context is validated ONCE, before anything is touched.
  perform public.private_assert_inventory_site(target_site_id);
  perform public.private_assert_inventory_person(target_custodian_person_id);
  perform public.private_assert_inventory_context(
    target_project_id, target_maintenance_visit_id, target_site_id
  );
  perform public.private_assert_expected_return_date(target_expected_return_date);

  -- PASS ONE — lock and validate EVERY member. Ordered by id so two concurrent
  -- handovers sharing assets take their locks in the same order and deadlock
  -- against each other rather than interleaving.
  for member in
    select (entry ->> 'asset_id')::uuid as asset_id,
           (entry ->> 'expected_version')::integer as expected_version
    from jsonb_array_elements(target_assets) as entry
    order by 1
  loop
    if member.expected_version is null then
      raise exception 'Each asset in a handover needs its expected version' using errcode = '22023';
    end if;

    locked := public.private_lock_equipment_asset(member.asset_id, member.expected_version);

    if locked.status <> 'available' then
      raise exception 'Only available equipment can be issued. % is %',
        locked.asset_code, replace(locked.status, '_', ' ')
        using errcode = '22023';
    end if;
  end loop;

  -- PASS TWO — nothing below can fail on validation grounds, so by the time
  -- the first asset changes, every one of them is known to be issuable.
  perform public.private_set_equipment_asset_event(
    'issued', null, note, target_project_id, target_maintenance_visit_id
  );

  return query
  update public.equipment_assets
  set status = 'issued',
      current_site_id = target_site_id,
      current_custodian_person_id = target_custodian_person_id,
      expected_return_date = target_expected_return_date
  where id in (
    select (entry ->> 'asset_id')::uuid from jsonb_array_elements(target_assets) as entry
  )
  returning *;

  perform public.private_clear_equipment_asset_event();
end;
$$;

revoke execute on function public.issue_equipment_assets(jsonb, uuid, uuid, date, uuid, uuid, text) from public, anon;
grant execute on function public.issue_equipment_assets(jsonb, uuid, uuid, date, uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. THE EXISTING SINGLE-ASSET PATHS
-- ---------------------------------------------------------------------------
-- issue_equipment_asset stays for compatibility, but it is no longer a second
-- implementation: it delegates to the canonical one with an array of one, so
-- there is exactly ONE issue behaviour and the two cannot drift apart.
create or replace function public.issue_equipment_asset(
  target_asset_id uuid,
  expected_version integer,
  target_site_id uuid default null,
  target_custodian_person_id uuid default null,
  target_expected_return_date date default null,
  target_project_id uuid default null,
  target_maintenance_visit_id uuid default null,
  note text default null
)
returns public.equipment_assets
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  issued public.equipment_assets;
begin
  select * into issued from public.issue_equipment_assets(
    jsonb_build_array(jsonb_build_object(
      'asset_id', target_asset_id, 'expected_version', expected_version
    )),
    target_site_id, target_custodian_person_id, target_expected_return_date,
    target_project_id, target_maintenance_visit_id, note
  );
  return issued;
end;
$$;

-- Transfer and return-from-repair also set an expected return date, so they
-- get the same rule. Redefined in full rather than patched, because a partial
-- redefinition of a plpgsql body is not a thing.
create or replace function public.transfer_equipment_asset(
  target_asset_id uuid,
  expected_version integer,
  target_site_id uuid default null,
  target_custodian_person_id uuid default null,
  target_expected_return_date date default null,
  target_project_id uuid default null,
  target_maintenance_visit_id uuid default null,
  note text default null
)
returns public.equipment_assets
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.equipment_assets := public.private_lock_equipment_asset(target_asset_id, expected_version);
begin
  if existing.status <> 'issued' then
    raise exception 'Only issued equipment can be transferred' using errcode = '22023';
  end if;
  if target_site_id is null then
    raise exception 'A destination Site is required' using errcode = '22023';
  end if;
  if target_site_id is not distinct from existing.current_site_id
     and target_custodian_person_id is not distinct from existing.current_custodian_person_id then
    raise exception 'A transfer must change the Site, the custodian, or both' using errcode = '22023';
  end if;

  perform public.private_assert_inventory_site(target_site_id);
  perform public.private_assert_inventory_person(target_custodian_person_id);
  perform public.private_assert_inventory_context(
    target_project_id, target_maintenance_visit_id, target_site_id
  );
  perform public.private_assert_expected_return_date(target_expected_return_date);

  perform public.private_set_equipment_asset_event(
    'transferred', null, note, target_project_id, target_maintenance_visit_id
  );

  update public.equipment_assets
  set current_site_id = target_site_id,
      current_custodian_person_id = target_custodian_person_id,
      expected_return_date = target_expected_return_date
  where id = existing.id and version = expected_version
  returning * into existing;

  perform public.private_clear_equipment_asset_event();
  return existing;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. PRINCIPAL CORRECTION
-- ---------------------------------------------------------------------------
-- correct_equipment_asset is the Principal's exceptional, audited authority to
-- restate an asset's history. It sets expected_return_date directly, and until
-- now it did so with no date rule at all — so the very state this migration
-- exists to prevent (issued, due back yesterday) could still be created
-- through the correction path.
--
-- The SAME canonical helper is applied. Deliberately not a second date rule
-- written out again here: two copies of a rule are two rules, and they drift.
--
-- Everything else about correction is unchanged — Principal-only, reason
-- required, status and condition required, the controlled-correction marker
-- that alone can reopen a retired asset, and the audited 'corrected' event.
-- Redefined in full because a plpgsql body cannot be partially patched.
--
-- This does NOT touch any existing row. Production's Secateurs keeps its
-- recorded expected return date; the rule applies to what somebody tries to
-- SET from here on.
create or replace function public.correct_equipment_asset(
  target_asset_id uuid,
  expected_version integer,
  target_status text,
  target_condition text,
  target_site_id uuid,
  target_custodian_person_id uuid,
  target_expected_return_date date,
  reason text
)
returns public.equipment_assets
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.equipment_assets;
  clean_reason text := nullif(trim(coalesce(reason, '')), '');
begin
  if not public.private_inventory_is_principal() then
    raise exception 'Only the Principal can correct equipment history' using errcode = '42501';
  end if;
  if clean_reason is null then
    raise exception 'A reason is required to correct equipment' using errcode = '22023';
  end if;
  if target_status is null or target_condition is null then
    raise exception 'A status and a condition are required' using errcode = '22023';
  end if;
  perform public.private_assert_inventory_site(target_site_id);
  perform public.private_assert_inventory_person(target_custodian_person_id);
  perform public.private_assert_expected_return_date(target_expected_return_date);

  existing := public.private_lock_equipment_asset(target_asset_id, expected_version);

  perform public.private_set_equipment_asset_event('corrected', clean_reason);
  -- The correction marker is what allows a retired asset to be reopened at
  -- all; the transition guard refuses every other path into a retired row.
  perform set_config('app.inventory_asset_controlled_correction', 'true', true);
  update public.equipment_assets
  set status = target_status,
      condition = target_condition,
      current_site_id = target_site_id,
      current_custodian_person_id = target_custodian_person_id,
      expected_return_date = target_expected_return_date
  where id = existing.id and version = expected_version
  returning * into existing;
  perform public.private_clear_equipment_asset_event();

  return existing;
end;
$$;
