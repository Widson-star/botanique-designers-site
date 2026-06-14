export default function AdminAccessDenied({ message, onSignOut }) {
  return (
    <div className="min-h-screen bg-stone-100 text-botanique-charcoal flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-lg bg-white border border-stone-200 shadow-sm rounded-lg p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700 mb-3">
          Access denied
        </p>
        <h1 className="text-2xl font-bold mb-3">Admin access unavailable</h1>
        <p className="text-sm text-gray-600 leading-relaxed">
          {message || "Your account does not have an active Botanique admin profile."}
        </p>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-6 rounded-md border border-stone-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-stone-50 transition"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}
