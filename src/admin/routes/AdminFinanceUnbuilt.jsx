import { Link } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { canSeeFinance } from "../utils/financeCapabilities";
import { FINANCE_AREAS } from "../utils/financePortfolio";
import { Disc } from "../components/ui/Surfaces";

// Company Expenses and Staff Compensation have an authorised place in Finance,
// but no data model yet. Keep the page truthful and deliberately small: the
// sidebar already provides navigation, so this page only needs to say that the
// area is not available yet and return the reader to Finance.
export default function AdminFinanceUnbuilt({ area: areaId }) {
  const { role } = useAdminData();
  const area = FINANCE_AREAS.find((item) => item.id === areaId);

  if (!canSeeFinance(role) || !area) {
    return (
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h1 className="text-xl font-semibold">Finance unavailable</h1>
        <p className="mt-1 text-[13px] text-gray-600">Your role does not have access to Finance.</p>
      </section>
    );
  }

  const detail = areaId === "company-expenses"
    ? "Operating expenses, subscriptions and company bills are not tracked in the Hub yet."
    : "Staff payments, allowances and compensation are not tracked in the Hub yet.";

  return (
    <section className="space-y-4">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-botanique-green">Finance</p>
        <h1 className="mt-1 text-[24px] font-semibold leading-tight">{area.label}</h1>
        <p className="mt-1 text-[13px] text-gray-600">{area.description}</p>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-4">
        <Disc name="pause" tone="unbuilt" size="h-9 w-9" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-botanique-charcoal">Not yet built</p>
          <p className="mt-0.5 text-[12.5px] text-gray-600">{detail}</p>
        </div>
        <Link
          to="/admin/finance"
          className="inline-flex min-h-10 items-center rounded-lg border border-stone-300 px-3.5 text-[12.5px] font-semibold text-botanique-green hover:border-botanique-green"
        >
          Back to Finance
        </Link>
      </div>
    </section>
  );
}
