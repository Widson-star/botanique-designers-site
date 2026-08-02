// BD-REPORTS-01A / BD-REPORTS-01B — /admin/reports, the PROVISIONAL Project
// Summary.
//
// The Founder rejected the Reports information architecture on 2 August 2026:
// a single page carrying every reporting domain at once is the wrong shape,
// and reducing the records on it was not enough. Reports must become a
// category-based Reports Centre — its own compact category panel, one selected
// report in the main panel, report-specific filters — and that centre is
// deferred until its major source domains are stable.
//
// What ships here is therefore named for what it actually is: a provisional
// summary of ONE selected project over ONE period. The route path is unchanged
// so existing links keep working, but nothing in the shell or on the page
// presents it as the delivered Reports product. **No section, category, chart,
// reader or filter may be added to it** — each addition would deepen a model
// already rejected.
//
// One project, one reporting period, one Project Summary. The reader never
// needs to know about tables, row level security, remote procedures, event
// schemas, source-domain versions, internal status names or security-invoker
// mechanics: the page speaks in project names, dates, plain figures and plain
// state sentences.
//
// BD-REPORTS-01B narrowed what the summary contains, not how it is read.
// Reports is a management summary — figures, one clear statistic per question,
// and an exact link into the module that owns the records behind them. It is
// not a second copy of Daily Site Operations, Site Costs, Fund Requests or
// Approvals, and it never reproduces their records row by row.
//
// The report is live. Choosing a project or a period reads current records and
// stores nothing: no snapshot, no report row, no second ledger. Every figure is
// read-only, and every decision is still made in its own module.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { fetchReportProjects } from "../lib/reports";
import ProjectSummary from "../components/reports/ProjectSummary";
import ReportPeriodControl from "../components/reports/ReportPeriodControl";
import ReportProjectSelector from "../components/reports/ReportProjectSelector";
import { ReportStateMessage } from "../components/reports/ReportSection";
import { canSeeReports } from "../utils/reportCapabilities";
import { SAFE_LOAD_ERROR, SECTION_STATE } from "../utils/reportFormat";
import { loadProjectReport, PROJECT_CONTEXT } from "../utils/reportLoader";
import {
  customRange,
  defaultRange,
  describeRange,
  eatToday,
  thisMonthRange,
  thisWeekRange,
} from "../utils/reportPeriod";

// The report period survives in the URL, so a drill-through and a browser
// "back" return the reader to the same project and the same dates.
function rangeFromParams(params, today) {
  const preset = params.get("period");
  if (preset === "this_week") return thisWeekRange(today);
  if (preset === "custom") {
    const result = customRange(params.get("from") || "", params.get("to") || "");
    if (result.range) return result.range;
  }
  if (preset === "this_month") return thisMonthRange(today);
  return defaultRange(today);
}

// In the dev preview there is no Supabase and therefore no operational record
// to report on. The layout, labels and states are shown exactly as they behave
// against real data, so preview parity is honest rather than fabricated.
function demoReport(projectId, range, project) {
  const empty = { state: SECTION_STATE.EMPTY_EVER };
  return {
    projectId,
    range,
    projectContext: PROJECT_CONTEXT.AUTHORISED,
    overview: { state: SECTION_STATE.READY, project },
    dailySite: empty,
    claims: empty,
    fundRequests: empty,
    approvals: empty,
    approvalsProjection: { state: SECTION_STATE.EMPTY_EVER, decisions: [], awaiting: [], sourceNotes: [] },
    needsAttention: [],
  };
}

export default function AdminReports() {
  const { role, isDemo, accessToken, projects: demoProjects, profilesById } = useAdminData();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = eatToday();

  // The demo project list is DERIVED from provider state; only the real read
  // needs its own state and effect. Deriving keeps the preview from cascading
  // renders and keeps the two paths obviously equivalent.
  const [remoteProjects, setRemoteProjects] = useState([]);
  const [remoteProjectsStatus, setRemoteProjectsStatus] = useState("loading");
  const [remoteReport, setRemoteReport] = useState(null);
  const [remoteReportStatus, setRemoteReportStatus] = useState("idle");

  const selectedProjectId = searchParams.get("project") || "";
  const range = useMemo(() => rangeFromParams(searchParams, today), [searchParams, today]);

  const projects = useMemo(
    () =>
      isDemo
        ? demoProjects.map((project) => ({
            id: project.id,
            projectName: project.projectName,
            status: project.status,
            stage: project.stage,
            archived: project.archived === true,
          }))
        : remoteProjects,
    [demoProjects, isDemo, remoteProjects]
  );
  const projectsStatus = isDemo ? "ready" : remoteProjectsStatus;
  // A role with no reportable section issues no read at all.
  const permitted = canSeeReports(role);

  // The project id in the URL is INPUT, never proof of access. A report loads
  // only for a project the caller's own Projects read returned, so a hand-typed
  // or stale `?project=` cannot reach a single report source. Until that read
  // has succeeded the context is unresolved and nothing is loaded — the gate
  // fails closed, including when the project list itself failed.
  const authorisedProjectIds = useMemo(() => projects.map((project) => project.id), [projects]);
  const projectContext = useMemo(() => {
    if (!selectedProjectId) return "none";
    if (projectsStatus !== "ready") return projectsStatus;
    return authorisedProjectIds.includes(selectedProjectId)
      ? PROJECT_CONTEXT.AUTHORISED
      : PROJECT_CONTEXT.UNAVAILABLE;
  }, [authorisedProjectIds, projectsStatus, selectedProjectId]);
  const authorised = projectContext === PROJECT_CONTEXT.AUTHORISED;

  // Project selector: the ordinary projects read under the caller's own RLS.
  useEffect(() => {
    if (isDemo || !accessToken || !permitted) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchReportProjects(accessToken);
        if (cancelled) return;
        setRemoteProjects(
          (rows || []).map((row) => ({
            id: row.id,
            projectName: row.project_name || "",
            status: row.status || "",
            stage: row.stage || "",
            archived: row.archived === true,
          }))
        );
        setRemoteProjectsStatus("ready");
      } catch {
        if (!cancelled) setRemoteProjectsStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, isDemo, permitted]);

  // No project selected — or a project the caller's Projects read did not
  // return — means no report source is read at all.
  useEffect(() => {
    if (isDemo || !authorised || !accessToken || !permitted) return undefined;
    let cancelled = false;
    (async () => {
      const next = await loadProjectReport({
        accessToken,
        projectId: selectedProjectId,
        range,
        role,
        today,
        authorisedProjectIds,
      });
      if (cancelled) return;
      setRemoteReport(next);
      setRemoteReportStatus(next ? "ready" : "error");
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, authorised, authorisedProjectIds, isDemo, permitted, range, role, selectedProjectId, today]);

  // A stale report from a previous project or period is never shown: the loaded
  // report must match the current selection before it is rendered.
  const demoSelectedProject = useMemo(
    () => demoProjects.find((item) => item.id === selectedProjectId) || null,
    [demoProjects, selectedProjectId]
  );
  const report = useMemo(() => {
    if (!authorised) return null;
    if (isDemo) return demoReport(selectedProjectId, range, demoSelectedProject);
    if (
      remoteReport &&
      remoteReport.projectId === selectedProjectId &&
      remoteReport.range?.startDate === range.startDate &&
      remoteReport.range?.endDate === range.endDate
    ) {
      return remoteReport;
    }
    return null;
  }, [authorised, demoSelectedProject, isDemo, range, remoteReport, selectedProjectId]);

  const reportStatus = !authorised
    ? "idle"
    : isDemo
      ? "ready"
      : report
        ? "ready"
        : remoteReportStatus === "error"
          ? "error"
          : "loading";

  const selectProject = useCallback(
    (projectId) => {
      const next = new URLSearchParams(searchParams);
      if (projectId) next.set("project", projectId);
      else next.delete("project");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const selectRange = useCallback(
    (nextRange) => {
      if (!nextRange) return;
      const next = new URLSearchParams(searchParams);
      next.set("period", nextRange.preset);
      if (nextRange.preset === "custom") {
        next.set("from", nextRange.startDate);
        next.set("to", nextRange.endDate);
      } else {
        next.delete("from");
        next.delete("to");
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  if (!permitted) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-8">
        <h1 className="text-xl font-bold">Project Summary unavailable</h1>
        <p className="mt-2 text-sm text-gray-500">
          This role does not have access to project reporting.
        </p>
      </div>
    );
  }

  const selectedProject = projects.find((project) => project.id === selectedProjectId) || null;

  return (
    <div className="space-y-5">
      <header className="border-b border-stone-200 pb-5">
        <h1 className="text-2xl font-semibold">Project Summary</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-600">
          A provisional live summary of one selected project over one period. This is not the
          Reports Centre, which will arrive later with its own report categories.
        </p>
      </header>

      <div className="grid gap-4 rounded-lg border border-stone-200 bg-white p-4 sm:p-5 lg:grid-cols-2">
        <ReportProjectSelector
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelect={selectProject}
          disabled={projectsStatus === "loading"}
        />
        <ReportPeriodControl range={range} onChange={selectRange} />
      </div>

      {projectsStatus === "loading" && (
        <p className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-gray-600">
          Loading your projects…
        </p>
      )}

      {projectsStatus === "error" && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {SAFE_LOAD_ERROR}
        </p>
      )}

      {projectsStatus === "ready" && projects.length === 0 && !selectedProjectId && (
        <div className="rounded-lg border border-stone-200 bg-white p-8 text-center" role="status">
          <h2 className="text-base font-semibold">No projects available to report on</h2>
          <p className="mx-auto mt-1 max-w-xl text-sm leading-relaxed text-gray-500">
            You are not yet the lead of, or assigned to, any project. Ask the Principal to assign
            you to the sites you work on and they will appear here.
          </p>
        </div>
      )}

      {projectContext === PROJECT_CONTEXT.UNAVAILABLE && (
        <div
          className="rounded-lg border border-stone-300 bg-white p-8 text-center"
          role="status"
          data-report-state="project_unavailable"
        >
          <h2 className="text-base font-semibold">This project is not available to your account.</h2>
          <p className="mx-auto mt-1 max-w-xl text-sm leading-relaxed text-gray-500">
            Nothing has been read for it. Choose a project from the list above, or ask the Principal
            if you should have access to this one.
          </p>
        </div>
      )}

      {projectsStatus === "ready" && projects.length > 0 && !selectedProjectId && (
        <div className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center" role="status">
          <h2 className="text-base font-semibold">Choose a project to see its summary</h2>
          <p className="mx-auto mt-1 max-w-xl text-sm leading-relaxed text-gray-500">
            Pick a project above. Nothing is read until you do.
          </p>
        </div>
      )}

      {authorised && (
        <>
          <div className="sticky top-16 z-20 rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm">
            <p className="break-words text-sm font-semibold text-botanique-charcoal">
              {selectedProject?.projectName || "Selected project"}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">{describeRange(range)}</p>
          </div>

          {isDemo && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              This dev preview holds no site entries, cost claims, fund requests or approvals, so
              every source section below reads as empty.
            </p>
          )}

          {reportStatus === "loading" && (
            <ReportStateMessage state={SECTION_STATE.LOADING} />
          )}
          {reportStatus === "error" && <ReportStateMessage state={SECTION_STATE.ERROR} />}
          {reportStatus === "ready" && report && (
            <ProjectSummary report={report} profilesById={profilesById || {}} />
          )}
        </>
      )}
    </div>
  );
}
