import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

function getWorkModeLabel(value) {
  return value === "offline" ? "Office / Offline" : "Remote";
}

function getEngagementTypeLabel(value) {
  return value === "part_time" ? "Part Time" : "Full Time";
}

function ProjectDetailPage() {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();

  const [project, setProject] = useState(null);
  const [freelancerId, setFreelancerId] = useState(null);
  const [isApplied, setIsApplied] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setError("");
        setIsLoading(true);

        const projectResponse = await api.get(`/api/projects/${id}`);
        setProject(projectResponse.data);

        if (isAuthenticated && user?.role === "freelancer") {
          const profileResponse = await api.get(`/api/profile/freelancer/${user.user_id}`);
          const currentFreelancerId = profileResponse.data.freelancer_id;
          setFreelancerId(currentFreelancerId);

          const applicationsResponse = await api.get(`/api/applications/freelancer/${currentFreelancerId}`);
          const alreadyApplied = applicationsResponse.data.some(
            (application) => application.project_id === Number(id)
          );
          setIsApplied(alreadyApplied);
        }
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to load project details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectDetails();
  }, [id, isAuthenticated, user?.role, user?.user_id]);

  const handleApply = async () => {
    if (!freelancerId) {
      return;
    }

    try {
      setIsApplying(true);
      setError("");

      await api.post("/api/applications", {
        project_id: Number(id),
        freelancer_id: freelancerId,
      });

      setIsApplied(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to apply for this project");
    } finally {
      setIsApplying(false);
    }
  };

  if (isLoading) {
    return <p className="text-slate-600">Loading project details...</p>;
  }

  if (!project) {
    return <p className="text-slate-600">Project not found.</p>;
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{project.title}</h2>
          <p className="mt-2 text-sm text-slate-600">
            Posted by {project.client.user.first_name} {project.client.user.last_name}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-700">
          {project.project_status}
        </span>
      </div>

      <p className="mt-6 whitespace-pre-wrap text-slate-700">{project.description}</p>

      <div className="mt-6 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
        <p>Budget: {formatCurrency(project.budget)}</p>
        <p>Deadline: {new Date(project.deadline).toLocaleDateString()}</p>
        <p>Work Mode: {getWorkModeLabel(project.work_mode)}</p>
        <p>Engagement: {getEngagementTypeLabel(project.engagement_type)}</p>
        <p>Area: {project.area || "Not specified"}</p>
        <p>Client Email: {project.client.user.email}</p>
        <p>Applicants: {project._count?.applications || 0}</p>
      </div>

      {project.work_mode === "offline" && project.address ? (
        <p className="mt-2 text-sm text-slate-700">Address: {project.address}</p>
      ) : null}

      {user?.role === "freelancer" && Number(project.required_skills_count) > 0 ? (
        <p className="mt-4 text-sm font-medium text-blue-700">
          Your skill match: {project.matched_skills_count || 0}/{project.required_skills_count}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Required skills</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(project.requiredSkills || []).map((entry) => (
              <span key={entry.id} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                {entry.skill.skill_name}
              </span>
            ))}
            {(project.requiredSkills || []).length === 0 ? (
              <span className="text-xs text-slate-500">No specific skills required.</span>
            ) : null}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tech stack</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(project.tech_stack || []).map((entry) => (
              <span key={`${project.project_id}-${entry}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {entry}
              </span>
            ))}
            {(project.tech_stack || []).length === 0 ? <span className="text-xs text-slate-500">Not specified.</span> : null}
          </div>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {isAuthenticated && user?.role === "freelancer" ? (
        <div className="mt-6">
          {isApplied ? (
            <span className="inline-flex rounded-md bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700">
              Applied
            </span>
          ) : (
            <button
              type="button"
              onClick={handleApply}
              disabled={isApplying || project.project_status !== "open"}
              className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isApplying ? "Applying..." : "Apply"}
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}

export default ProjectDetailPage;
