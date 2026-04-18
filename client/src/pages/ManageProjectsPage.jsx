import { useEffect, useState } from "react";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

function ManageProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [projectStatusDrafts, setProjectStatusDrafts] = useState({});
  const [isSavingStatusById, setIsSavingStatusById] = useState({});
  const [isDeletingById, setIsDeletingById] = useState({});
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isApplicantsLoading, setIsApplicantsLoading] = useState(false);

  const loadProjects = async () => {
    const profileResponse = await api.get(`/api/profile/client/${user.user_id}`);
    const clientId = profileResponse.data.client_id;

    const projectsResponse = await api.get(`/api/projects/client/${clientId}`);
    setProjects(projectsResponse.data);

    const statusMap = projectsResponse.data.reduce((acc, project) => {
      acc[project.project_id] = project.project_status;
      return acc;
    }, {});
    setProjectStatusDrafts(statusMap);

    if (projectsResponse.data.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projectsResponse.data[0].project_id);
    }
  };

  const handleProjectStatusChange = (projectId, nextStatus) => {
    setProjectStatusDrafts((prev) => ({
      ...prev,
      [projectId]: nextStatus,
    }));
  };

  const handleProjectStatusSave = async (projectId) => {
    const nextStatus = projectStatusDrafts[projectId];

    if (!nextStatus) {
      return;
    }

    try {
      setError("");
      setSuccessMessage("");
      setIsSavingStatusById((prev) => ({ ...prev, [projectId]: true }));

      const response = await api.put(`/api/projects/${projectId}`, {
        project_status: nextStatus,
      });

      setProjects((prev) =>
        prev.map((project) =>
          project.project_id === projectId ? { ...project, project_status: response.data.project_status } : project
        )
      );
      setSuccessMessage("Project status updated.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to update project status");
    } finally {
      setIsSavingStatusById((prev) => ({ ...prev, [projectId]: false }));
    }
  };

  const handleProjectDelete = async (projectId, title) => {
    const confirmed = window.confirm(`Delete project \"${title}\"? This action cannot be undone.`);

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccessMessage("");
      setIsDeletingById((prev) => ({ ...prev, [projectId]: true }));

      await api.delete(`/api/projects/${projectId}`);

      setProjects((prev) => {
        const remaining = prev.filter((project) => project.project_id !== projectId);

        if (selectedProjectId === projectId) {
          setSelectedProjectId(remaining.length > 0 ? remaining[0].project_id : null);
          setApplicants([]);
        }

        return remaining;
      });

      setProjectStatusDrafts((prev) => {
        const nextDrafts = { ...prev };
        delete nextDrafts[projectId];
        return nextDrafts;
      });

      setSuccessMessage("Project deleted successfully.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to delete project");
    } finally {
      setIsDeletingById((prev) => ({ ...prev, [projectId]: false }));
    }
  };

  const loadApplicants = async (projectId) => {
    setIsApplicantsLoading(true);

    try {
      const applicantsResponse = await api.get(`/api/applications/project/${projectId}`);
      setApplicants(applicantsResponse.data);
    } finally {
      setIsApplicantsLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      if (!user?.user_id) {
        return;
      }

      try {
        setError("");
        await loadProjects();
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to load projects");
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [user?.user_id]);

  useEffect(() => {
    const fetchApplicants = async () => {
      if (!selectedProjectId) {
        setApplicants([]);
        return;
      }

      try {
        setError("");
        await loadApplicants(selectedProjectId);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to load applicants");
      }
    };

    fetchApplicants();
  }, [selectedProjectId]);

  if (isLoading) {
    return <p className="text-slate-600">Loading managed projects...</p>;
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Manage Projects</h2>
        <p className="mt-2 text-sm text-slate-600">Track your project postings and review applicants.</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Your Projects</h3>
          <ul className="mt-4 space-y-3">
            {projects.map((project) => (
              <li key={project.project_id}>
                <button
                  type="button"
                  onClick={() => setSelectedProjectId(project.project_id)}
                  className={`w-full rounded-lg border px-4 py-3 text-left ${
                    selectedProjectId === project.project_id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <p className="font-semibold text-slate-900">{project.title}</p>
                  <p className="mt-1 text-sm text-slate-600">Budget: {formatCurrency(project.budget)}</p>
                  <p className="mt-1 text-xs uppercase text-slate-500">
                    {project.project_status} • {project._count?.applications || 0} applicants
                  </p>
                </button>

                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <select
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={projectStatusDrafts[project.project_id] || project.project_status}
                    onChange={(event) => handleProjectStatusChange(project.project_id, event.target.value)}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="closed">Closed</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleProjectStatusSave(project.project_id)}
                    disabled={Boolean(isSavingStatusById[project.project_id])}
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingStatusById[project.project_id] ? "Saving..." : "Update Status"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleProjectDelete(project.project_id, project.title)}
                    disabled={Boolean(isDeletingById[project.project_id])}
                    className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeletingById[project.project_id] ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </li>
            ))}
            {projects.length === 0 ? <li className="text-sm text-slate-500">No projects posted yet.</li> : null}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Applicants</h3>
          {isApplicantsLoading ? <p className="mt-3 text-slate-600">Loading applicants...</p> : null}

          {!isApplicantsLoading ? (
            <ul className="mt-4 space-y-3">
              {applicants.map((application) => (
                <li key={application.application_id} className="rounded-lg border border-slate-200 p-4">
                  <p className="font-semibold text-slate-900">
                    {application.freelancer.user.first_name} {application.freelancer.user.last_name}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">College: {application.freelancer.college_name || "Not provided"}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Skills:{" "}
                    {application.freelancer.skills.length > 0
                      ? application.freelancer.skills.map((entry) => entry.skill.skill_name).join(", ")
                      : "No skills assigned"}
                  </p>
                </li>
              ))}
              {selectedProjectId && applicants.length === 0 ? (
                <li className="text-sm text-slate-500">No applicants for this project yet.</li>
              ) : null}
              {!selectedProjectId ? <li className="text-sm text-slate-500">Select a project to view applicants.</li> : null}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default ManageProjectsPage;
