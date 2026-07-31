import { Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import AdminAccessDenied from "./components/AdminAccessDenied";
import AdminConfigError from "./components/AdminConfigError";
import AdminLogin from "./components/AdminLogin";
import AdminLayout from "./AdminLayout";
import AdminSetupRequired from "./components/AdminSetupRequired";
import AdminDashboard from "./routes/AdminDashboard";
import AdminProjects from "./routes/AdminProjects";
import AdminProjectDetail from "./routes/AdminProjectDetail";
import AdminProjectForm from "./routes/AdminProjectForm";
import AdminApprovals from "./routes/AdminApprovals";
import AdminApprovalDetail from "./routes/AdminApprovalDetail";
import AdminProjectIntakes from "./routes/AdminProjectIntakes";
import AdminProjectIntakeDetail from "./routes/AdminProjectIntakeDetail";
import AdminDailySiteOperations from "./routes/AdminDailySiteOperations";
import AdminDailySiteEntryForm from "./routes/AdminDailySiteEntryForm";
import AdminDailySiteEntryDetail from "./routes/AdminDailySiteEntryDetail";
import { AdminDataProvider } from "./context/AdminDataContext";
import AdminApprovalsProvider from "./context/AdminApprovalsContext";
import AdminIntakeProvider from "./context/AdminIntakeProvider";
import DailySiteOperationsProvider from "./context/DailySiteOperationsProvider";
import SiteCostsProvider from "./context/SiteCostsProvider";
import FundRequestsProvider from "./context/FundRequestsProvider";
import AdminSiteCosts from "./routes/AdminSiteCosts";
import AdminSiteCostForm from "./routes/AdminSiteCostForm";
import AdminSiteCostDetail from "./routes/AdminSiteCostDetail";
import AdminFundRequests from "./routes/AdminFundRequests";
import AdminFundRequestForm from "./routes/AdminFundRequestForm";
import AdminFundRequestDetail from "./routes/AdminFundRequestDetail";
import { ROLES } from "./constants/roles";
import {
  clearStoredSession,
  fetchCurrentProfile,
  getStoredSession,
  signInWithPassword,
  signOut,
  storeSession,
  supabaseConfigured,
} from "./lib/supabase";

// AdminApp owns AUTHENTICATION only. Project/profile data loading, mutations and
// save feedback are delegated to AdminDataProvider (see context/AdminDataContext).
export default function AdminApp() {
  const [demoRole, setDemoRole] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authStatus, setAuthStatus] = useState("idle");
  const [authError, setAuthError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isDemo = !supabaseConfigured;
  const role = isDemo ? demoRole : profile?.role;

  useEffect(() => {
    if (!supabaseConfigured) return;

    const storedSession = getStoredSession();
    if (!storedSession) return;

    // Storage is browser-only. Restore it after the deterministic signed-out
    // first render, and enter the profile-validation screen before exposing any
    // authenticated admin content.
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setAuthStatus("loading");
      setSession(storedSession);
    });

    return () => {
      cancelled = true;
    };
  }, []);

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

  const profileLabel = isDemo
    ? role === ROLES.OWNER
      ? "Widson O. Ambaisi"
      : "Martine Lotom"
    : undefined;

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
    <AdminDataProvider session={session} role={role} profile={profile} isDemo={isDemo}>
      <AdminApprovalsProvider session={session} role={role} isDemo={isDemo}>
        <AdminIntakeProvider session={session} role={role} isDemo={isDemo}>
        <DailySiteOperationsProvider session={session} role={role} isDemo={isDemo}>
        <SiteCostsProvider session={session} role={role} isDemo={isDemo}>
        <FundRequestsProvider session={session} role={role} isDemo={isDemo}>
          <Routes>
            <Route
              element={
                <AdminLayout
                  role={role}
                  profile={profile}
                  profileLabel={profileLabel}
                  isDemo={isDemo}
                  onSignOut={handleSignOut}
                />
              }
            >
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/projects" element={<AdminProjects />} />
              <Route path="/admin/projects/new" element={<AdminProjectForm mode="create" />} />
              <Route path="/admin/projects/:id" element={<AdminProjectDetail />} />
              <Route path="/admin/projects/:id/edit" element={<AdminProjectForm mode="edit" />} />
              <Route path="/admin/approvals" element={<AdminApprovals />} />
              <Route path="/admin/approvals/:approvalId" element={<AdminApprovalDetail />} />
              <Route path="/admin/project-intakes" element={<AdminProjectIntakes />} />
              <Route path="/admin/project-intakes/:intakeId" element={<AdminProjectIntakeDetail />} />
              <Route path="/admin/daily-site-operations" element={<AdminDailySiteOperations />} />
              <Route path="/admin/daily-site-operations/new" element={<AdminDailySiteEntryForm mode="create" />} />
              <Route path="/admin/daily-site-operations/:entryId" element={<AdminDailySiteEntryDetail />} />
              <Route path="/admin/daily-site-operations/:entryId/edit" element={<AdminDailySiteEntryForm mode="edit" />} />
              <Route path="/admin/site-costs" element={<AdminSiteCosts />} />
              <Route path="/admin/site-costs/new" element={<AdminSiteCostForm />} />
              <Route path="/admin/site-costs/:claimId" element={<AdminSiteCostDetail />} />
              <Route path="/admin/site-costs/:claimId/edit" element={<AdminSiteCostForm />} />
              <Route path="/admin/fund-requests" element={<AdminFundRequests />} />
              <Route path="/admin/fund-requests/new" element={<AdminFundRequestForm />} />
              <Route path="/admin/fund-requests/:requestId" element={<AdminFundRequestDetail />} />
              <Route path="/admin/fund-requests/:requestId/edit" element={<AdminFundRequestForm />} />
              <Route path="/admin/*" element={<AdminDashboard />} />
            </Route>
          </Routes>
        </FundRequestsProvider>
        </SiteCostsProvider>
        </DailySiteOperationsProvider>
        </AdminIntakeProvider>
      </AdminApprovalsProvider>
    </AdminDataProvider>
  );
}
