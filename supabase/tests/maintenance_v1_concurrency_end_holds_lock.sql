-- The "lock holder" side of a race: calls end_maintenance_relationship()
-- inside an explicit transaction and sleeps before committing, so its
-- internal FOR UPDATE lock on the parent row stays held for the sleep
-- duration. Pass -v relid=<uuid> on the psql command line.
\set ON_ERROR_STOP on
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000090f1', false);
begin;
select public.end_maintenance_relationship(:'relid'::uuid, 1, 'Race: End holds the lock');
select pg_sleep(2);
commit;
