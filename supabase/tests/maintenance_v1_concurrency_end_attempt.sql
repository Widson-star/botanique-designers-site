-- The "attempting" side of a race: calls end_maintenance_relationship() as
-- a single autocommit statement. If a concurrent session holds a
-- conflicting lock on the same parent row, this blocks until that session
-- commits or rolls back. Pass -v relid=<uuid> on the psql command line.
\set ON_ERROR_STOP on
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000090f1', false);
select public.end_maintenance_relationship(:'relid'::uuid, 1, 'Race: End attempts');
