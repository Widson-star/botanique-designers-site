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
--     quotation/invoice/receipt/payment/balance amounts or awarded-value /
--     gross-margin figures are stored here — only reference strings.
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
  campaign_name text not null unique check (char_length(campaign_name) <= 160),
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
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- 2. leads — front-of-funnel record preserving the manual register's
--    information model (templates/BOTANIQUE_LEAD_REGISTER.csv, 37 cols)
--    with deliberate normalisation. Controlled values match
--    LEAD_OPERATIONS_PLAYBOOK.md §4 / §6.2 exactly.
-- ---------------------------------------------------------------------
-- Deliberately NOT stored (Simple Invoice Manager is the financial
-- source of truth; the Hub holds references only):
--   * Quotation amount   (register col 27)
--   * Awarded project value (register col 30)
--   * Estimated gross margin (register col 32)
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
  client_name text not null check (char_length(client_name) <= 160),
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
  -- referral or organic enquiry).
  campaign_id uuid null references public.campaigns(id) on delete set null,
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
  -- Photos received — playbook §6.2 controlled values.
  photos_received text check (photos_received is null or photos_received in (
    'Yes',
    'No',
    'Partial'
  )),
  -- Qualification status — playbook §6.2 controlled values.
  qualification_status text check (qualification_status is null or qualification_status in (
    'Unqualified',
    'Partially qualified',
    'Qualified',
    'Not a lead'
  )),
  -- Current stage — exactly the 13 §4 stage names.
  current_stage text check (current_stage is null or current_stage in (
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
  -- assessment DATES are deferred to the future site-visits slice.
  assessment_state text check (assessment_state is null or assessment_state in (
    'Not applicable',
    'Not proposed',
    'Proposed',
    'Pending payment',
    'Booked',
    'Completed'
  )),
  -- Quotation reference only (the quotation itself lives in Simple Invoice
  -- Manager). No quotation amount is stored here.
  quotation_reference text check (quotation_reference is null or char_length(quotation_reference) <= 120),
  -- Nullable link to the existing project-delivery record. Set on Won; the
  -- lead row persists so campaign/sales history is never lost. No conversion
  -- logic is implemented in this phase.
  project_id uuid null references public.projects(id) on delete set null,
  project_reference text check (project_reference is null or char_length(project_reference) <= 120),
  -- Outcome — playbook §6.2 controlled values.
  outcome text check (outcome is null or outcome in (
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
  -- No staff member is assigned by seed data.
  owner_id uuid null references public.profiles(id) on delete set null,
  last_contact_date date,
  notes text check (notes is null or char_length(notes) <= 5000),
  archived boolean not null default false,
  archived_at timestamptz,
  archived_by uuid null references auth.users(id),
  created_by uuid null references auth.users(id),
  updated_by uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- 3. lead_activities — append-only activity-history events linked to a
--    lead. No update/delete policies are created: these are historical
--    events (blueprint §2.3, playbook §4). Activity types reconcile the
--    blueprint and playbook.
-- =====================================================================
create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
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
    new.created_by = coalesce(new.created_by, auth.uid());
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
    new.created_by = coalesce(new.created_by, auth.uid());
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
    new.created_by = coalesce(new.created_by, auth.uid());
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

-- =====================================================================
-- 6. Row Level Security.
-- =====================================================================
alter table public.campaigns enable row level security;
alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;

-- ---------------------------------------------------------------------
-- campaigns: owner/manager read+write; staff read-only (to interpret an
-- assigned lead's non-sensitive campaign definition); viewer no access.
-- No delete policy.
-- ---------------------------------------------------------------------
create policy "campaigns_select_owner_manager_staff"
on public.campaigns
for select
to authenticated
using (public.is_owner() or public.is_manager() or public.is_staff());

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
with check (public.is_owner() or public.is_manager());

create policy "leads_update_owner_manager"
on public.leads
for update
to authenticated
using (public.is_owner() or public.is_manager())
with check (public.is_owner() or public.is_manager());

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
