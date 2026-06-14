-- Botanique Admin — project tracker record corrections + Mununga insert.
-- ---------------------------------------------------------------------------
-- MANUAL, REVIEW-ONLY. This file lives in supabase/seeds/ (NOT migrations/) so
-- `supabase db push` does NOT auto-apply it. Run it by hand against the
-- botanique-admin project ONLY after Widson's final review.
--
-- Operational fields only. NO financial references, invoice/estimate/receipt
-- numbers, amounts, balances, payment status, PDF links, or financial notes.
-- NO private client contact details (phone/email/Tax ID). Audit/actor columns
-- are left to the tg_audit_projects trigger (running via the SQL editor leaves
-- updated_by/created_by null because auth.uid() is null there — expected).
--
-- Idempotent: UPDATEs match both old and renamed names; the INSERT is guarded.
-- ---------------------------------------------------------------------------

begin;

-- 1. Karen Residence — Fountain Garden & Mature Borders (Karen, Nairobi; Residential; Ongoing/Implementation)
update public.projects set
  client_site_name = 'Karen Residence',
  location = 'Karen',
  county = 'Nairobi',
  project_type = 'Residential',
  status = 'Ongoing',
  stage = 'Implementation'
where project_name = 'Karen Residence — Fountain Garden & Mature Borders';

-- 2. Muthithi Gardens Estate (Muthithi Estate, Kiambu County; Completed/Completed). Separate from Mununga.
update public.projects set
  client_site_name = 'Muthithi Estate',
  location = 'Muthithi',
  county = 'Kiambu',
  project_type = 'Estate',
  status = 'Completed',
  stage = 'Completed'
where project_name = 'Muthithi Gardens Estate';

-- 3. Zaara Park — Design Concept (Zara Park LLC / Zaara Park; Mogadishu, Somalia; Design-only/Concept Design)
--    No implementation claim, no acreage/budget claim. County left null (international site).
update public.projects set
  client_site_name = 'Zara Park LLC / Zaara Park',
  location = 'Kaaran Area, Mogadishu, Somalia',
  county = null,
  project_type = 'Design Concept',
  status = 'Design-only',
  stage = 'Concept Design',
  notes = 'Design concept only. No implementation claim. No acreage or budget claim.'
where project_name = 'Zaara Park — Design Concept';

-- 4. KSMS / CBK-IMS Landscape Work (Nairobi; Institutional; Completed/Completed).
--    KSMS rebranded to CBK-IMS — recorded as one continuous engagement.
update public.projects set
  client_site_name = 'KSMS / CBK-IMS',
  location = 'Nairobi',
  county = 'Nairobi',
  project_type = 'Institutional',
  status = 'Completed',
  stage = 'Completed',
  notes = 'KSMS rebranded to CBK-IMS; recorded as one continuous engagement.'
where project_name = 'KSMS / CBK-IMS Landscape Work';

-- 5. Rift and Ridge Diani Resort (Diani, Kwale; Hospitality; Design-only/Concept Design).
--    Formerly "Serenity Diani / Diani Resort Concept".
update public.projects set
  project_name = 'Rift and Ridge Diani Resort',
  client_site_name = 'Rift and Ridge Diani Resort',
  location = 'Diani',
  county = 'Kwale',
  project_type = 'Hospitality',
  status = 'Design-only',
  stage = 'Concept Design',
  notes = 'Formerly Serenity Diani / Diani Resort Concept. Design-only / Concept Design unless implementation is later confirmed.'
where project_name in ('Serenity Diani / Diani Resort Concept', 'Rift and Ridge Diani Resort');

-- 6. Tsavo Company Projects (temporary holding row). "Tsavo" = several separate
--    Tsavo company projects in different locations; split into specific rows later.
--    Status/stage/type intentionally left unchanged (unconfirmed per project).
update public.projects set
  project_name = 'Tsavo Company Projects',
  client_site_name = 'Tsavo (multiple projects)',
  notes = 'Temporary holding row. Tsavo refers to multiple separate Tsavo company projects in different locations. To be split into specific Tsavo project rows.'
where project_name in ('Tsavo Project', 'Tsavo Company Projects');

-- 7. Mununga Corridor Garden Landscaping (NEW; Mununga, Murang'a; Residential; Completed/Completed).
--    Client label: Terry. Separate project from Muthithi Gardens Estate (Kiambu).
insert into public.projects (
  project_name, client_site_name, location, county,
  project_type, status, stage, portfolio_eligible, portfolio_permission_status, notes
)
select
  'Mununga Corridor Garden Landscaping', 'Terry', 'Mununga', 'Murang''a',
  'Residential', 'Completed', 'Completed', false, 'Not Reviewed',
  'Separate project from Muthithi Gardens Estate (Kiambu). Client label: Terry.'
where not exists (
  select 1 from public.projects
  where project_name = 'Mununga Corridor Garden Landscaping'
);

commit;
