-- BD-OPERATIONS-HUB-01 — Phase 1A: Lead Data and RLS Foundation.
-- Additive, non-destructive migration. Review before applying to the
-- Botanique-only Supabase project. This migration adds three new tables
-- (campaigns, leads, lead_activities) with audit triggers and RLS. It does
-- NOT drop, rename or rewrite any existing table, column, policy, function
-- or trigger from 20260614000100_admin_foundation.sql, and it does NOT
-- weaken the owner-only project_financial_references policies.
--
-- Boundaries preserved (see BOTANIQUE_OPERATIONS_HUB_BLUEPRINT.md and
-- LEAD_OPERATIONS_PLAYBOOK.md):
--   * Simple Invoice Manager remains the financial source of truth. No
--     quotation/invoice/receipt/payment/balance amounts, awarded-value or
--     gross-margin figures are stored here. The quotation IDENTIFIER is also
--     NOT stored in Phase 1A: leads is manager/staff-readable, so the quotation
--     reference is deferred to a future OWNER-ONLY mechanism. Only the
--     non-financial project-tracking reference (project_reference/project_id,
--     already within manager operational authority) is kept.
--   * The existing projects table remains the project-delivery authority.
--     leads.project_id is a NULLABLE reference only; no conversion logic
--     is implemented in this phase.
--   * No site-visit / calendar table is created here (Phase 1B). The lead's
--     current assessment position is held as constrained text only; the
--     assessment schedule/paid/completion DATES are deferred to the future
--     site-visits slice.
--
-- Reuses the existing role helpers from the admin foundation migration:
--   public.is_owner(), public.is_manager(), public.is_staff(),
--   public.current_user_role() — all SECURITY DEFINER with search_path set.

-- pgcrypto (gen_random_uuid) is already created by the admin foundation
-- migration; this is a defensive no-op if run independently.
create extension if not exists pgcrypto;

-- =====================================================================
-- 1. campaigns — minimal canonical campaign-definition table.
-- ---------------------------------------------------------------------
-- Campaign NAMES follow the LEAD_OPERATIONS_PLAYBOOK.md §7 standard
-- (platform_objective_service_audience_period). Lead-specific ad-set,
-- creative and keyword values live on the individual lead row, NOT here.
-- No live campaign rows are seeded by this migration.
-- =====================================================================
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  -- Canonical campaign name enforced to the LEAD_OPERATIONS_PLAYBOOK.md §7
  -- standard: lowercase, underscore-delimited tokens
  -- (platform_objective_service_audience_period), e.g.
  -- meta_prospecting_landscape_design_residential_2026q3. The pattern rejects
  -- blank, uppercase, whitespace-delimited and punctuation-based names.
  campaign_name text not null unique check (
    char_length(campaign_name) <= 160
    and campaign_name ~ '^[a-z0-9]+(_[a-z0-9]+)*$'
  ),
  -- Source platform matches the playbook §6.2 controlled value list.
  source_platform text not null check (source_platform in (
    'Instagram',
    'Facebook',
    'Google Search',
    'Google Business Profile',
    'Organic website',
    'Referral',
    'Returning client',
    'Directory',
    'WhatsApp direct',
    'Other'
  )),
  objective text check (objective is null or char_length(objective) <= 120),
  service_focus text check (service_focus is null or char_length(service_focus) <= 160),
  audience text check (audience is null or char_length(audience) <= 160),
  period_label text check (period_label is null or char_length(period_label) <= 60),
  start_date date,
  end_date date,
  is_active boolean not null default true,
  notes text check (notes is null or char_length(notes) <= 5000),
  created_by uuid null references auth.users(id),
  updated_by uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- When both dates are present the campaign must not end before it starts.
  constraint campaigns_date_order
    check (start_date is null or end_date is null or end_date >= start_date)
);

-- =====================================================================
-- 2. leads — front-of-funnel record preserving the manual register's
--    information model (templates/BOTANIQUE_LEAD_REGISTER.csv, 37 cols)
--    with deliberate normalisation. Controlled values match
--    LEAD_OPERATIONS_PLAYBOOK.md §4 / §6.2 exactly.
-- ---------------------------------------------------------------------
-- Deliberately NOT stored (Simple Invoice Manager is the financial
-- source of truth):
--   * Quotation amount   (register col 27)
--   * Awarded project value (register col 30)
--   * Estimated gross margin (register col 32)
-- Deferred to a future OWNER-ONLY protected reference mechanism (leads is
-- manager/staff-readable, so a quotation document number must not live here):
--   * Quotation reference (register col 28)
-- Deferred to the future site-visits slice (Phase 1B):
--   * Assessment date (col 21) and Assessment completion date (col 24).
--   assessment_state below holds only the lead's CURRENT position.
-- =====================================================================
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  -- Human-readable BD-LEAD-YYYY-NNN identifier. Manually supplied and
  -- validated (no automated generation in this phase — the playbook §6.1
  -- states IDs are assigned manually in sequence per year, and no safe
  -- concurrency pattern is established yet).
  lead_identifier text not null unique
    check (lead_identifier ~ '^BD-LEAD-[0-9]{4}-[0-9]{3}$'),
  lead_date date not null,
  -- Nullable so an incomplete first enquiry can be captured without inventing
  -- a name. When supplied it must be non-blank after trimming and bounded.
  -- Never substitute 'Unknown', a WhatsApp display name or any placeholder.
  client_name text check (
    client_name is null
    or (char_length(trim(client_name)) > 0 and char_length(client_name) <= 160)
  ),
  telephone text check (telephone is null or char_length(telephone) <= 40),
  source_platform text not null check (source_platform in (
    'Instagram',
    'Facebook',
    'Google Search',
    'Google Business Profile',
    'Organic website',
    'Referral',
    'Returning client',
    'Directory',
    'WhatsApp direct',
    'Other'
  )),
  -- Nullable campaign relationship; a lead may have no campaign (e.g. a
  -- referral or organic enquiry). ON DELETE RESTRICT preserves historical
  -- campaign attribution: retire a campaign via is_active, never by deleting
  -- it out from under its leads.
  campaign_id uuid null references public.campaigns(id) on delete restrict,
  -- Attribution — free text / N/A / Unknown per playbook §6.2. Never PII.
  ad_set_audience text check (ad_set_audience is null or char_length(ad_set_audience) <= 160),
  creative_variant text check (creative_variant is null or char_length(creative_variant) <= 160),
  keyword_search_term text check (keyword_search_term is null or char_length(keyword_search_term) <= 160),
  landing_source_context text check (landing_source_context is null or char_length(landing_source_context) <= 200),
  service text check (service is null or char_length(service) <= 160),
  location text check (location is null or char_length(location) <= 160),
  project_size text check (project_size is null or char_length(project_size) <= 120),
  -- Budget RANGE is an indicative qualification input (one of the four
  -- §3.2 minimums), stored as bounded text (e.g. "KSh 300k-500k"). It is
  -- NOT a financial source record (no quotation/invoice/payment amount).
  budget_range text check (budget_range is null or char_length(budget_range) <= 120),
  site_condition text check (site_condition is null or char_length(site_condition) <= 200),
  property_site_type text check (property_site_type is null or char_length(property_site_type) <= 120),
  -- Photos received — playbook §6.2 controlled values. Non-null operational
  -- state with a safe initial default.
  photos_received text not null default 'No' check (photos_received in (
    'Yes',
    'No',
    'Partial'
  )),
  -- Qualification status — playbook §6.2 controlled values. Defaults to the
  -- lowest state so a new capture is never in an undefined status.
  qualification_status text not null default 'Unqualified' check (qualification_status in (
    'Unqualified',
    'Partially qualified',
    'Qualified',
    'Not a lead'
  )),
  -- Current stage — exactly the 13 §4 stage names. Defaults to the funnel entry.
  current_stage text not null default 'New enquiry' check (current_stage in (
    'New enquiry',
    'Qualifying',
    'Awaiting photos',
    'Qualified',
    'Assessment proposed',
    'Assessment pending payment',
    'Assessment booked',
    'Quotation preparing',
    'Quotation sent',
    'Won',
    'Lost',
    'Nurture',
    'Existing client'
  )),
  -- Assessment position as constrained text (Phase 1A normalisation of the
  -- register's Assessment proposed/paid/completed booleans). The actual
  -- assessment DATES are deferred to the future site-visits slice. Defaults
  -- to 'Not proposed' (no assessment offered yet).
  assessment_state text not null default 'Not proposed' check (assessment_state in (
    'Not applicable',
    'Not proposed',
    'Proposed',
    'Pending payment',
    'Booked',
    'Completed'
  )),
  -- NOTE: no quotation_reference column exists on this table by design.
  -- `public.leads` is manager-readable and assigned-staff-readable, and the
  -- Botanique admin authority prohibits managers/staff from receiving
  -- quotation/financial document numbers. The Simple Invoice Manager quotation
  -- IDENTIFIER (register col 28) is therefore DEFERRED to a future OWNER-ONLY
  -- lead-commercial-reference mechanism (not built in Phase 1A), preserving the
  -- existing owner-only finance boundary. Only NON-financial quotation
  -- WORKFLOW STATE is represented here: current_stage 'Quotation preparing' /
  -- 'Quotation sent' and lead_activities.activity_type 'Quotation issued' —
  -- never a quotation number, amount, PDF link, payment reference or document id.
  -- Nullable link to the existing project-delivery record. Set on Won; the
  -- lead row persists so campaign/sales history is never lost. No conversion
  -- logic is implemented in this phase. ON DELETE RESTRICT preserves the
  -- won-lead linkage: archive the project via its existing archive mechanism
  -- rather than deleting it and severing the lead's project reference.
  project_id uuid null references public.projects(id) on delete restrict,
  project_reference text check (project_reference is null or char_length(project_reference) <= 120),
  -- Outcome — playbook §6.2 controlled values. Defaults to 'Open'.
  outcome text not null default 'Open' check (outcome in (
    'Open',
    'Won',
    'Lost',
    'Nurture',
    'Not a lead'
  )),
  lost_reason text check (lost_reason is null or char_length(lost_reason) <= 500),
  next_follow_up_date date,
  -- Nullable assigned lead owner referencing the profile/identity spine.
  -- Nullable BY DESIGN: the future dashboard needs an unassigned-lead queue.
  -- No staff member is assigned by seed data. Kept ON DELETE SET NULL so a
  -- departed user never causes lead deletion (only the assignment clears).
  -- A NON-NULL owner_id is additionally validated by the RLS WITH CHECK via
  -- public.is_valid_lead_owner() so it must reference an ACTIVE owner/manager/
  -- staff profile (never inactive, never a viewer, never nonexistent).
  owner_id uuid null references public.profiles(id) on delete set null,
  last_contact_date date,
  notes text check (notes is null or char_length(notes) <= 5000),
  archived boolean not null default false,
  archived_at timestamptz,
  archived_by uuid null references auth.users(id),
  created_by uuid null references auth.users(id),
  updated_by uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Clearly-authorised cross-field integrity only (playbook §5.2):
  --   * a Lost outcome must record a non-blank lost reason;
  --   * a Nurture outcome must record a next follow-up (nurture) date.
  -- Open leads are intentionally NOT required to have an owner (the
  -- unassigned queue is deliberate), and no broader workflow triggers are added.
  constraint leads_lost_requires_reason
    check (outcome <> 'Lost'
           or (lost_reason is not null and char_length(trim(lost_reason)) > 0)),
  constraint leads_nurture_requires_followup
    check (outcome <> 'Nurture' or next_follow_up_date is not null)
);

-- =====================================================================
-- 3. lead_activities — append-only activity-history events linked to a
--    lead. No update/delete policies are created: these are historical
--    events (blueprint §2.3, playbook §4). Activity types reconcile the
--    blueprint and playbook.
-- =====================================================================
create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  -- ON DELETE RESTRICT: activity history must not be silently erased by
  -- deleting its lead. Leads are retained via their archive mechanism, never
  -- hard-deleted through a policy in this phase.
  lead_id uuid not null references public.leads(id) on delete restrict,
  activity_type text not null check (activity_type in (
    'Enquiry received',
    'Reply sent',
    'Photos requested',
    'Photos received',
    'Follow-up',
    'Assessment proposed',
    'Assessment payment confirmed',
    'Site visit completed',
    'Quotation issued',
    'Client decision',
    'Won',
    'Lost',
    'Nurture',
    'Note'
  )),
  -- When the event actually occurred. A client MAY legitimately backdate
  -- this to when a real event happened; the audit trigger defaults it to
  -- now() but does not overwrite a supplied value.
  occurred_at timestamptz not null default now(),
  summary text check (summary is null or char_length(summary) <= 2000),
  -- Actor is system-controlled (see trigger below).
  created_by uuid null references auth.users(id),
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 4. Audit-field hardening — same model as the admin foundation migration
--    (BD-OPS-08B). Actor/timestamp columns are SYSTEM-CONTROLLED: the
--    BEFORE triggers ignore client-supplied values and derive them from
--    auth.uid() / now(). auth.uid() is schema-qualified so behaviour is
--    independent of search_path.
-- =====================================================================

create or replace function public.tg_audit_campaigns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    new.created_at = now();
    new.updated_at = now();
    -- created_by is OVERWRITTEN (not coalesced) from the session so a client
    -- cannot spoof another actor's identity on insert.
    new.created_by = auth.uid();
    new.updated_by = auth.uid();
  elsif (tg_op = 'UPDATE') then
    new.created_at = old.created_at;
    new.created_by = old.created_by;
    new.updated_at = now();
    new.updated_by = auth.uid();
  end if;
  return new;
end;
$$;

-- leads: actor/timestamp protection plus archive provenance, mirroring
-- tg_audit_projects. archived_at/archived_by are derived from the archived
-- flag transition and can never be set directly by any client.
create or replace function public.tg_audit_leads()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    new.created_at = now();
    new.updated_at = now();
    -- created_by is OVERWRITTEN (not coalesced) from the session so a client
    -- cannot spoof another actor's identity on insert.
    new.created_by = auth.uid();
    new.updated_by = auth.uid();
    if (new.archived is true) then
      new.archived_at = now();
      new.archived_by = auth.uid();
    else
      new.archived_at = null;
      new.archived_by = null;
    end if;
  elsif (tg_op = 'UPDATE') then
    new.created_at = old.created_at;
    new.created_by = old.created_by;
    new.updated_at = now();
    new.updated_by = auth.uid();
    -- The human-readable lead identifier is a stable reconciliation key and
    -- must never drift after creation (the UUID remains the internal PK).
    new.lead_identifier = old.lead_identifier;
    if (new.archived is true and old.archived is distinct from true) then
      new.archived_at = now();
      new.archived_by = auth.uid();
    else
      -- No archive transition (or un-archive): preserve the historical
      -- archive event and prevent clients forging these values.
      new.archived_at = old.archived_at;
      new.archived_by = old.archived_by;
    end if;
  end if;
  return new;
end;
$$;

-- lead_activities: append-only. Only INSERT is expected (no update/delete
-- policy exists). created_by/created_at are system-controlled; occurred_at
-- is defaulted but not overwritten so real event times can be recorded.
create or replace function public.tg_audit_lead_activities()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    new.created_at = now();
    -- created_by is OVERWRITTEN (not coalesced) from the session so a client
    -- cannot spoof another actor on an append-only history event.
    new.created_by = auth.uid();
    -- occurred_at is defaulted but NOT overwritten: a client may legitimately
    -- record when a real event actually happened.
    new.occurred_at = coalesce(new.occurred_at, now());
  elsif (tg_op = 'UPDATE') then
    -- Defensive only: no UPDATE policy exists for this table. Preserve the
    -- original historical values if an update ever occurs (e.g. by owner).
    new.created_at = old.created_at;
    new.created_by = old.created_by;
    new.occurred_at = old.occurred_at;
    new.lead_id = old.lead_id;
    new.activity_type = old.activity_type;
  end if;
  return new;
end;
$$;

create trigger campaigns_audit
before insert or update on public.campaigns
for each row execute function public.tg_audit_campaigns();

create trigger leads_audit
before insert or update on public.leads
for each row execute function public.tg_audit_leads();

create trigger lead_activities_audit
before insert or update on public.lead_activities
for each row execute function public.tg_audit_lead_activities();

-- =====================================================================
-- 5. Lead-assignment helper. Narrowly scoped: true only when the given
--    lead is owned by the authenticated user. SECURITY DEFINER with an
--    explicit search_path; it cannot widen access to unrelated leads.
--    owner_id references profiles(id), whose id equals auth.uid().
-- =====================================================================
create or replace function public.is_assigned_to_lead(target_lead_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.leads
    where id = target_lead_id
      and owner_id = auth.uid()
  )
$$;

-- Validate a lead-owner target. Returns true when owner_id is NULL (the
-- intentional unassigned-lead queue) OR references an ACTIVE profile whose
-- role is owner/manager/staff. Rejects inactive profiles, viewers and
-- nonexistent profiles. SECURITY DEFINER with an explicit search_path; it
-- reads only profiles and cannot widen access.
create or replace function public.is_valid_lead_owner(target_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_owner_id is null or exists (
    select 1
    from public.profiles
    where id = target_owner_id
      and is_active = true
      and role in ('owner', 'manager', 'staff')
  )
$$;

-- Execution is restricted: these are INTERNAL RLS helpers, not public API
-- endpoints. Anonymous callers must not execute them; authenticated users may
-- because the RLS policies below depend on them. This does not broaden the data
-- they return, and they retain their explicit search_path and fully-qualified
-- table references.
revoke execute on function public.is_assigned_to_lead(uuid) from public;
revoke execute on function public.is_assigned_to_lead(uuid) from anon;
grant execute on function public.is_assigned_to_lead(uuid) to authenticated;

revoke execute on function public.is_valid_lead_owner(uuid) from public;
revoke execute on function public.is_valid_lead_owner(uuid) from anon;
grant execute on function public.is_valid_lead_owner(uuid) to authenticated;

-- =====================================================================
-- 6. Row Level Security.
-- =====================================================================
alter table public.campaigns enable row level security;
alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;

-- ---------------------------------------------------------------------
-- campaigns: owner/manager read+write only. Phase 1A ships NO staff
-- lead-management UI, so staff have NO campaign-table access (least
-- privilege). Viewer: no access. No delete policy. If a later slice proves
-- assigned staff must read campaign detail, add a policy restricted to
-- campaigns referenced by that staff member's own assigned leads — never a
-- blanket all-campaigns SELECT.
-- ---------------------------------------------------------------------
create policy "campaigns_select_owner_manager"
on public.campaigns
for select
to authenticated
using (public.is_owner() or public.is_manager());

create policy "campaigns_insert_owner_manager"
on public.campaigns
for insert
to authenticated
with check (public.is_owner() or public.is_manager());

create policy "campaigns_update_owner_manager"
on public.campaigns
for update
to authenticated
using (public.is_owner() or public.is_manager())
with check (public.is_owner() or public.is_manager());

-- ---------------------------------------------------------------------
-- leads: owner/manager may select/insert/update all operational leads
-- (manager gains NO finance access — no finance columns exist on this
-- table). Staff may select ONLY leads assigned to their own profile.
-- Staff mutation is intentionally DEFERRED (no staff insert/update policy)
-- until it can be made assignment-scoped and column-safe. Viewer: none.
-- No delete policy — archive via the archived flag instead.
-- ---------------------------------------------------------------------
create policy "leads_select_owner_manager_assigned_staff"
on public.leads
for select
to authenticated
using (
  public.is_owner()
  or public.is_manager()
  or (public.is_staff() and owner_id = auth.uid())
);

create policy "leads_insert_owner_manager"
on public.leads
for insert
to authenticated
with check (
  (public.is_owner() or public.is_manager())
  and public.is_valid_lead_owner(owner_id)
);

create policy "leads_update_owner_manager"
on public.leads
for update
to authenticated
using (public.is_owner() or public.is_manager())
with check (
  (public.is_owner() or public.is_manager())
  and public.is_valid_lead_owner(owner_id)
);

-- ---------------------------------------------------------------------
-- lead_activities: owner/manager may select+insert for any visible lead.
-- Assigned staff may select+insert only for their own assigned leads.
-- NO update or delete policy for any role — activity history is immutable
-- through normal authenticated policies. Viewer: none.
-- ---------------------------------------------------------------------
create policy "lead_activities_select_owner_manager_assigned"
on public.lead_activities
for select
to authenticated
using (
  public.is_owner()
  or public.is_manager()
  or (public.is_staff() and public.is_assigned_to_lead(lead_id))
);

create policy "lead_activities_insert_owner_manager_assigned"
on public.lead_activities
for insert
to authenticated
with check (
  public.is_owner()
  or public.is_manager()
  or (public.is_staff() and public.is_assigned_to_lead(lead_id))
);

-- No delete policies are intentionally created on any of the three tables.
-- No update or delete policy exists on lead_activities (append-only).

-- =====================================================================
-- 7. Indexes for expected operational queries.
--   (campaign_name and lead_identifier are already indexed by their
--    UNIQUE constraints.)
-- =====================================================================
create index if not exists campaigns_is_active_idx on public.campaigns (is_active);

create index if not exists leads_current_stage_idx on public.leads (current_stage);
create index if not exists leads_qualification_status_idx on public.leads (qualification_status);
create index if not exists leads_outcome_idx on public.leads (outcome);
create index if not exists leads_owner_id_idx on public.leads (owner_id);
create index if not exists leads_next_follow_up_date_idx on public.leads (next_follow_up_date);
create index if not exists leads_campaign_id_idx on public.leads (campaign_id);
create index if not exists leads_project_id_idx on public.leads (project_id);

create index if not exists lead_activities_lead_occurred_idx
  on public.lead_activities (lead_id, occurred_at desc);
