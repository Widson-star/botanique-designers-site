// Create (/admin/projects/new) and edit (/admin/projects/:id/edit) routes.
// Both render the single shared ProjectForm; the mode is derived from the URL.
import { Link, useParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { canCreateProjects, canEditProjects } from "../utils/projectCapabilities";
import ProjectForm from "../components/ProjectForm";

export default function AdminProjectForm({ mode }) {
  const { id } = useParams();
  const { role, projects, dataStatus } = useAdminData();
  const project = mode === "edit" ? projects.find((item) => item.id === id) : null;

  const allowed = mode === "create" ? canCreateProjects(role) : canEditProjects(role);
  if (!allowed) {
    return (
      <div className="bg-white border border-stone-200 rounded-lg p-8">
        <h1 className="text-xl font-bold">Not available</h1>
        <p className="text-sm text-gray-500 mt-2">Your role cannot perform this action.</p>
        <Link to="/admin/projects" className="inline-flex mt-5 text-botanique-green font-semibold hover:underline">
          Back to projects
        </Link>
      </div>
    );
  }

  if (mode === "edit" && !project) {
    return (
      <div className="bg-white border border-stone-200 rounded-lg p-8">
        <h1 className="text-xl font-bold">Project unavailable</h1>
        <p className="text-sm text-gray-500 mt-2">
          {dataStatus === "loading"
            ? "Project records are still loading."
            : "This project could not be found, or your role cannot access it."}
        </p>
        <Link to="/admin/projects" className="inline-flex mt-5 text-botanique-green font-semibold hover:underline">
          Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          to={mode === "edit" ? `/admin/projects/${id}` : "/admin/projects"}
          className="text-sm text-botanique-green font-semibold hover:underline"
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-bold mt-2">
          {mode === "create" ? "New project" : `Edit — ${project.projectName}`}
        </h1>
      </div>

      <ProjectForm mode={mode} project={project} />
    </div>
  );
}
