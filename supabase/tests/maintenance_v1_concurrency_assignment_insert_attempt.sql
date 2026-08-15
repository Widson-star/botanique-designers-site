-- The "attempting" side of a race: a single autocommit assignment INSERT.
-- If a concurrent End holds a conflicting lock on the parent row, this
-- blocks until it commits or rolls back. Pass -v relid=<uuid> on the psql
-- command line.
\set ON_ERROR_STOP on
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000090f1', false);
insert into public.maintenance_assignments (maintenance_relationship_id, person_id, role, start_date)
values (:'relid'::uuid, '00000000-0000-0000-0000-0000009020b1', 'support', current_date);
