import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

function formatDate(value) {
  return new Date(value).toLocaleDateString();
}

function ProjectListPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setError("");
        const response = await api.get("/api/projects");
        setProjects(response.data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to load projects");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return projects;
    }

    return projects.filter((project) => {
      const requiredSkillNames = (project.requiredSkills || []).map((entry) => entry.skill.skill_name.toLowerCase());
      const techStackValues = (project.tech_stack || []).map((entry) => String(entry).toLowerCase());

      return (
        project.title.toLowerCase().includes(query) ||
        requiredSkillNames.some((name) => name.includes(query)) ||
        techStackValues.some((item) => item.includes(query))
      );
    });
  }, [projects, search]);

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Open Projects</h2>
        <p className="mt-2 text-sm text-slate-600">Browse available projects and apply as a freelancer.</p>
        {user?.role === "freelancer" ? (
          <p className="mt-2 text-xs font-medium text-emerald-700">
            Projects with your matching skills are ranked higher.
          </p>
        ) : null}

        <input
          className="mt-4 w-full rounded-md border border-slate-300 px-3 py-2"
          placeholder="Search by title, skills, or tech"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {isLoading ? <p className="text-slate-600">Loading projects...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4">
        {filteredProjects.map((project) => (
          <article key={project.project_id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{project.title}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Client: {project.client.user.first_name} {project.client.user.last_name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {user?.role === "freelancer" && project.has_skill_match ? (
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Skill Match {project.matched_skills_count}/{project.required_skills_count}
                  </span>
                ) : null}
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  {project.project_status}
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-700">
              <p>Budget: {formatCurrency(project.budget)}</p>
              <p>Deadline: {formatDate(project.deadline)}</p>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Required skills</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(project.requiredSkills || []).map((entry) => (
                    <span key={entry.id} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      {entry.skill.skill_name}
                    </span>
                  ))}
                  {(project.requiredSkills || []).length === 0 ? (
                    <span className="text-xs text-slate-500">No specific skill required</span>
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
                  {(project.tech_stack || []).length === 0 ? (
                    <span className="text-xs text-slate-500">Not specified</span>
                  ) : null}
                </div>
              </div>
            </div>

            <Link
              to={`/projects/${project.project_id}`}
              className="mt-4 inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              View Details
            </Link>
          </article>
        ))}

        {!isLoading && !error && filteredProjects.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-5 text-slate-600">No open projects match your search.</p>
        ) : null}
      </div>
    </section>
  );
}

export default ProjectListPage;
