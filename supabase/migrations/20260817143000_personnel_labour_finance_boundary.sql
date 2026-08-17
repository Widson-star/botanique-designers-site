-- BOTANIQUE DESIGNERS — personnel / labour finance boundary.
--
-- Founder ruling, 17 Aug 2026:
-- - Named Botanique staff are paid through Staff Pay.
-- - Project Cost labour is for casual / site crew, not named staff.
-- - Existing historic staff-labelled Project Costs remain readable and may still
--   receive lifecycle corrections (withdraw/cancel) for audit integrity.
-- - New Project Costs must not create another staff-pay obligation.

create or replace function public.guard_named_staff_project_cost_boundary()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.recipient_type = 'staff'
     and (
       tg_op = 'INSERT'
       or old.recipient_type is distinct from new.recipient_type
     ) then
    raise exception 'Named Botanique staff must be recorded in Staff Pay. Project Cost labour is for casual or site crew.'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_named_staff_project_cost_boundary
  on public.internal_cost_claims;

create trigger guard_named_staff_project_cost_boundary
before insert or update of recipient_type
on public.internal_cost_claims
for each row
execute function public.guard_named_staff_project_cost_boundary();

comment on function public.guard_named_staff_project_cost_boundary() is
  'Prevents new named-staff obligations from entering Project Costs. Existing historical staff-labelled claims remain lifecycle-correctable for audit; named staff pay belongs in Staff Pay.';
