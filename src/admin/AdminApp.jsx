import { Route, Routes } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import AdminAccessDenied from "./components/AdminAccessDenied";
import AdminConfigError from "./components/AdminConfigError";
import AdminLogin from "./components/AdminLogin";
import AdminLayout from "./AdminLayout";
import AdminSetupRequired from "./components/AdminSetupRequired";
import AdminDashboard from "./routes/AdminDashboard";
import AdminProjects from "./routes/AdminProjects";
import AdminProjectDetail from "./routes/AdminProjectDetail";
import { ROLES } from "./constants/roles";
import { projectSeed } from "./data/projectSeed";
import {
  clearStoredSession,
  fetchCurrentProfile,
  fetchFinancialReferences,
  fetchProjects,
  getStoredSession,
  signInWithPassword,
  signOut,
  storeSession,
  supabaseConfigured,
} from "./lib/supabase";
import {
  mapDatabaseFinancialReference,
  mapDatabaseProject,
  mapSeedFinancialReference,
} from "./utils/projectMappers";
import { canViewFinancialReferences, getVisibleProjects } from "./utils/permissions";

export default function AdminApp() {
  const [demoRole, setDemoRole] = useState(null);
  const [session, setSession] = useState(() => (supabaseConfigured ? getStoredSession() : null));
  const [profile, setProfile] = useState(null);
  const [authStatus, setAuthStatus] = useState(supabaseConfigured && session ? "loading" : "idle");
  const [authError, setAuthError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [projects, setProjects] = useState([]);
  const [financialReferences, setFinancialReferences] = useState({});
  const [dataStatus, setDataStatus] = useState("idle");
  const [dataError, setDataError] = useState("");

  const isDemo = !supabaseConfigured;
  const role = isDemo ? demoRole : profile?.role;

  useEffect(() => {
    if (!supabaseConfigured || !session?.access_token || !session?.user?.id) return;

    let cancelled = false;

    async function loadProfile() {
      setAuthStatus("loading");
      setAuthError("");
      try {
        const currentProfile = await fetchCurrentProfile(session.access_token, session.user.id);
        if (cancelled) return;

        if (!currentProfile) {
          setProfile(null);
          setAuthStatus("denied");
          setAuthError("No active Botanique admin profile was found for this account.");
          return;
        }

        if (!currentProfile.is_active) {
          setProfile(null);
          setAuthStatus("denied");
          setAuthError("This Botanique admin profile is inactive.");
          return;
        }

        setProfile(currentProfile);
        setAuthStatus("authenticated");
      } catch (error) {
        if (!cancelled) {
          setProfile(null);
          setAuthStatus("denied");
          setAuthError(error.message || "Unable to load your admin profile.");
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (isDemo) return;

    if (!session?.access_token || !profile?.role) return;

    let cancelled = false;

    async function loadAdminData() {
      setDataStatus("loading");
      setDataError("");
      try {
        const databaseProjects = await fetchProjects(session.access_token);
        if (cancelled) return;

        const mappedProjects = databaseProjects.map(mapDatabaseProject);
        setProjects(mappedProjects);

        if (profile.role === ROLES.OWNER) {
          const references = await fetchFinancialReferences(
            session.access_token,
            mappedProjects.map((project) => project.id)
          );
          if (cancelled) return;

          setFinancialReferences(
            Object.fromEntries(
              references.map((reference) => [
                reference.project_id,
                mapDatabaseFinancialReference(reference),
              ])
            )
          );
        } else {
          setFinancialReferences({});
        }

        setDataStatus("ready");
      } catch (error) {
        if (!cancelled) {
          setProjects([]);
          setFinancialReferences({});
          setDataStatus("error");
          setDataError(error.message || "Unable to load admin data.");
        }
      }
    }

    loadAdminData();

    return () => {
      cancelled = true;
    };
  }, [isDemo, demoRole, profile?.role, session?.access_token]);

  const profileLabel = useMemo(() => {
    if (isDemo) return "Dev seed preview";
    return profile?.full_name || profile?.email || "Authenticated admin";
  }, [isDemo, profile]);

  const demoProjects = useMemo(
    () => (demoRole ? getVisibleProjects(projectSeed, demoRole) : []),
    [demoRole]
  );

  const demoFinancialReferences = useMemo(() => {
    if (!canViewFinancialReferences(demoRole)) return {};

    return Object.fromEntries(
      projectSeed.map((project) => [project.id, mapSeedFinancialReference(project)])
    );
  }, [demoRole]);

  const displayedProjects = isDemo ? demoProjects : projects;
  const displayedFinancialReferences = isDemo ? demoFinancialReferences : financialReferences;
  const displayedDataStatus = isDemo ? "ready" : dataStatus;
  const displayedDataError = isDemo ? "" : dataError;

  async function handleLogin(event) {
    event.preventDefault();
    setAuthStatus("loading");
    setAuthError("");

    try {
      const nextSession = await signInWithPassword({ email, password });
      storeSession(nextSession);
      setSession(nextSession);
      setPassword("");
    } catch (error) {
      setAuthStatus("idle");
      setAuthError(error.message || "Sign in failed.");
    }
  }

  async function handleSignOut() {
    if (isDemo) {
      setDemoRole(null);
      return;
    }

    await signOut(session?.access_token);
    clearStoredSession();
    setSession(null);
    setProfile(null);
    setProjects([]);
    setFinancialReferences({});
    setAuthStatus("idle");
  }

  // Missing Supabase config fails safe, scoped to /admin only:
  //   - production build: a clear admin-only error (never the public site, never fake data)
  //   - development: the clearly-labelled seed preview below
  if (!supabaseConfigured && import.meta.env.PROD) {
    return <AdminConfigError />;
  }

  if (isDemo && !demoRole) {
    return <AdminSetupRequired onSelectRole={setDemoRole} />;
  }

  if (!isDemo && !session) {
    return (
      <AdminLogin
        email={email}
        password={password}
        error={authError}
        loading={authStatus === "loading"}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={handleLogin}
      />
    );
  }

  if (!isDemo && authStatus === "loading") {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center px-4 text-botanique-charcoal">
        <div className="rounded-lg bg-white border border-stone-200 p-6 text-sm text-gray-600">
          Loading admin profile...
        </div>
      </div>
    );
  }

  if (!isDemo && authStatus === "denied") {
    return <AdminAccessDenied message={authError} onSignOut={handleSignOut} />;
  }

  return (
    <Routes>
      <Route
        element={
          <AdminLayout
            role={role}
            profileLabel={profileLabel}
            isDemo={isDemo}
            onSignOut={handleSignOut}
          />
        }
      >
        <Route
          path="/admin"
          element={
            <AdminDashboard
              role={role}
              projects={displayedProjects}
              dataStatus={displayedDataStatus}
              dataError={displayedDataError}
              isDemo={isDemo}
            />
          }
        />
        <Route
          path="/admin/projects"
          element={
            <AdminProjects
              role={role}
              projects={displayedProjects}
              dataStatus={displayedDataStatus}
              dataError={displayedDataError}
              isDemo={isDemo}
            />
          }
        />
        <Route
          path="/admin/projects/:id"
          element={
            <AdminProjectDetail
              role={role}
              projects={displayedProjects}
              financialReferences={displayedFinancialReferences}
              dataStatus={displayedDataStatus}
              dataError={displayedDataError}
              isDemo={isDemo}
            />
          }
        />
        <Route
          path="/admin/*"
          element={
            <AdminDashboard
              role={role}
              projects={displayedProjects}
              dataStatus={displayedDataStatus}
              dataError={displayedDataError}
              isDemo={isDemo}
            />
          }
        />
      </Route>
    </Routes>
  );
}
