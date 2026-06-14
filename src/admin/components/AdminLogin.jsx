export default function AdminLogin({ email, password, error, loading, onEmailChange, onPasswordChange, onSubmit }) {
  return (
    <div className="min-h-screen bg-stone-100 text-botanique-charcoal flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md bg-white border border-stone-200 shadow-sm rounded-lg p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-botanique-green mb-3">
          Botanique internal admin
        </p>
        <h1 className="text-2xl font-bold mb-3">Sign in</h1>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          Access is invite-only. Supabase Auth and Row Level Security protect real
          admin data before it enters this portal.
        </p>

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              autoComplete="email"
              required
              className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm focus:border-botanique-green focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm focus:border-botanique-green focus:outline-none"
            />
          </label>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-botanique-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-botanique-dark disabled:opacity-60 transition"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </div>
  );
}
