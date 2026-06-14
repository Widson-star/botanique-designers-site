import { Route, Routes } from "react-router-dom";
import { useState } from "react";
import AdminAccessGate from "./components/AdminAccessGate";
import AdminLayout from "./AdminLayout";
import AdminDashboard from "./routes/AdminDashboard";
import AdminProjects from "./routes/AdminProjects";
import AdminProjectDetail from "./routes/AdminProjectDetail";

export default function AdminApp() {
  const [role, setRole] = useState(null);

  if (!role) {
    return <AdminAccessGate onSelectRole={setRole} />;
  }

  return (
    <Routes>
      <Route element={<AdminLayout role={role} onResetRole={() => setRole(null)} />}>
        <Route path="/admin" element={<AdminDashboard role={role} />} />
        <Route path="/admin/projects" element={<AdminProjects role={role} />} />
        <Route path="/admin/projects/:id" element={<AdminProjectDetail role={role} />} />
        <Route path="/admin/*" element={<AdminDashboard role={role} />} />
      </Route>
    </Routes>
  );
}
