export function mapDatabaseProject(project) {
  return {
    id: project.id,
    projectName: project.project_name,
    clientSiteName: project.client_site_name || "",
    location: project.location || "",
    county: project.county || "",
    projectType: project.project_type,
    status: project.status,
    stage: project.stage,
    leadPerson: project.lead_person_id ? "Assigned user" : "Not assigned",
    startDate: project.start_date || "",
    lastUpdated: project.last_updated || project.updated_at?.slice(0, 10) || "",
    nextAction: project.next_action || "",
    nextActionDate: project.next_action_date || "",
    portfolioEligible: Boolean(project.portfolio_eligible),
    portfolioPermissionStatus: project.portfolio_permission_status,
    notes: project.notes || "",
    archived: Boolean(project.archived),
    assignments: [],
    accessGranted: true,
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
