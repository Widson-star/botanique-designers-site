-- The "attempting" side of a race: a single autocommit visit INSERT. If a
-- concurrent End holds a conflicting lock on the parent row, this blocks
-- until it commits or rolls back. Pass -v relid=<uuid> on the psql command
-- line.
\set ON_ERROR_STOP on
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000090f1', false);
insert into public.maintenance_visits (maintenance_relationship_id, scheduled_date, purpose)
values (:'relid'::uuid, current_date + 10, 'Race test visit attempt');
