// Shown only when the admin Supabase env vars are missing in a PRODUCTION build.
// This is an admin-only, self-contained screen: it never renders public website
// chrome and never falls back to seed/demo data in production. In development a
// missing config instead shows the labelled seed preview (see AdminApp).
export default function AdminConfigError() {
  return (
    <div className="min-h-screen bg-stone-100 text-botanique-charcoal flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-lg bg-white border border-stone-200 shadow-sm rounded-lg p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700 mb-3">
          Admin not configured
        </p>
        <h1 className="text-2xl font-bold mb-3">Botanique admin is unavailable</h1>
        <p className="text-sm text-gray-600 leading-relaxed">
          The Supabase environment variables for the admin portal are not set on this
          deployment, so the project tracker cannot start. The public website is
          unaffected.
        </p>
        <p className="text-sm text-gray-600 leading-relaxed mt-4">
          An administrator needs to set <code className="font-mono text-xs">VITE_SUPABASE_URL</code>{" "}
          and <code className="font-mono text-xs">VITE_SUPABASE_ANON_KEY</code> in the
          hosting environment and redeploy. No real data is shown until configuration
          is restored.
        </p>
      </section>
    </div>
  );
}
