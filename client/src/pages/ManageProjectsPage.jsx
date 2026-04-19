import { useEffect, useMemo, useState } from "react";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import CreateContractModal from "../components/CreateContractModal.jsx";
import FreelancerProfilePreviewModal from "../components/FreelancerProfilePreviewModal.jsx";

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

function ManageProjectsPage() {
  const { user } = useAuth();
  const [clientId, setClientId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [profilePreviewFreelancer, setProfilePreviewFreelancer] = useState(null);
  const [isProfilePreviewOpen, setIsProfilePreviewOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [projectStatusDrafts, setProjectStatusDrafts] = useState({});
  const [isSavingStatusById, setIsSavingStatusById] = useState({});
  const [isDeletingById, setIsDeletingById] = useState({});
  const [isRejectingByApplicationId, setIsRejectingByApplicationId] = useState({});
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isApplicantsLoading, setIsApplicantsLoading] = useState(false);

  const selectedProject = useMemo(
    () => projects.find((project) => project.project_id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const loadProjects = async () => {
    const profileResponse = await api.get(`/api/profile/client/${user.user_id}`);
    const resolvedClientId = profileResponse.data.client_id;
    setClientId(resolvedClientId);

    const projectsResponse = await api.get(`/api/projects/client/${resolvedClientId}`);
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

  const handleOpenContractModal = (application) => {
    setSelectedApplicant(application);
    setIsContractModalOpen(true);
  };

  const handleOpenProfilePreview = (freelancer) => {
    setProfilePreviewFreelancer(freelancer);
    setIsProfilePreviewOpen(true);
  };

  const handleCloseProfilePreview = () => {
    setProfilePreviewFreelancer(null);
    setIsProfilePreviewOpen(false);
  };

  const handleCloseContractModal = () => {
    setIsContractModalOpen(false);
    setSelectedApplicant(null);
  };

  const handleContractCreated = (contract) => {
    setSuccessMessage(`Contract #${contract.contract_id} created successfully.`);

    const hiredFreelancerId = contract.freelancer_id || contract.freelancer?.freelancer_id;

    if (hiredFreelancerId) {
      setApplicants((prev) =>
        prev.filter((application) => application.freelancer.freelancer_id !== hiredFreelancerId)
      );
    }
  };

  const handleRejectApplicant = async (application) => {
    const confirmed = window.confirm(
      `Reject ${application.freelancer.user.first_name} ${application.freelancer.user.last_name} for this project?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccessMessage("");
      setIsRejectingByApplicationId((prev) => ({ ...prev, [application.application_id]: true }));

      await api.delete(`/api/applications/${application.application_id}`);
      setApplicants((prev) => prev.filter((item) => item.application_id !== application.application_id));
      setSuccessMessage("Applicant rejected and removed.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to reject applicant");
    } finally {
      setIsRejectingByApplicationId((prev) => ({ ...prev, [application.application_id]: false }));
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
      let isCurrent = true;

      if (!selectedProjectId) {
        setApplicants([]);
        setIsApplicantsLoading(false);
        return;
      }

      setApplicants([]);
      setIsApplicantsLoading(true);

      try {
        setError("");

        const applicantsResponse = await api.get(`/api/applications/project/${selectedProjectId}`);

        if (!isCurrent) {
          return;
        }

        setApplicants(applicantsResponse.data);
      } catch (requestError) {
        if (isCurrent) {
          setError(requestError.response?.data?.message || "Failed to load applicants");
        }
      } finally {
        if (isCurrent) {
          setIsApplicantsLoading(false);
        }
      }

      return () => {
        isCurrent = false;
      };
    };

    let cleanup;

    fetchApplicants().then((teardown) => {
      cleanup = teardown;
    });

    return () => {
      if (typeof cleanup === "function") {
        cleanup();
      }
    };
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
                  <p className="mt-1 text-sm font-medium text-slate-700">Project ID: #{project.project_id}</p>
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
          {selectedProject ? (
            <p className="mt-2 text-sm text-slate-600">
              Showing applicants for Project #{selectedProject.project_id}: {selectedProject.title}
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Select a project to view applicants for that project.</p>
          )}
          {isApplicantsLoading ? <p className="mt-3 text-slate-600">Loading applicants...</p> : null}

          {!isApplicantsLoading ? (
            <ul className="mt-4 space-y-3">
              {applicants.map((application) => (
                <li key={application.application_id} className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Applied to Project #{application.project_id}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleOpenProfilePreview(application.freelancer)}
                    className="text-left"
                  >
                    <p className="text-base font-semibold text-slate-900 hover:text-blue-700 hover:underline">
                      {application.freelancer.user.first_name} {application.freelancer.user.last_name}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">@{application.freelancer.user.username || "user"}</p>
                  </button>
                  <p className="mt-2 text-xs text-slate-500">
                    Click on the name to view full freelancer profile (skills, contact, portfolio, resume), then hire.
                  </p>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenContractModal(application)}
                      className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      Hire
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRejectApplicant(application)}
                      disabled={Boolean(isRejectingByApplicationId[application.application_id])}
                      className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isRejectingByApplicationId[application.application_id] ? "Rejecting..." : "Reject"}
                    </button>
                  </div>
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

      <CreateContractModal
        isOpen={isContractModalOpen}
        onClose={handleCloseContractModal}
        projectId={selectedProjectId}
        freelancer={selectedApplicant?.freelancer || null}
        clientId={clientId}
        onCreated={handleContractCreated}
      />

      <FreelancerProfilePreviewModal
        isOpen={isProfilePreviewOpen}
        freelancer={profilePreviewFreelancer}
        onClose={handleCloseProfilePreview}
      />
    </section>
  );
}

export default ManageProjectsPage;
