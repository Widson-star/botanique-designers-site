// Maps raw database rows into the camelCase shape the admin UI consumes.
//
// `updated_at` is the authoritative last-modified value; `last_updated` is the
// DEPRECATED legacy column and is intentionally NOT surfaced as an editable or
// displayed field (see the Phase 1B-A1 migration field-semantics note).
import { profilePresentationName } from "./personName";

// Resolve a lead's display name without ever exposing the raw UUID. When the
// profile is not readable through RLS, a safe protected label is shown while the
// raw id is preserved internally (leadPersonId) so unrelated edits never drop it.
function resolveLeadName(leadPersonId, profilesById) {
  if (!leadPersonId) return "Not assigned";
  const profile = profilesById?.[leadPersonId];
  if (profile) return profilePresentationName(profile, "Team member");
  return "Current assigned lead — protected profile";
}

export function mapDatabaseProject(project, profilesById = {}) {
  return {
    id: project.id,
    projectName: project.project_name,
    clientSiteName: project.client_site_name || "",
    location: project.location || "",
    county: project.county || "",
    projectType: project.project_type,
    status: project.status,
    stage: project.stage,
    // Raw accountable-lead id is preserved for patch-diffing and safe display;
    // leadPersonName is the resolved (RLS-permitting) human label.
    leadPersonId: project.lead_person_id || "",
    leadPersonName: resolveLeadName(project.lead_person_id, profilesById),
    // Whether this role can actually read the assigned lead's profile row.
    leadPersonResolved: Boolean(
      project.lead_person_id && profilesById?.[project.lead_person_id]
    ),
    startDate: project.start_date || "",
    actualStartDate: project.actual_start_date || "",
    targetCompletionDate: project.target_completion_date || "",
    actualCompletionDate: project.actual_completion_date || "",
    nextAction: project.next_action || "",
    nextActionDate: project.next_action_date || "",
    blocker: project.blocker || "",
    portfolioEligible: Boolean(project.portfolio_eligible),
    portfolioPermissionStatus: project.portfolio_permission_status,
    notes: project.notes || "",
    archived: Boolean(project.archived),
    archivedAt: project.archived_at || "",
    createdAt: project.created_at || "",
    // updated_at is the authoritative last-modified value.
    updatedAt: project.updated_at || "",
    // Staff assigned-only access is enforced by Supabase RLS; every row this
    // mapper sees is already permitted (see projectMappers history note).
    // TODO(staff): populate assignments from project_assignments when staff ship.
    assignments: [],
    accessGranted: true,
  };
}

export function mapDatabaseProfile(profile) {
  return {
    id: profile.id,
    email: profile.email || "",
    full_name: profile.full_name || "",
    role: profile.role,
    is_active: Boolean(profile.is_active),
  };
}

export function mapDatabaseFinancialReference(reference) {
  return {
    simpleInvoiceClientName: reference.simple_invoice_client_name || "",
    relatedEstimateNumber: reference.estimate_number || "",
    relatedInvoiceNumber: reference.invoice_number || "",
    receiptPaymentReferences: reference.receipt_reference || "",
    paymentStatus: reference.payment_status || "",
    financialNotes: reference.financial_notes || "",
  };
}

export function mapSeedFinancialReference(project) {
  return {
    simpleInvoiceClientName: project.simpleInvoiceClientName || "",
    relatedEstimateNumber: project.relatedEstimateNumber || "",
    relatedInvoiceNumber: project.relatedInvoiceNumber || "",
    receiptPaymentReferences: project.receiptPaymentReferences || "",
    paymentStatus: project.paymentStatus || "",
    financialNotes: project.financialNotes || "",
  };
}
