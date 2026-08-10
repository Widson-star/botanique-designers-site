// The Finance department's own position, across every project the reader can
// already see.
//
// Visual authority: 12-finance-overview-working-authority.png. The image opens
// with a portfolio money position and a "what needs attention now" area, and
// this module is where both are derived. Three rules govern it.
//
// 1. ONE ARITHMETIC. Every amount is a sum of deriveFinancialPosition() rows —
//    the same client mirror of public.fund_request_financial_position() that
//    Project Costs and the Daily Site Record already read. Summing whole rows is
//    the same arithmetic the database does, so the Overview can never disagree
//    with the page a reader drills into. Nothing is pro-rated and nothing is
//    recomputed a second way.
//
// 2. NOTHING IS INVENTED WHERE NO MODEL EXISTS. The authority image shows a
//    money-in figure, a bank balance and expense categories. Botanique has no
//    money-in record, no bank account record and no company-expense model in
//    this product, so none of those appear — an empty area is honest and a
//    plausible number is not. Company Expenses and Staff Compensation are
//    likewise named but never given amounts.
//
// 3. A RELEASE IS NOT EXPENDITURE. Actual expenditure is reconciled advance
//    spend plus direct settled payments, exactly as claimFunding.js defines it.
//    An advance nobody has accounted for contributes zero, which is what keeps
//    the outstanding position visible instead of flattering it.

import { deriveFinancialPosition } from "./fundReleaseCapabilities";
import { ROLES } from "../constants/roles";

function round(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

// One derived position per fund request the reader can see. Everything else in
// this module is a fold over this list.
export function requestPositions({ requests = [], releases = [], acquittals = [] } = {}) {
  return requests.map((request) => ({
    request,
    position: deriveFinancialPosition(request, releases, acquittals),
  }));
}

// The portfolio money position: what was authorised, what actually moved, what
// was actually spent, and what is still unresolved.
export function portfolioPosition(finance = {}) {
  const rows = requestPositions(finance);
  const approved = rows.filter((row) => row.request.status === "approved");
  const sum = (pick) => round(approved.reduce((total, row) => total + Number(pick(row.position) || 0), 0));

  const advanceSpend = sum((position) => position.actualSpendAmount);
  const directPaid = sum((position) => position.directPaidAmount);

  return {
    requestCount: approved.length,
    authorisedAmount: sum((position) => position.authorisedAmount),
    releasedAmount: sum((position) => position.releasedAmount),
    unreleasedAmount: sum((position) => position.remainingReleasableAmount),
    actualExpenditureAmount: round(advanceSpend + directPaid),
    advanceOutstandingAmount: round(approved
      .filter((row) => row.position.reconciliationState === "outstanding")
      .reduce((total, row) => total + Number(row.position.advanceReleasedAmount || 0), 0)),
    varianceAmount: sum((position) => position.varianceAmount),
    hasAnyAuthority: approved.length > 0,
  };
}

// What is waiting on somebody, worst first. Each item is a count, an optional
// amount and the filtered list that answers it — never a decision surface of its
// own. Approvals remains the eventual aggregated decision centre across modules;
// this is Finance stating its own financial attention, which is a different
// thing and is deliberately scoped to money.
export function financeAttention(claims = [], finance = {}, role = "") {
  const isPrincipal = role === ROLES.OWNER;
  const rows = requestPositions(finance);
  const approved = rows.filter((row) => row.request.status === "approved");
  const items = [];

  const push = (item) => {
    if (item.count > 0) items.push(item);
  };

  const claimsAwaiting = claims.filter((claim) => claim.lifecycle === "awaiting_review");
  push({
    key: "claims_awaiting_review",
    label: isPrincipal ? "Cost claims awaiting your decision" : "Cost claims awaiting the Principal",
    count: claimsAwaiting.length,
    amount: round(claimsAwaiting.reduce((total, claim) => total + Number(claim.submittedTotal || 0), 0)),
    href: "/admin/site-costs?status=awaiting_review",
    tone: isPrincipal ? "attention" : "waiting",
  });

  const requestsAwaiting = rows.filter((row) => row.request.status === "submitted");
  push({
    key: "requests_awaiting_decision",
    label: isPrincipal ? "Fund requests awaiting your decision" : "Fund requests awaiting the Principal",
    count: requestsAwaiting.length,
    amount: round(requestsAwaiting.reduce((total, row) => total + Number(row.request.totalRequestedAmount || 0), 0)),
    href: "/admin/fund-requests?status=submitted",
    tone: isPrincipal ? "attention" : "waiting",
  });

  // Approved is not paid. This is the single most misread state in the product,
  // so it is named as its own item rather than folded into an "approved" total.
  const unreleased = approved.filter((row) => row.position.releaseState === "none");
  push({
    key: "approved_unreleased",
    label: isPrincipal ? "Approved — nothing released yet" : "Approved — awaiting release",
    count: unreleased.length,
    amount: round(unreleased.reduce((total, row) => total + Number(row.position.remainingReleasableAmount || 0), 0)),
    href: "/admin/fund-requests?status=approved",
    tone: "waiting",
  });

  const outstanding = approved.filter((row) => row.position.reconciliationState === "outstanding");
  push({
    key: "reconciliation_outstanding",
    label: "Accountable advances not yet accounted for",
    count: outstanding.length,
    amount: round(outstanding.reduce((total, row) => total + Number(row.position.advanceReleasedAmount || 0), 0)),
    href: "/admin/fund-requests?status=approved",
    tone: "attention",
  });

  const submitted = approved.filter((row) => row.position.reconciliationState === "submitted");
  push({
    key: "reconciliation_submitted",
    label: isPrincipal ? "Reconciliations awaiting your decision" : "Reconciliations awaiting the Principal",
    count: submitted.length,
    amount: 0,
    href: "/admin/fund-requests?status=approved",
    tone: isPrincipal ? "attention" : "waiting",
  });

  const amendment = approved.filter((row) => row.position.reconciliationState === "amendment_requested");
  push({
    key: "reconciliation_amendment",
    label: "Reconciliations sent back for amendment",
    count: amendment.length,
    amount: 0,
    href: "/admin/fund-requests?status=approved",
    tone: "attention",
  });

  const variance = approved.filter((row) => Number(row.position.varianceAmount || 0) !== 0);
  push({
    key: "unresolved_variance",
    label: "Advances with an unresolved variance",
    count: variance.length,
    amount: round(variance.reduce((total, row) => total + Number(row.position.varianceAmount || 0), 0)),
    href: "/admin/fund-requests?status=approved",
    tone: "attention",
  });

  return items;
}

// The Finance department's five areas, in the settled order, each carrying
// whether a real model stands behind it. `available: false` is not "coming
// soon" — it is a truthful statement that no record, workflow or schema exists,
// and it is what stops an empty area being drawn at full weight.
export const FINANCE_AREAS = [
  {
    id: "overview",
    label: "Overview",
    mobileLabel: "Overview",
    description: "The department's money position and what needs a decision.",
  },
  {
    id: "project-costs",
    label: "Project Costs",
    mobileLabel: "Project Costs",
    description: "Track and control project-related costs.",
  },
  {
    id: "company-expenses",
    label: "Company Expenses",
    mobileLabel: "Company Expenses",
    description: "Operating expenses and overheads.",
    unbuilt: true,
  },
  {
    id: "staff-compensation",
    label: "Staff Compensation",
    mobileLabel: "Staff Compensation",
    description: "Salaries, allowances and staff payments.",
    unbuilt: true,
  },
  {
    id: "funding",
    label: "Funding, Payments and Reconciliation",
    mobileLabel: "Funding & Recon.",
    description: "Authority to fund, money actually released, and what became of it.",
  },
];
