-- =====================================================================
-- Automatic Botanique asset codes — allocation authority
-- =====================================================================
-- Proves the product decision at the database boundary: an operator never
-- chooses an asset code, a stale client cannot impose one, and the generated
-- identity is issued and returned by the registering transaction itself.
\set ON_ERROR_STOP on
begin;

create or replace function pg_temp.assert_true(claim boolean, label text) returns void
language plpgsql as $$
begin
  if claim is distinct from true then
    raise exception 'ASSERTION FAILED: %', label;
  end if;
end;
$$;

create or replace function pg_temp.assert_eq(actual anyelement, expected anyelement, label text) returns void
language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'ASSERTION FAILED: % (expected %, got %)', label, expected, actual;
  end if;
end;
$$;

-- A Principal to act as. Created here rather than reused, so this suite does
-- not depend on the order the runner happens to use. Everything rolls back.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000092f7', 'asset-code-owner@inventory.test');
insert into public.profiles (id, email, full_name, role, is_active) values
  ('00000000-0000-0000-0000-0000000092f7', 'asset-code-owner@inventory.test', 'Asset Code Owner', 'owner', true);

-- Act as the Principal for every ordinary registration below. created_by is
-- stamped from the JWT claim, so the catalogue rows are inserted from here too.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000092f7', true);

insert into public.inventory_items (id, item_name, category, tracking_method, unit_of_measure, is_active)
values
  ('00000000-0000-0000-0000-0000009260f1', 'Code Test Equipment', 'code_fixture', 'asset', 'unit', true),
  ('00000000-0000-0000-0000-0000009260f2', 'Code Test Equipment Two', 'code_fixture', 'asset', 'unit', true);

do $$
declare
  item_a uuid := '00000000-0000-0000-0000-0000009260f1';
  item_b uuid := '00000000-0000-0000-0000-0000009260f2';
  first_asset public.equipment_assets;
  second_asset public.equipment_assets;
  third_asset public.equipment_assets;
  code_arg_count integer;
  seq_owner text;
begin
  -- 1. Registration succeeds with NO asset code supplied at all.
  first_asset := public.register_equipment_asset(item_a);
  perform pg_temp.assert_true(
    first_asset.asset_code ~ '^EQP-[0-9]{4,}$',
    format('1. a registration with no code supplied receives a generated EQP code (got %s)', first_asset.asset_code));

  -- 2. A second registration receives a DIFFERENT, later code.
  second_asset := public.register_equipment_asset(item_a);
  perform pg_temp.assert_true(
    second_asset.asset_code ~ '^EQP-[0-9]{4,}$',
    '2. the second registration is also EQP-formatted');
  perform pg_temp.assert_true(
    second_asset.asset_code <> first_asset.asset_code,
    format('2. the second registration receives a different code (both were %s)', first_asset.asset_code));
  perform pg_temp.assert_true(
    (regexp_match(second_asset.asset_code, '^EQP-([0-9]+)$'))[1]::bigint
      > (regexp_match(first_asset.asset_code, '^EQP-([0-9]+)$'))[1]::bigint,
    '2. codes advance rather than being reused');

  -- 3. A STALE CLIENT CANNOT NAME AN ASSET. Supplying target_asset_code — the
  --    old required argument — must not produce that identity.
  third_asset := public.register_equipment_asset(item_b, 'BD-EQP-001');
  perform pg_temp.assert_true(
    third_asset.asset_code <> 'BD-EQP-001',
    '3. a manually supplied asset code does not become the asset identity');
  perform pg_temp.assert_true(
    third_asset.asset_code ~ '^EQP-[0-9]{4,}$',
    format('3. the supplied code is ignored and a generated one is used instead (got %s)', third_asset.asset_code));

  -- 4. There is no manual escape hatch anywhere in the signature: the only
  --    text argument that could carry a code is the inert one.
  select count(*) into code_arg_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  cross join lateral unnest(p.proargnames) as arg_name
  where n.nspname = 'public' and p.proname = 'register_equipment_asset'
    and arg_name ilike '%code%';
  perform pg_temp.assert_eq(code_arg_count, 1,
    '4. exactly one code-shaped argument survives, and it is the compatibility one');

  -- 4b. And only ONE register_equipment_asset exists — a leftover overload
  --     that still demanded a code would be a live manual escape hatch.
  perform pg_temp.assert_eq(
    (select count(*)::integer from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'register_equipment_asset'),
    1,
    '4b. there is exactly one register_equipment_asset, with no manual-code overload');

  -- 5. The code is issued by the same transaction that registered the asset —
  --    the caller never has to re-read to learn its identity.
  perform pg_temp.assert_eq(
    (select asset_code from public.equipment_assets where id = first_asset.id),
    first_asset.asset_code,
    '5. the returned code is the one actually persisted');

  -- 6. Allocation is a sequence, not a re-read of existing rows. max()+1 would
  --    hand two uncommitted transactions the same number.
  select c.relname into seq_owner from pg_class c
  where c.relname = 'equipment_asset_code_seq' and c.relkind = 'S';
  perform pg_temp.assert_eq(seq_owner, 'equipment_asset_code_seq'::name::text,
    '6. allocation is backed by a real sequence');

  -- 7. The allocator is not reachable by an ordinary client.
  perform pg_temp.assert_eq(
    has_function_privilege('authenticated', 'public.private_next_equipment_asset_code()', 'execute'),
    false,
    '7. the raw allocator is not executable by authenticated');

  -- 8. The uniqueness invariant still stands.
  perform pg_temp.assert_true(
    exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'equipment_assets'
            and indexdef ilike '%unique%' and indexdef ilike '%asset_code%'),
    '8. the unique asset-code index is intact');
end;
$$;

-- 9. Registration remains role-gated: an unauthorised caller gets no code and
--    no asset, rather than burning an identity.
do $$
declare
  refused boolean := false;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000dead', true);
  begin
    perform public.register_equipment_asset('00000000-0000-0000-0000-0000009260f1');
  exception when others then
    refused := true;
  end;
  perform pg_temp.assert_true(refused, '9. an unauthorised caller is still refused');
end;
$$;

-- =====================================================================
-- Sequence initialisation against pre-existing manual codes
-- =====================================================================
-- The Codex P2: asset_code allows 64 characters, so a hand-entered
-- 'EQP-99999999999999999999' is schema-valid and could be in the data being
-- migrated. Casting that suffix straight to bigint raises "bigint out of
-- range" and aborts the whole migration.
--
-- These exercise public.private_initialise_equipment_asset_code_seq() — the
-- SAME function the migration runs — rather than a copy of its SQL, so the
-- thing proved here is the thing that ships.
--
-- Test 9 left the claim pointing at a non-existent user; restore the real
-- Principal, or the audit trigger's updated_by stamp fails its foreign key.
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000092f7', true);

do $$
declare
  item_a uuid := '00000000-0000-0000-0000-0000009260f1';
  normal_asset uuid;
  huge_asset uuid;
  initialised bigint;
  generated public.equipment_assets;
  duplicate_codes integer;
begin
  select id into normal_asset from public.equipment_assets
  where inventory_item_id = item_a order by created_at, id limit 1;
  select id into huge_asset from public.equipment_assets
  where inventory_item_id = item_a and id <> normal_asset order by created_at, id limit 1;

  -- Give the two assets legacy, manually assigned identities of exactly the
  -- kind that could predate automatic allocation. asset_code is a protected
  -- field, so this is the controlled path, not a bypass.
  perform public.private_set_equipment_asset_event('corrected', 'legacy manual code');
  update public.equipment_assets set asset_code = 'eqp-0007' where id = normal_asset;
  update public.equipment_assets set asset_code = 'EQP-99999999999999999999' where id = huge_asset;
  -- Everything else moves OUT of the EQP namespace, so the scan sees exactly
  -- the two legacy codes under test. This doubles as proof that a
  -- non-conforming code like 'BD-EQP-001' never drags the counter upward.
  --
  -- (The sequence is deliberately non-transactional, so codes drawn by earlier
  -- rolled-back suites are already spent. Pinning the fixture explicitly is
  -- what makes the expected value below stable rather than run-order dependent.)
  update public.equipment_assets set asset_code = 'BD-EQP-001'
  where id not in (normal_asset, huge_asset);
  perform public.private_clear_equipment_asset_event();

  -- B. THE DEFECT. Initialisation must survive the oversized suffix. Before
  --    the fix this raised 22003 bigint out of range and aborted the migration.
  initialised := public.private_initialise_equipment_asset_code_seq();

  -- A. The representable code is respected, and case-insensitively: 'eqp-0007'
  --    already occupies 'EQP-0007' under the upper(trim(...)) unique index.
  perform pg_temp.assert_eq(initialised, 7::bigint,
    'A. the lower-case eqp-0007 is respected case-insensitively and sets the counter');

  -- B2. The oversized code did not drag the counter to something absurd. It
  --     is above bigint, so no generated code can ever collide with it.
  perform pg_temp.assert_true(initialised <= 9223372036854775807::bigint,
    'B. an oversized manual suffix is ignored rather than adopted');

  -- C. Ordinary registration still works, and continues ABOVE the existing code.
  generated := public.register_equipment_asset(item_a);
  perform pg_temp.assert_eq(generated.asset_code, 'EQP-0008',
    'C. the next generated code continues above the highest representable existing code');
  perform pg_temp.assert_true(generated.asset_code ~ '^EQP-[0-9]{4,}$',
    'C. the generated code is still EQP-formatted');

  -- D. A manually supplied code remains inert even now.
  generated := public.register_equipment_asset(item_a, 'EQP-99999999999999999999');
  perform pg_temp.assert_true(generated.asset_code <> 'EQP-99999999999999999999',
    'D. a manually supplied code is still inert after initialisation');
  perform pg_temp.assert_eq(generated.asset_code, 'EQP-0009',
    'D. allocation simply continues, ignoring what the caller passed');

  -- E. Uniqueness holds across the whole table, case-insensitively.
  select count(*) into duplicate_codes from (
    select upper(btrim(asset_code)) as code from public.equipment_assets
    group by 1 having count(*) > 1
  ) duplicates;
  perform pg_temp.assert_eq(duplicate_codes, 0, 'E. no duplicate asset code exists');
end;
$$;

-- With nothing in the EQP namespace at all, initialisation must report
-- "nothing allocated yet" rather than a number, so the very first generated
-- code on a fresh database is EQP-0001.
--
-- Achieved by moving every code OUT of the namespace rather than by deleting
-- rows: equipment_asset_events references these assets, and the immutable
-- event ledger is not something a test gets to tear down.
do $$
declare
  scratch bigint;
begin
  perform public.private_set_equipment_asset_event('corrected', 'clearing the EQP namespace');
  update public.equipment_assets set asset_code = 'LEGACY-' || left(id::text, 8);
  perform public.private_clear_equipment_asset_event();

  scratch := public.private_initialise_equipment_asset_code_seq();
  perform pg_temp.assert_eq(scratch, 0::bigint,
    'F. an empty EQP namespace initialises to zero, so the first code is EQP-0001');
  perform pg_temp.assert_eq(public.private_next_equipment_asset_code(), 'EQP-0001',
    'F. the first code on a fresh database is EQP-0001');
end;
$$;

rollback;
