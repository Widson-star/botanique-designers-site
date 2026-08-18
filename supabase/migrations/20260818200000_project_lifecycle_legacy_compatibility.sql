-- Reject deprecated Project type/stage values only when inserted or deliberately
-- changed. Legacy rows may still receive unrelated status/operational changes
-- until they are explicitly corrected through the audit tranche.
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
