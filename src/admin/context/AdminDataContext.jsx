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
  fetchProjectActivities as apiFetchActivities,
  fetchProjects,
  fetchVisibleProfiles,
  updateProject as apiUpdateProject,
} from "../lib/supabase";
import {
  mapDatabaseProfile,
  mapDatabaseProject,
} from "../utils/projectMappers";
import { projectSeed } from "../data/projectSeed";

function toProfilesById(profiles) {
  return Object.fromEntries(profiles.map((profile) => [profile.id, profile]));
}

// Demo PATCH fidelity: an omitted field preserves its current value, while an
// explicitly supplied null/false is a real update and must not be discarded.
function patchedValue(patch, key, currentValue) {
  return Object.prototype.hasOwnProperty.call(patch, key)
    ? patch[key]
    : currentValue;
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

function buildDemoActivities() {
  return {
    "karen-residence-fountain-garden": [
      {
        id: "demo-activity-karen-1",
        project_id: "karen-residence-fountain-garden",
        action: "updated",
        actor_id: "demo-owner",
        occurred_at: "2026-07-27T08:30:00Z",
        changed_fields: ["next_action", "next_action_date", "blocker"],
        previous_values: {
          next_action: "Prepare planting schedule",
          next_action_date: "2026-07-25",
          blocker: null,
        },
        new_values: {
          next_action: "Confirm mobilisation date with the client",
          next_action_date: "2026-07-30",
          blocker: "Awaiting final access confirmation",
        },
        reason: "Updated after the Monday operations review.",
      },
      {
        id: "demo-activity-karen-2",
        project_id: "karen-residence-fountain-garden",
        action: "created",
        actor_id: "demo-owner",
        occurred_at: "2026-07-22T10:15:00Z",
        changed_fields: ["status", "stage", "lead_person_id"],
        previous_values: {},
        new_values: {
          status: "Pending",
          stage: "Inquiry",
          lead_person_id: "demo-owner",
        },
        reason: null,
      },
    ],
    "tsavo-company-projects-temporary-holding-record": [
      {
        id: "demo-activity-tsavo-1",
        project_id: "tsavo-company-projects-temporary-holding-record",
        action: "updated",
        actor_id: "demo-manager",
        occurred_at: "2026-07-26T14:10:00Z",
        changed_fields: ["notes"],
        previous_values: { notes: "Temporary holding record." },
        new_values: { notes: "Separate locations still require individual project rows." },
        reason: null,
      },
    ],
  };
}

// Pure network loader (no React state). Fetches and maps the authenticated
// bundle; callers apply the result to state. Kept side-effect-free so the effect
// and refetch can both use it without a state-setting callback shared into the
// effect (which the react-hooks set-state-in-effect rule flags).
async function loadAdminBundle(accessToken) {
  const rawProfiles = await fetchVisibleProfiles(accessToken);
  const mappedProfiles = rawProfiles.map(mapDatabaseProfile);
  const byId = toProfilesById(mappedProfiles);

  const rawProjects = await fetchProjects(accessToken);
  const projects = rawProjects.map((row) => mapDatabaseProject(row, byId));

  return { profiles: mappedProfiles, projects };
}

export function AdminDataProvider({ session, role, profile, profileLabel, isDemo, children }) {
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
  const demoActivities = useRef(buildDemoActivities());
  const getDemoStore = () => {
    if (!demoStore.current) demoStore.current = buildDemoProjects();
    return demoStore.current;
  };
  const [projects, setProjects] = useState(() => (isDemo ? buildDemoProjects() : []));
  const [profiles, setProfiles] = useState(() => (isDemo ? DEMO_PROFILES : []));
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
    setDataError("");
    setDataStatus("ready");
  }, []);

  const applyLoadError = useCallback((error) => {
    setProjects([]);
    setDataStatus("error");
    setDataError(error.message || "Unable to load admin data.");
  }, []);

  const refreshDemoState = useCallback(() => {
    setProfiles(DEMO_PROFILES);
    setProjects([...getDemoStore()]);
    setDataStatus("ready");
  }, []);

  // Real (network) data is loaded here; demo data is already seeded via the
  // state initializers, so the effect only runs for the authenticated path. The
  // loader is defined INSIDE the effect (state updates happen only after the
  // awaited fetch), which is the sanctioned data-fetch effect pattern.
  useEffect(() => {
    if (isDemo || !accessToken || !role) return;
    let cancelled = false;
    async function run() {
      try {
        const bundle = await loadAdminBundle(accessToken);
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
      applyBundle(await loadAdminBundle(accessToken));
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
                project_name: patchedValue(
                  patch,
                  "project_name",
                  project.projectName
                ),
                client_site_name: patchedValue(
                  patch,
                  "client_site_name",
                  project.clientSiteName
                ),
                location: patchedValue(patch, "location", project.location),
                county: patchedValue(patch, "county", project.county),
                project_type: patchedValue(
                  patch,
                  "project_type",
                  project.projectType
                ),
                status: patchedValue(patch, "status", project.status),
                stage: patchedValue(patch, "stage", project.stage),
                lead_person_id: patchedValue(
                  patch,
                  "lead_person_id",
                  project.leadPersonId
                ),
                start_date: patchedValue(patch, "start_date", project.startDate),
                actual_start_date: patchedValue(
                  patch,
                  "actual_start_date",
                  project.actualStartDate
                ),
                target_completion_date: patchedValue(
                  patch,
                  "target_completion_date",
                  project.targetCompletionDate
                ),
                actual_completion_date: patchedValue(
                  patch,
                  "actual_completion_date",
                  project.actualCompletionDate
                ),
                next_action: patchedValue(
                  patch,
                  "next_action",
                  project.nextAction
                ),
                next_action_date: patchedValue(
                  patch,
                  "next_action_date",
                  project.nextActionDate
                ),
                blocker: patchedValue(patch, "blocker", project.blocker),
                notes: patchedValue(patch, "notes", project.notes),
                portfolio_eligible: patchedValue(
                  patch,
                  "portfolio_eligible",
                  project.portfolioEligible
                ),
                portfolio_permission_status: patchedValue(
                  patch,
                  "portfolio_permission_status",
                  project.portfolioPermissionStatus
                ),
                archived: patchedValue(patch, "archived", project.archived),
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
        // No authoritative row means nothing was written. Saying otherwise once
        // let an edit vanish while the Principal was told "Changes saved."
        if (!updated) {
          throw new Error("The project was not updated. Refresh and try again.");
        }
        // Reflect the returned representation immediately so the detail/list
        // views stay correct even if the reconciling refresh fails.
        upsertProject(mapDatabaseProject(updated, profilesById));
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
      // The authenticated Supabase profile (null in demo mode) and the
      // demo-preview label, exposed so any route can resolve the signed-in
      // person's display name — the Dashboard greeting is the first
      // consumer — without re-deriving it from session storage.
      profile: profile || null,
      profileLabel,
      // Exposed so a route that issues its own narrow reads (Reports) does not
      // have to mount a domain provider or reach into session storage. It is
      // the same caller token every provider already uses; it widens nothing,
      // because every read it backs still executes under the caller's own RLS.
      accessToken: accessToken || "",
      projects,
      profiles,
      profilesById,
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
      profile,
      profileLabel,
      accessToken,
      projects,
      profiles,
      profilesById,
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
