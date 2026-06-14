import { ROLE_DESCRIPTIONS, ROLE_LABELS, ROLES } from "../constants/roles";

export default function AdminAccessGate({ onSelectRole }) {
  const roles = [ROLES.OWNER, ROLES.MANAGER, ROLES.STAFF];

  return (
    <div className="min-h-screen bg-stone-100 text-botanique-charcoal flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-3xl bg-white border border-stone-200 shadow-sm rounded-lg p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-botanique-green mb-3">
          Botanique internal preview
        </p>
        <h1 className="text-2xl md:text-3xl font-bold mb-3">Admin project tracker</h1>
        <p className="text-sm md:text-base text-gray-600 leading-relaxed">
          This is a prototype UI gate for safe seed data only. It is not production
          authentication. Supabase Auth and Row Level Security are required before
          any real operational, client, staff, or financial-reference data is entered.
        </p>

        <div className="grid md:grid-cols-3 gap-3 mt-6">
          {roles.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => onSelectRole(role)}
              className="text-left border border-stone-200 rounded-lg p-4 hover:border-botanique-green hover:bg-botanique-beige transition cursor-pointer"
            >
              <span className="block font-semibold text-botanique-charcoal">
                {ROLE_LABELS[role]}
              </span>
              <span className="block text-xs text-gray-500 mt-2 leading-relaxed">
                {ROLE_DESCRIPTIONS[role]}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
          No real credentials, secrets, private client data, invoice numbers, payment
          records, financial documents, or financial notes are stored in this prototype.
        </div>
      </section>
    </div>
  );
}
