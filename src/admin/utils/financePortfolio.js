// Finance read helpers. The committed Finance PNGs remain the visual authority;
// explicit Founder amendments govern terminology and information architecture.
//
// Important: existing fund-request/release/acquittal arithmetic remains intact
// underneath the UI until a separate migration establishes first-class Project
// Cost payments. The interface must not expose that implementation vocabulary as
// the department architecture.
import { deriveFinancialPosition } from "./fundReleaseCapabilities";
import { ROLES } from "../constants/roles";

function round(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

export function requestPositions({ requests = [], releases = [], acquittals = [] } = {}) {
  return requests.map((request) => ({
    request,
    position: deriveFinancialPosition(request, releases, acquittals),
  }));
}

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

export function financeAttention(claims = [], finance = {}, role = "") {
  const isPrincipal = role === ROLES.OWNER;
  const rows = requestPositions(finance);
  const approved = rows.filter((row) => row.request.status === "approved");
  const items = [];
  const push = (item) => { if (item.count > 0) items.push(item); };

  const claimsAwaiting = claims.filter((claim) => claim.lifecycle === "awaiting_review");
  push({
    key: "claims_awaiting_review",
    label: isPrincipal ? "Project costs awaiting your decision" : "Project costs awaiting the Principal",
    count: claimsAwaiting.length,
    amount: round(claimsAwaiting.reduce((total, claim) => total + Number(claim.submittedTotal || 0), 0)),
    href: "/admin/site-costs?status=awaiting_review",
    tone: isPrincipal ? "attention" : "waiting",
  });

  const requestsAwaiting = rows.filter((row) => row.request.status === "submitted");
  push({
    key: "advances_awaiting_decision",
    label: isPrincipal ? "Advance requests awaiting your decision" : "Advance requests awaiting the Principal",
    count: requestsAwaiting.length,
    amount: round(requestsAwaiting.reduce((total, row) => total + Number(row.request.totalRequestedAmount || 0), 0)),
    href: "/admin/fund-requests?status=submitted",
    tone: isPrincipal ? "attention" : "waiting",
  });

  const unissued = approved.filter((row) => row.position.releaseState === "none");
  push({
    key: "approved_advance_not_issued",
    label: "Approved advances not yet issued",
    count: unissued.length,
    amount: round(unissued.reduce((total, row) => total + Number(row.position.remainingReleasableAmount || 0), 0)),
    href: "/admin/fund-requests?status=approved",
    tone: "waiting",
  });

  const outstanding = approved.filter((row) => row.position.reconciliationState === "outstanding");
  push({
    key: "advance_accounting_outstanding",
    label: "Advances not yet fully accounted for",
    count: outstanding.length,
    amount: round(outstanding.reduce((total, row) => total + Number(row.position.advanceReleasedAmount || 0), 0)),
    href: "/admin/fund-requests?status=approved",
    tone: "attention",
  });

  const submitted = approved.filter((row) => row.position.reconciliationState === "submitted");
  push({
    key: "advance_accounting_submitted",
    label: isPrincipal ? "Advance accounts awaiting your review" : "Advance accounts awaiting the Principal",
    count: submitted.length,
    amount: 0,
    href: "/admin/fund-requests?status=approved",
    tone: isPrincipal ? "attention" : "waiting",
  });

  const amendment = approved.filter((row) => row.position.reconciliationState === "amendment_requested");
  push({
    key: "advance_accounting_amendment",
    label: "Advance accounts returned for correction",
    count: amendment.length,
    amount: 0,
    href: "/admin/fund-requests?status=approved",
    tone: "attention",
  });

  const variance = approved.filter((row) => Number(row.position.varianceAmount || 0) !== 0);
  push({
    key: "unresolved_variance",
    label: "Advances with an unresolved balance",
    count: variance.length,
    amount: round(variance.reduce((total, row) => total + Number(row.position.varianceAmount || 0), 0)),
    href: "/admin/fund-requests?status=approved",
    tone: "attention",
  });

  return items;
}

// Final Finance department information architecture, Founder ruling 11 Aug 2026.
// Project Financials is the commercial side (agreed value, milestones, client
// receipts). Project Costs is internal project expenditure. Company Expenses
// and Staff Compensation remain reserved until modelled. Advances is money given
// before expenditure; accounting/reconciliation is a component of an Advance,
// not a standalone navigation concept.
export const FINANCE_AREAS = [
  {
    id: "project-financials",
    label: "Project Financials",
    mobileLabel: "Financials",
    description: "Agreed project value, client payment milestones, receipts and client balance.",
    unbuilt: true,
  },
  {
    id: "project-costs",
    label: "Project Costs",
    mobileLabel: "Project Costs",
    description: "Costs incurred while delivering projects, including what has been paid and what remains.",
  },
  {
    id: "company-expenses",
    label: "Company Expenses",
    mobileLabel: "Expenses",
    description: "Operating expenses, subscriptions, advertising and company bills.",
    unbuilt: true,
  },
  {
    id: "staff-compensation",
    label: "Staff Compensation",
    mobileLabel: "Compensation",
    description: "Staff payments, allowances and compensation.",
    unbuilt: true,
  },
  {
    id: "advances",
    label: "Advances",
    mobileLabel: "Advances",
    description: "Money issued before expenditure and whether it has been accounted for.",
  },
];