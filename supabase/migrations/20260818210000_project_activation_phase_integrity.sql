-- BOTANIQUE DESIGNERS — Project activation phase integrity.
--
-- Inquiry is the PRE-ACTIVE Project position. Activation must move a Project to
-- the delivery phase it is actually entering, so an active Project never sits at
-- Inquiry. This closes the Ongoing + Inquiry path left open when activation
-- changed status alone.
--
-- Deliberately NOT a blanket "Inquiry implies Pending" rule: a Project may be
-- cancelled before it is ever activated, so Cancelled + Inquiry remains valid
-- historical lifecycle truth. Only Ongoing and Paused are rejected at Inquiry.
--
-- Lifecycle enforcement only. No Project row is read or rewritten here.
create or replace function public.tg_project_lifecycle_integrity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  is_insert boolean := tg_op = 'INSERT';
  status_changed boolean := is_insert;
  stage_changed boolean := is_insert;
  type_changed boolean := is_insert;
begin
  if tg_op = 'UPDATE' then
    status_changed := new.status is distinct from old.status;
    stage_changed := new.stage is distinct from old.stage;
    type_changed := new.project_type is distinct from old.project_type;
  end if;

  if not (status_changed or stage_changed or type_changed) then
    return new;
  end if;

  if type_changed and new.project_type = 'Maintenance' then
    raise exception 'Maintenance is an Operations relationship, not a Project type'
      using errcode = '22023';
  end if;

  if stage_changed and new.stage in ('Maintenance', 'Archived', 'Site Visit') then
    raise exception 'Choose a current Project delivery phase; Maintenance, Archived and Site Visit are not current Project stages'
      using errcode = '22023';
  end if;

  if (status_changed or stage_changed) and new.status = 'Pending' and new.stage <> 'Inquiry' then
    raise exception 'A Pending Project must remain at Inquiry until activated'
      using errcode = '22023';
  end if;

  -- New in this migration: an active Project has left the pre-active position.
  if (status_changed or stage_changed) and new.status in ('Ongoing', 'Paused') and new.stage = 'Inquiry' then
    raise exception 'Activate the Project into the delivery phase it is entering; an Ongoing or Paused Project cannot remain at Inquiry'
      using errcode = '22023';
  end if;

  if (status_changed or stage_changed) and new.status = 'Completed' and new.stage <> 'Completed' then
    raise exception 'A Completed Project must have Completed as its delivery phase'
      using errcode = '22023';
  end if;

  if stage_changed and new.stage = 'Completed' and new.status not in ('Completed', 'Design-only') then
    raise exception 'Completed delivery phase requires a Completed or Design-only Project status'
      using errcode = '22023';
  end if;

  if (status_changed or stage_changed) and new.status in ('Ongoing', 'Paused') and new.stage = 'Completed' then
    raise exception 'An Ongoing or Paused Project cannot be in the Completed delivery phase'
      using errcode = '22023';
  end if;

  if (status_changed or stage_changed) and new.status = 'Design-only' and new.stage = 'Implementation' then
    raise exception 'A Design-only Project cannot be in Implementation'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke execute on function public.tg_project_lifecycle_integrity() from public, anon, authenticated;
