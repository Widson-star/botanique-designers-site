import AdminAccessGate from "./AdminAccessGate";

export default function AdminSetupRequired({ onSelectRole }) {
  return (
    <div>
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-sm text-amber-900 text-center">
        Supabase environment variables are not configured. Showing dev-only seed
        preview; do not enter real data here.
      </div>
      <AdminAccessGate onSelectRole={onSelectRole} />
    </div>
  );
}
