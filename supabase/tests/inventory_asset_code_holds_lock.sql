-- Session A: registers, then holds the transaction open so session B is
-- genuinely concurrent rather than merely sequential.
--
-- It deliberately supplies a manual asset code. A stale client doing exactly
-- this must NOT be able to name the asset — the value is inert and the row
-- must come back with a generated EQP- identity.
\set ON_ERROR_STOP on
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000092f1',true);
select public.register_equipment_asset(:'itemid'::uuid, 'MANUAL-OVERRIDE-A');
select pg_sleep(2);
commit;
