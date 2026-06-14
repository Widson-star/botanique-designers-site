import RoleVisibility from "./RoleVisibility";

function ReferenceRow({ label, value }) {
  return (
    <div className="border-b border-stone-100 py-3 last:border-b-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm text-botanique-charcoal">{value || "Not recorded in this seed preview"}</dd>
    </div>
  );
}

export default function FinancialReferencesPanel({ financialReference, role, isDemo }) {
  return (
    <RoleVisibility role={role} ownerOnly>
      <section className="bg-white border border-stone-200 rounded-lg p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h2 className="font-bold text-lg">Owner-only financial references</h2>
            <p className="text-sm text-gray-500 mt-1">
              Simple Invoice Manager remains the financial source of truth.
              {isDemo ? " Dev preview values are safe placeholders only." : ""}
            </p>
          </div>
          <span className="rounded-full bg-botanique-beige px-3 py-1 text-xs font-semibold text-botanique-green">
            Owner only
          </span>
        </div>

        <dl>
          <ReferenceRow label="Simple Invoice client name" value={financialReference.simpleInvoiceClientName} />
          <ReferenceRow label="Estimate number" value={financialReference.relatedEstimateNumber} />
          <ReferenceRow label="Invoice number" value={financialReference.relatedInvoiceNumber} />
          <ReferenceRow label="Receipt/payment reference" value={financialReference.receiptPaymentReferences} />
          <ReferenceRow label="Payment status" value={financialReference.paymentStatus} />
          <ReferenceRow label="Financial notes" value={financialReference.financialNotes} />
        </dl>
      </section>
    </RoleVisibility>
  );
}
