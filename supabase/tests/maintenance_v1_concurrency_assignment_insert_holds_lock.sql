-- The "lock holder" side of a race: inserts a Maintenance assignment inside
-- an explicit transaction and sleeps before committing, so the FOR SHARE
-- lock tg_audit_maintenance_assignments() takes on the parent row stays
-- held for the sleep duration. Pass -v relid=<uuid> on the psql command
-- line.
\set ON_ERROR_STOP on
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000090f1', false);
begin;
insert into public.maintenance_assignments (maintenance_relationship_id, person_id, role, start_date)
values (:'relid'::uuid, '00000000-0000-0000-0000-0000009020b1', 'support', current_date);
select pg_sleep(2);
commit;
