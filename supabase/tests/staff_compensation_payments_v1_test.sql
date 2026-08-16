-- Staff Compensation Payment Truth V1 regression contract.
\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$ begin
  if value is not true then raise exception 'ASSERTION FAILED: %', message; end if;
end $$;

insert into auth.users (id,email) values
 ('00000000-0000-0000-0000-000000000201','owner@staff-pay.test'),
 ('00000000-0000-0000-0000-000000000202','manager@staff-pay.test');
insert into public.profiles (id,email,full_name,role,is_active) values
 ('00000000-0000-0000-0000-000000000201','owner@staff-pay.test','Principal','owner',true),
 ('00000000-0000-0000-0000-000000000202','manager@staff-pay.test','Manager','manager',true);

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000202',true);
insert into public.people (id,full_name,relationship_type,is_active) values
 ('20000000-0000-0000-0000-000000000201','Compensation Beneficiary','regular_staff',true);
reset role;

insert into public.projects (
 id,project_name,project_type,status,stage,archived,portfolio_eligible,portfolio_permission_status
) values (
 '30000000-0000-0000-0000-000000000201','Completed Payment Context','Residential','Completed','Completed',false,false,'Not Reviewed'
);

-- Seed one already-approved compensation record. Payment truth is what this test owns.
insert into public.staff_compensations (
 id,person_id,project_id,service_date,compensation_type,description,lifecycle,
 request_round,submitted_amount,approved_amount,requester_id,decider_id,version,
 submitted_at,decided_at
) values (
 '40000000-0000-0000-0000-000000000201',
 '20000000-0000-0000-0000-000000000201',
 '30000000-0000-0000-0000-000000000201',
 current_date,'compensation','Approved compensation', 'approved',1,60000,60000,
 '00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000201',3,
 now(),now()
);

select pg_temp.assert_true(
  not has_table_privilege('authenticated','public.staff_compensation_payments','INSERT'),
  'payments have no direct authenticated INSERT'
);
select pg_temp.assert_true(
  (select relrowsecurity from pg_class where oid='public.staff_compensation_payments'::regclass),
  'payment RLS enabled'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000202',true);

-- Manager may read but cannot record money movement.
do $$ begin
  perform public.record_staff_compensation_payment(
    '40000000-0000-0000-0000-000000000201',15000,current_date,'mpesa','MGR-FAIL',null);
  raise exception 'expected manager payment rejection';
exception when insufficient_privilege then null; end $$;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000201',true);

-- Principal records 15k + 5k + 10k against approved 60k.
do $$ declare p public.staff_compensation_payments; begin
  p:=public.record_staff_compensation_payment(
    '40000000-0000-0000-0000-000000000201',15000,current_date,'mpesa','P1','First pay');
  perform set_config('test.staff_pay.first',p.id::text,true);
  perform pg_temp.assert_true(p.recorded_by=auth.uid(),'actual actor recorded');
  perform pg_temp.assert_true(p.status='recorded' and p.version=1,'first payment recorded');
end $$;
select public.record_staff_compensation_payment(
  '40000000-0000-0000-0000-000000000201',5000,current_date,'cash',null,'Second pay');
select public.record_staff_compensation_payment(
  '40000000-0000-0000-0000-000000000201',10000,current_date,'bank_transfer','P3','Third pay');

select pg_temp.assert_true(
  (select paid_amount=30000 and balance_amount=30000 and payment_count=3 and payment_status='part_paid'
   from public.staff_compensation_payment_positions()
   where compensation_id='40000000-0000-0000-0000-000000000201'),
  '60k approved, 30k paid, 30k outstanding'
);
select pg_temp.assert_true(
  (select status='Completed' from public.projects where id='30000000-0000-0000-0000-000000000201'),
  'payment never reopens Completed Project'
);

-- Overpayment is rejected.
do $$ begin
  perform public.record_staff_compensation_payment(
    '40000000-0000-0000-0000-000000000201',31000,current_date,'cash',null,null);
  raise exception 'expected overpayment rejection';
exception when sqlstate 'BSC02' then null; end $$;

-- Reversal restores the outstanding balance and preserves immutable history.
do $$ declare p public.staff_compensation_payments; begin
  p:=public.reverse_staff_compensation_payment(
    current_setting('test.staff_pay.first')::uuid,1,'Wrong payment reference');
  perform pg_temp.assert_true(p.status='reversed' and p.version=2,'payment reversed by correction');
end $$;
select pg_temp.assert_true(
  (select paid_amount=15000 and balance_amount=45000 and payment_count=2 and payment_status='part_paid'
   from public.staff_compensation_payment_positions()
   where compensation_id='40000000-0000-0000-0000-000000000201'),
  'reversal restores financial position'
);
select pg_temp.assert_true(
  (select count(*)=4 from public.staff_compensation_payment_events
   where compensation_id='40000000-0000-0000-0000-000000000201'),
  'three recordings plus reversal are preserved as events'
);

-- Paid compensation cannot be cancelled until recorded payments are reversed.
do $$ begin
  perform public.cancel_staff_compensation(
    '40000000-0000-0000-0000-000000000201',3,'Cancel paid compensation');
  raise exception 'expected paid cancellation guard';
exception when sqlstate 'BSC03' then null; end $$;

reset role;
rollback;
