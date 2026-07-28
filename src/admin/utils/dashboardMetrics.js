// Phase 1B-A2 dashboard KPI + chart aggregations — PURE functions.
//
// All metrics are computed from the currently VISIBLE live project records
// (camelCase, from projectMappers). Definitions follow the product requirements
// exactly. Dates are compared as ISO (YYYY-MM-DD) strings against the browser's
// LOCAL calendar date, without any UTC conversion that could shift the day.
import { PROJECT_STAGES, PROJECT_STATUSES, PROJECT_TYPES } from "../constants/projectStatus";

// Local calendar date as YYYY-MM-DD (no UTC round-trip).
export function todayIsoDate(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const isActiveProject = (p) => !p.archived && ["Ongoing", "Paused"].includes(p.status);
const isPendingProject = (p) => !p.archived && p.status === "Pending";
const isCompletedProject = (p) => !p.archived && p.status === "Completed";
const isDesignOnlyProject = (p) => !p.archived && p.status === "Design-only";

// Operational attention is intentionally limited to open delivery records.
// Closed, design-only and archived records remain visible elsewhere but must
// never be presented as requiring operational follow-up.
export const isOpenOperationalProject = (project) =>
  !project.archived && ["Pending", "Ongoing", "Paused"].includes(project.status);

// Exact metric datasets — shared by both the dashboard KPI counts and the
// Projects drill-down filters so a KPI always opens precisely its own set.
export function activeProjects(projects) {
  return projects.filter(isActiveProject);
}

export function pendingProjects(projects) {
  return projects.filter(isPendingProject);
}

export function completedProjects(projects) {
  return projects.filter(isCompletedProject);
}

export function designOnlyProjects(projects) {
  return projects.filter(isDesignOnlyProject);
}

export function overdueActionProjects(projects, today = todayIsoDate()) {
  return projects.filter(
    (p) =>
      isOpenOperationalProject(p) &&
      p.nextAction &&
      p.nextAction.trim().length > 0 &&
      p.nextActionDate &&
      p.nextActionDate < today
  );
}

export function upcomingStartProjects(projects, today = todayIsoDate()) {
  return projects.filter(
    (p) => isPendingProject(p) && p.startDate && p.startDate >= today
  );
}

// Owner-only: every non-archived Pending project awaiting activation.
export function pendingActivationProjects(projects) {
  return projects.filter(isPendingProject);
}

export function calculateDashboardMetrics(projects, today = todayIsoDate()) {
  return {
    total: projects.length,
    active: activeProjects(projects).length,
    pending: pendingProjects(projects).length,
    completed: completedProjects(projects).length,
    designOnly: designOnlyProjects(projects).length,
    overdueActions: overdueActionProjects(projects, today).length,
    upcomingStarts: upcomingStartProjects(projects, today).length,
    pendingActivation: pendingActivationProjects(projects).length,
  };
}

// The named drill-down views a dashboard KPI can open. Each returns exactly the
// set counted by the matching KPI, so the opened list matches the number shown.
export const PROJECT_VIEWS = {
  active: activeProjects,
  pending: pendingProjects,
  completed: completedProjects,
  "design-only": designOnlyProjects,
  "overdue-actions": overdueActionProjects,
  "upcoming-starts": upcomingStartProjects,
  "pending-activation": pendingActivationProjects,
};

export const PROJECT_VIEW_LABELS = {
  active: "Active projects",
  pending: "Pending projects",
  completed: "Completed projects",
  "design-only": "Design-only projects",
  "overdue-actions": "Projects with overdue actions",
  "upcoming-starts": "Projects with upcoming starts",
  "pending-activation": "Projects pending activation",
};

// Apply a named view to a project set (identity when the view is unknown/empty).
export function applyProjectView(projects, view, today = todayIsoDate()) {
  const fn = PROJECT_VIEWS[view];
  return fn ? fn(projects, today) : projects;
}

// Deterministic operational attention reasons, derived only from fields already
// present on the visible project row. No health/risk inference or percentages.
export function projectAttentionReasons(project, today = todayIsoDate(), options = {}) {
  if (!isOpenOperationalProject(project)) return [];

  const includePendingActivation = options.includePendingActivation !== false;
  const reasons = [];
  if (includePendingActivation && isPendingProject(project)) {
    reasons.push("Pending activation");
  }
  if (
    project.nextAction &&
    project.nextAction.trim().length > 0 &&
    project.nextActionDate &&
    project.nextActionDate < today
  ) {
    reasons.push("Overdue next action");
  }
  if (project.blocker && project.blocker.trim().length > 0) {
    reasons.push(`Blocker: ${project.blocker.trim()}`);
  }
  if (!project.leadPersonId) {
    reasons.push("Accountable lead missing");
  }
  if (!project.nextAction || project.nextAction.trim().length === 0) {
    reasons.push("Next action missing");
  }
  if (isPendingProject(project) && project.startDate && project.startDate >= today) {
    reasons.push(`Upcoming start: ${project.startDate}`);
  }
  return reasons;
}

export function projectsNeedingAttention(projects, today = todayIsoDate(), options = {}) {
  return projects
    .map((project) => ({
      project,
      reasons: projectAttentionReasons(project, today, options),
    }))
    .filter((item) => item.reasons.length > 0);
}

export function calculateAttentionSummary(projects, today = todayIsoDate()) {
  const operational = projects.filter(isOpenOperationalProject);
  return {
    pendingProjects: operational.filter((project) => project.status === "Pending").length,
    withoutLead: operational.filter((project) => !project.leadPersonId).length,
    withoutNextAction: operational.filter(
      (project) => !project.nextAction || project.nextAction.trim().length === 0
    ).length,
    withBlockers: operational.filter(
      (project) => project.blocker && project.blocker.trim().length > 0
    ).length,
    overdueActions: operational.filter(
      (project) =>
        project.nextAction &&
        project.nextAction.trim().length > 0 &&
        project.nextActionDate &&
        project.nextActionDate < today
    ).length,
    upcomingStarts: operational.filter(
      (project) =>
        project.status === "Pending" &&
        project.startDate &&
        project.startDate >= today
    ).length,
  };
}

export function operationalSummary(
  projects,
  { today = todayIsoDate(), includePendingActivation = true } = {}
) {
  if (projects.length === 0) return null;
  const metrics = calculateDashboardMetrics(projects, today);
  const attention = calculateAttentionSummary(projects, today);

  function joinNatural(items) {
    if (items.length <= 1) return items[0] || "";
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
  }

  function isAre(value) {
    return value === 1 ? "is" : "are";
  }

  const portfolioParts = [
    metrics.active > 0 && `${metrics.active} ${isAre(metrics.active)} active`,
    metrics.pending > 0 &&
      (includePendingActivation
        ? `${metrics.pendingActivation} ${isAre(metrics.pendingActivation)} pending activation`
        : `${metrics.pending} ${isAre(metrics.pending)} pending`),
    metrics.completed > 0 &&
      `${metrics.completed} ${isAre(metrics.completed)} completed`,
    metrics.designOnly > 0 &&
      `${metrics.designOnly} ${isAre(metrics.designOnly)} design-only`,
  ].filter(Boolean);

  const attentionParts = [
    includePendingActivation &&
      attention.pendingProjects > 0 &&
      `${attention.pendingProjects} ${isAre(attention.pendingProjects)} awaiting activation`,
    attention.withoutLead > 0 &&
      `${attention.withoutLead} ${attention.withoutLead === 1 ? "has" : "have"} no accountable lead`,
    attention.withoutNextAction > 0 &&
      `${attention.withoutNextAction} ${attention.withoutNextAction === 1 ? "has" : "have"} no next action`,
    attention.withBlockers > 0 &&
      `${attention.withBlockers} ${attention.withBlockers === 1 ? "has" : "have"} a current blocker`,
    attention.overdueActions > 0 &&
      `${attention.overdueActions} ${attention.overdueActions === 1 ? "has" : "have"} an overdue action`,
    attention.upcomingStarts > 0 &&
      `${attention.upcomingStarts} ${attention.upcomingStarts === 1 ? "has" : "have"} an upcoming start`,
  ].filter(Boolean);

  const totalLabel = `${metrics.total} ${metrics.total === 1 ? "project" : "projects"}`;
  return {
    overview: `${totalLabel} in the portfolio.${
      portfolioParts.length ? ` ${joinNatural(portfolioParts)}.` : ""
    }`,
    attention: attentionParts.length
      ? `${joinNatural(attentionParts)}.`
      : "There are currently no overdue actions or upcoming starts.",
  };
}

// Group a set of projects into ordered {label, value} chart rows. Categories
// keep their canonical order; empty categories are omitted, and an entirely
// empty project set yields [] so the caller can render "No data yet".
function groupByCategory(projects, keyOf, categories) {
  const counts = new Map();
  for (const project of projects) {
    const key = keyOf(project);
    if (key === undefined || key === null || key === "") continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const rows = [];
  const seen = new Set();
  for (const category of categories) {
    const value = counts.get(category) || 0;
    if (value > 0) {
      rows.push({ label: category, value });
      seen.add(category);
    }
  }
  // Any value outside the known categories (defensive) is appended.
  for (const [key, value] of counts) {
    if (!seen.has(key)) rows.push({ label: key, value });
  }
  return rows;
}

export function projectsByStatus(projects) {
  return groupByCategory(projects, (p) => p.status, PROJECT_STATUSES);
}

export function projectsByStage(projects) {
  return groupByCategory(projects, (p) => p.stage, PROJECT_STAGES);
}

export function projectsByType(projects) {
  return groupByCategory(projects, (p) => p.projectType, PROJECT_TYPES);
}
