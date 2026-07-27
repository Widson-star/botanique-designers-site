// Phase 1B-A2 admin data provider.
//
// Owns the project/profile data lifecycle for the authenticated shell:
//   * visible projects (mapped) + role-visible profile choices;
//   * loading / error state and an aria-live save-feedback channel;
//   * project refetch/invalidation after every successful mutation;
//   * create/update mutations that surface real database errors.
//
// Authentication stays in AdminApp; this provider only consumes the session /
// role it is given. Database request logic lives in ../lib/supabase.js — this
// file wires it to React state and keeps mapping in ../utils/projectMappers.
//
// Demo (no-Supabase) mode uses an ISOLATED in-memory adapter: mutations update
// local state only and NEVER reach Supabase, so a dev preview edit can never
// imply a hosted change.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminDataContext } from "./adminData";
import { ROLES } from "../constants/roles";
import {
  createProject as apiCreateProject,
  fetchFinancialReferences,
  fetchProjectActivities as apiFetchActivities,
  fetchProjects,
  fetchVisibleProfiles,
  updateProject as apiUpdateProject,
} from "../lib/supabase";
import {
  mapDatabaseFinancialReference,
  mapDatabaseProfile,
  mapDatabaseProject,
} from "../utils/projectMappers";
import { projectSeed } from "../data/projectSeed";

function toProfilesById(profiles) {
  return Object.fromEntries(profiles.map((profile) => [profile.id, profile]));
}

// ---- Demo (seed) adapter --------------------------------------------------
const DEMO_LEAD_IDS = {
  "Widson Omutelema Ambaisi": "demo-owner",
  Martine: "demo-manager",
};

const DEMO_PROFILES = [
  { id: "demo-owner", email: "owner@example.test", full_name: "Widson Omutelema Ambaisi", role: "owner", is_active: true },
  { id: "demo-manager", email: "manager@example.test", full_name: "Martine Lotom", role: "manager", is_active: true },
];

function mapSeedProject(seed, profilesById) {
  const leadPersonId = DEMO_LEAD_IDS[seed.leadPerson] || "";
  return mapDatabaseProject(
    {
      id: seed.id,
      project_name: seed.projectName,
      client_site_name: seed.clientSiteName,
      location: seed.location,
      county: seed.county,
      project_type: seed.projectType,
      status: seed.status,
      stage: seed.stage,
      lead_person_id: leadPersonId,
      start_date: seed.startDate,
      actual_start_date: "",
      target_completion_date: "",
      actual_completion_date: "",
      next_action: seed.nextAction,
      next_action_date: seed.nextActionDate,
      blocker: "",
      portfolio_eligible: seed.portfolioEligible,
      portfolio_permission_status: seed.portfolioPermissionStatus,
      notes: seed.notes,
      archived: seed.archived,
      created_at: "2026-06-14T00:00:00Z",
      updated_at: "2026-06-14T00:00:00Z",
    },
    profilesById
  );
}

function buildDemoProjects() {
  const byId = toProfilesById(DEMO_PROFILES);
  return projectSeed.map((seed) => mapSeedProject(seed, byId));
}

function buildDemoFinancialRefs(role) {
  if (role !== ROLES.OWNER) return {};
  return Object.fromEntries(
    projectSeed.map((seed) => [
      seed.id,
      mapDatabaseFinancialReference({
        simple_invoice_client_name: seed.simpleInvoiceClientName,
        estimate_number: seed.relatedEstimateNumber,
        invoice_number: seed.relatedInvoiceNumber,
        receipt_reference: seed.receiptPaymentReferences,
        payment_status: seed.paymentStatus,
        financial_notes: seed.financialNotes,
      }),
    ])
  );
}

// Pure network loader (no React state). Fetches and maps the authenticated
// bundle; callers apply the result to state. Kept side-effect-free so the effect
// and refetch can both use it without a state-setting callback shared into the
// effect (which the react-hooks set-state-in-effect rule flags).
async function loadAdminBundle(accessToken, role) {
  const rawProfiles = await fetchVisibleProfiles(accessToken);
  const mappedProfiles = rawProfiles.map(mapDatabaseProfile);
  const byId = toProfilesById(mappedProfiles);

  const rawProjects = await fetchProjects(accessToken);
  const projects = rawProjects.map((row) => mapDatabaseProject(row, byId));

  let financialReferences = {};
  if (role === ROLES.OWNER) {
    const references = await fetchFinancialReferences(
      accessToken,
      projects.map((project) => project.id)
    );
    financialReferences = Object.fromEntries(
      references.map((reference) => [
        reference.project_id,
        mapDatabaseFinancialReference(reference),
      ])
    );
  }

  return { profiles: mappedProfiles, projects, financialReferences };
}

export function AdminDataProvider({ session, role, profile, isDemo, children }) {
  const accessToken = session?.access_token;
  const currentUserId = isDemo
    ? role === ROLES.OWNER
      ? "demo-owner"
      : "demo-manager"
    : profile?.id || "";

  // Demo data is computed synchronously from the seed (no network), so it is
  // seeded directly through the state initializers below rather than an effect.
  // The in-memory demo store is built lazily (never read during render).
  const demoStore = useRef(null);
  const demoActivities = useRef({});
  const getDemoStore = () => {
    if (!demoStore.current) demoStore.current = buildDemoProjects();
    return demoStore.current;
  };

  const [projects, setProjects] = useState(() => (isDemo ? buildDemoProjects() : []));
  const [profiles, setProfiles] = useState(() => (isDemo ? DEMO_PROFILES : []));
  const [financialReferences, setFinancialReferences] = useState(() =>
    isDemo ? buildDemoFinancialRefs(role) : {}
  );
  const [dataStatus, setDataStatus] = useState(isDemo ? "ready" : "loading");
  const [dataError, setDataError] = useState("");
  const [saveFeedback, setSaveFeedback] = useState(null);

  const profilesById = useMemo(() => toProfilesById(profiles), [profiles]);

  // Insert or replace a single mapped project in local state (never clears).
  const upsertProject = useCallback((mapped) => {
    setProjects((prev) => {
      const index = prev.findIndex((project) => project.id === mapped.id);
      if (index === -1) return [mapped, ...prev];
      const next = prev.slice();
      next[index] = mapped;
      return next;
    });
  }, []);

  // Apply a fetched bundle (or an error) to state. Called from the in-effect
  // loader and from refetch — both outside the synchronous effect body.
  const applyBundle = useCallback((bundle) => {
    setProfiles(bundle.profiles);
    setProjects(bundle.projects);
    setFinancialReferences(bundle.financialReferences);
    setDataError("");
    setDataStatus("ready");
  }, []);

  const applyLoadError = useCallback((error) => {
    setProjects([]);
    setFinancialReferences({});
    setDataStatus("error");
    setDataError(error.message || "Unable to load admin data.");
  }, []);

  const refreshDemoState = useCallback(() => {
    setProfiles(DEMO_PROFILES);
    setProjects([...getDemoStore()]);
    setFinancialReferences(buildDemoFinancialRefs(role));
    setDataStatus("ready");
  }, [role]);

  // Real (network) data is loaded here; demo data is already seeded via the
  // state initializers, so the effect only runs for the authenticated path. The
  // loader is defined INSIDE the effect (state updates happen only after the
  // awaited fetch), which is the sanctioned data-fetch effect pattern.
  useEffect(() => {
    if (isDemo || !accessToken || !role) return;
    let cancelled = false;
    async function run() {
      try {
        const bundle = await loadAdminBundle(accessToken, role);
        if (!cancelled) applyBundle(bundle);
      } catch (error) {
        if (!cancelled) applyLoadError(error);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [isDemo, accessToken, role, applyBundle, applyLoadError]);

  // Reconcile projects with the server WITHOUT clearing existing data on
  // failure. Returns { ok } so callers can surface a refresh warning while
  // keeping already-loaded (and optimistically-merged) projects. The INITIAL
  // load uses the effect above (which may hard-fail via applyLoadError); this
  // is the post-load / retry path and must preserve prior data.
  const refetchProjects = useCallback(async () => {
    if (isDemo) {
      refreshDemoState();
      return { ok: true };
    }
    if (!accessToken || !role) return { ok: true };
    try {
      applyBundle(await loadAdminBundle(accessToken, role));
      return { ok: true };
    } catch (error) {
      // Preserve previously loaded data; only ensure we are not stuck loading.
      setDataStatus("ready");
      return { ok: false, error };
    }
  }, [isDemo, accessToken, role, applyBundle, refreshDemoState]);

  const fetchActivities = useCallback(
    async (projectId) => {
      if (isDemo) {
        return demoActivities.current[projectId] || [];
      }
      return apiFetchActivities(accessToken, projectId);
    },
    [accessToken, isDemo]
  );

  const createProject = useCallback(
    async (payload) => {
      setSaveFeedback(null);
      try {
        if (isDemo) {
          const byId = toProfilesById(DEMO_PROFILES);
          const now = new Date().toISOString();
          const created = mapDatabaseProject(
            { id: `demo-${Date.now()}`, created_at: now, updated_at: now, ...payload },
            byId
          );
          demoStore.current = [created, ...getDemoStore()];
          setProjects([...demoStore.current]);
          setSaveFeedback({
            type: "success",
            message: "Project created (dev preview only — not saved to Supabase).",
          });
          return { ok: true, id: created.id };
        }

        const created = await apiCreateProject(accessToken, payload);
        // Immediately reflect the returned representation so navigation to the
        // new detail route always finds it, even if the refresh below fails.
        if (created) {
          upsertProject(mapDatabaseProject(created, profilesById));
        }
        const refresh = await refetchProjects();
        if (refresh.ok) {
          setSaveFeedback({ type: "success", message: "Project created." });
          return { ok: true, id: created?.id };
        }
        // The write persisted; only the follow-up refresh failed.
        setSaveFeedback({
          type: "warning",
          message:
            "The project was saved, but the latest project list could not be refreshed. Retry refresh.",
        });
        return { ok: true, id: created?.id, refreshWarning: true };
      } catch (error) {
        setSaveFeedback({
          type: "error",
          message: error.message || "Could not create the project.",
        });
        return { ok: false, error: error.message };
      }
    },
    [accessToken, isDemo, profilesById, refetchProjects, upsertProject]
  );

  const updateProject = useCallback(
    async (projectId, patch) => {
      setSaveFeedback(null);
      if (!patch || Object.keys(patch).length === 0) {
        setSaveFeedback({ type: "success", message: "No changes to save." });
        return { ok: true, id: projectId, unchanged: true };
      }
      try {
        if (isDemo) {
          const byId = toProfilesById(DEMO_PROFILES);
          demoStore.current = getDemoStore().map((project) => {
            if (project.id !== projectId) return project;
            const remapped = mapDatabaseProject(
              {
                id: project.id,
                project_name: patch.project_name ?? project.projectName,
                client_site_name: patch.client_site_name ?? project.clientSiteName,
                location: patch.location ?? project.location,
                county: patch.county ?? project.county,
                project_type: patch.project_type ?? project.projectType,
                status: patch.status ?? project.status,
                stage: patch.stage ?? project.stage,
                lead_person_id:
                  "lead_person_id" in patch ? patch.lead_person_id : project.leadPersonId,
                start_date: patch.start_date ?? project.startDate,
                actual_start_date: patch.actual_start_date ?? project.actualStartDate,
                target_completion_date:
                  patch.target_completion_date ?? project.targetCompletionDate,
                actual_completion_date:
                  patch.actual_completion_date ?? project.actualCompletionDate,
                next_action: patch.next_action ?? project.nextAction,
                next_action_date: patch.next_action_date ?? project.nextActionDate,
                blocker: patch.blocker ?? project.blocker,
                portfolio_eligible:
                  "portfolio_eligible" in patch
                    ? patch.portfolio_eligible
                    : project.portfolioEligible,
                portfolio_permission_status:
                  patch.portfolio_permission_status ?? project.portfolioPermissionStatus,
                archived: "archived" in patch ? patch.archived : project.archived,
                created_at: project.createdAt,
                updated_at: new Date().toISOString(),
              },
              byId
            );
            return remapped;
          });
          setProjects([...demoStore.current]);
          setSaveFeedback({
            type: "success",
            message: "Changes saved (dev preview only — not saved to Supabase).",
          });
          return { ok: true, id: projectId };
        }

        const updated = await apiUpdateProject(accessToken, projectId, patch);
        // Reflect the returned representation immediately so the detail/list
        // views stay correct even if the reconciling refresh fails.
        if (updated) {
          upsertProject(mapDatabaseProject(updated, profilesById));
        }
        const refresh = await refetchProjects();
        if (refresh.ok) {
          setSaveFeedback({ type: "success", message: "Changes saved." });
          return { ok: true, id: projectId };
        }
        setSaveFeedback({
          type: "warning",
          message:
            "The project was saved, but the latest project list could not be refreshed. Retry refresh.",
        });
        return { ok: true, id: projectId, refreshWarning: true };
      } catch (error) {
        setSaveFeedback({
          type: "error",
          message: error.message || "Could not save the changes.",
        });
        return { ok: false, error: error.message };
      }
    },
    [accessToken, isDemo, profilesById, refetchProjects, upsertProject]
  );

  const clearSaveFeedback = useCallback(() => setSaveFeedback(null), []);

  const value = useMemo(
    () => ({
      role,
      isDemo,
      currentUserId,
      projects,
      profiles,
      profilesById,
      financialReferences,
      dataStatus,
      dataError,
      saveFeedback,
      clearSaveFeedback,
      refetchProjects,
      fetchActivities,
      createProject,
      updateProject,
    }),
    [
      role,
      isDemo,
      currentUserId,
      projects,
      profiles,
      profilesById,
      financialReferences,
      dataStatus,
      dataError,
      saveFeedback,
      clearSaveFeedback,
      refetchProjects,
      fetchActivities,
      createProject,
      updateProject,
    ]
  );

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}
