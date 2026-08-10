// Company Expenses and Staff Compensation — present in the department, not yet built.
//
// Image 13 gives both a numbered capability panel and therefore a place in the
// Finance department. That place is real authority, so the destinations exist
// and the navigation is honest about the shape of the department.
//
// What does NOT exist is any model behind them: no expense record, no
// subscription, no operating bill, no salary, no allowance, no payroll run, no
// amount, no workflow. So the page invents none of it. It says what the
// capability is for, states plainly that it is not built, and offers the reader
// the Finance areas that DO work rather than leaving them on a dead end.
import { Link } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { canSeeFinance } from "../utils/financeCapabilities";
import { canSeeSiteCosts } from "../utils/siteCostCapabilities";
import { canSeeFundRequests } from "../utils/fundRequestCapabilities";
import { FINANCE_AREAS } from "../utils/financePortfolio";
import { Disc, Glyph } from "../components/ui/Surfaces";

const NUMBER = { "company-expenses": 2, "staff-compensation": 3 };

export default function AdminFinanceUnbuilt({ area: areaId }) {
  const { role } = useAdminData();
  const area = FINANCE_AREAS.find((item) => item.id === areaId);

  if (!canSeeFinance(role) || !area) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-8">
        <h1 className="text-xl font-bold">Finance unavailable</h1>
        <p className="mt-2 text-sm text-gray-500">Your role does not have access to Finance.</p>
      </div>
    );
  }

  return (
    <section className="space-y-3.5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-botanique-green">Finance</p>
        <h1 className="mt-1 text-[22px] font-semibold leading-tight">{area.label}</h1>
        <p className="mt-0.5 max-w-2xl text-[13px] text-gray-600">{area.description}</p>
      </div>

      <section aria-label={area.label} className="rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-200 text-[11px] font-semibold text-gray-600">
            {NUMBER[areaId]}
          </span>
          <Disc name={areaId === "company-expenses" ? "doc" : "people"} tone="unbuilt" size="h-8 w-8" />
          <h2 className="text-[14px] font-semibold text-botanique-charcoal">Not yet built</h2>
        </div>
        <p className="mt-3 max-w-2xl text-[12.5px] leading-relaxed text-gray-600">
          {area.label} is part of the Finance department, but nothing has been built for it yet.
          There are no records, no workflow and no figures behind it, so none are shown — an
          invented number here would be worse than an empty page.
        </p>
        <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-gray-600">
          {areaId === "company-expenses"
            ? "Operating expenses, subscriptions and company bills are not tracked in the Hub today."
            : "Salaries, allowances and staff payments are not tracked in the Hub today."}
        </p>

        <div className="mt-3.5 flex flex-wrap gap-2 border-t border-stone-100 pt-3.5">
          {canSeeSiteCosts(role) && (
            <Link
              to="/admin/site-costs"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 text-[12.5px] font-semibold text-botanique-green hover:border-botanique-green"
            >
              Project Costs <Glyph name="arrow" className="h-3.5 w-3.5" />
            </Link>
          )}
          {canSeeFundRequests(role) && (
            <Link
              to="/admin/fund-requests"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 text-[12.5px] font-semibold text-botanique-green hover:border-botanique-green"
            >
              Funding, Payments &amp; Reconciliation <Glyph name="arrow" className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </section>
    </section>
  );
}
