import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const initialState = {
  title: "",
  description: "",
  budget: "",
  deadline: "",
  work_mode: "remote",
  engagement_type: "full_time",
  area: "",
  address: "",
  tech_stack: [],
  required_skill_ids: [],
  project_status: "open",
};

function PostProjectPage() {
  const { user } = useAuth();
  const [form, setForm] = useState(initialState);
  const [skills, setSkills] = useState([]);
  const [postedProjects, setPostedProjects] = useState([]);
  const [techStackInput, setTechStackInput] = useState("");
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoadingSkills, setIsLoadingSkills] = useState(true);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(
      Number(value || 0)
    );

  const formatDate = (value) => {
    if (!value) {
      return "No deadline set";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return "No deadline set";
    }

    return parsed.toLocaleDateString();
  };

  const toLabel = (value) =>
    String(value || "")
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const response = await api.get("/api/skills");
        setSkills(response.data);
      } catch (_requestError) {
        toast.error("Failed to load skills. You can still submit later.");
      } finally {
        setIsLoadingSkills(false);
      }
    };

    fetchSkills();
  }, []);

  useEffect(() => {
    const fetchPostedProjects = async () => {
      if (!user?.user_id) {
        setPostedProjects([]);
        setIsLoadingProjects(false);
        return;
      }

      try {
        const profileResponse = await api.get(`/api/profile/client/${user.user_id}`);
        const clientId = profileResponse.data.client_id;
        const projectsResponse = await api.get(`/api/projects/client/${clientId}`);
        setPostedProjects(projectsResponse.data || []);
      } catch (_requestError) {
        toast.error("Unable to load posted projects right now.");
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchPostedProjects();
  }, [user?.user_id]);

  const selectedSkillSet = useMemo(() => new Set(form.required_skill_ids), [form.required_skill_ids]);

  const validate = () => {
    const nextErrors = {};

    if (!form.title.trim()) {
      nextErrors.title = "Title is required.";
    }

    if (!form.description.trim()) {
      nextErrors.description = "Description is required.";
    }

    if (!form.budget || Number(form.budget) <= 0) {
      nextErrors.budget = "Budget must be a positive number.";
    }

    if (!form.deadline) {
      nextErrors.deadline = "Deadline is required.";
    }

    if (!form.area?.trim()) {
      nextErrors.area = "Area is required.";
    }

    if (form.work_mode === "offline" && !form.address?.trim()) {
      nextErrors.address = "Address is required for offline projects.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddTechStack = () => {
    const normalizedValue = techStackInput.trim();

    if (!normalizedValue) {
      return;
    }

    const alreadyAdded = form.tech_stack.some((entry) => entry.toLowerCase() === normalizedValue.toLowerCase());

    if (alreadyAdded) {
      setTechStackInput("");
      return;
    }

    setForm((prev) => ({
      ...prev,
      tech_stack: [...prev.tech_stack, normalizedValue],
    }));
    setTechStackInput("");
  };

  const handleRemoveTechStack = (value) => {
    setForm((prev) => ({
      ...prev,
      tech_stack: prev.tech_stack.filter((item) => item !== value),
    }));
  };

  const handleAddRequiredSkill = () => {
    const parsedSkillId = Number(selectedSkillId);

    if (!parsedSkillId || selectedSkillSet.has(parsedSkillId)) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      required_skill_ids: [...prev.required_skill_ids, parsedSkillId],
    }));
    setSelectedSkillId("");
  };

  const handleRemoveRequiredSkill = (skillId) => {
    setForm((prev) => ({
      ...prev,
      required_skill_ids: prev.required_skill_ids.filter((entry) => entry !== skillId),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await api.post("/api/projects", {
        ...form,
        budget: Number(form.budget),
      });

      toast.success("Project posted successfully.");
      setPostedProjects((prev) => [response.data, ...prev]);
      setForm(initialState);
      setTechStackInput("");
      setSelectedSkillId("");
      setFieldErrors({});
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to post project";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Post a Project</h2>
        <p className="mt-2 text-sm text-slate-600">Create a project and start receiving freelancer applications.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-slate-700">
          Title
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            name="title"
            value={form.title}
            onChange={(event) => {
              handleChange(event);
              setFieldErrors((prev) => ({ ...prev, title: null }));
            }}
            required
          />
          {fieldErrors.title ? <p className="mt-1 text-xs text-red-600">{fieldErrors.title}</p> : null}
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Description
          <textarea
            className="mt-1 min-h-32 w-full rounded-md border border-slate-300 px-3 py-2"
            name="description"
            value={form.description}
            onChange={(event) => {
              handleChange(event);
              setFieldErrors((prev) => ({ ...prev, description: null }));
            }}
            required
          />
          {fieldErrors.description ? <p className="mt-1 text-xs text-red-600">{fieldErrors.description}</p> : null}
        </label>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">Tech Stack</label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={techStackInput}
              onChange={(event) => setTechStackInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAddTechStack();
                }
              }}
              placeholder="e.g. React, Node.js, PostgreSQL"
            />
            <button
              type="button"
              onClick={handleAddTechStack}
              className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {form.tech_stack.map((item) => (
              <span key={item} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {item}
                <button
                  type="button"
                  onClick={() => handleRemoveTechStack(item)}
                  className="rounded-full bg-slate-300 px-2 text-[10px] text-slate-800 hover:bg-slate-400"
                >
                  x
                </button>
              </span>
            ))}
            {form.tech_stack.length === 0 ? <p className="text-xs text-slate-500">No tech stack added yet.</p> : null}
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">Required Freelancer Skills</label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={selectedSkillId}
              onChange={(event) => setSelectedSkillId(event.target.value)}
              disabled={isLoadingSkills}
            >
              <option value="">Select a skill</option>
              {skills
                .filter((skill) => !selectedSkillSet.has(skill.skill_id))
                .map((skill) => (
                  <option key={skill.skill_id} value={skill.skill_id}>
                    {skill.skill_name}
                  </option>
                ))}
            </select>

            <button
              type="button"
              onClick={handleAddRequiredSkill}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Add Skill
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {form.required_skill_ids.map((skillId) => {
              const skill = skills.find((entry) => entry.skill_id === skillId);
              return (
                <span
                  key={skillId}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800"
                >
                  {skill?.skill_name || `Skill #${skillId}`}
                  <button
                    type="button"
                    onClick={() => handleRemoveRequiredSkill(skillId)}
                    className="rounded-full bg-emerald-300 px-2 text-[10px] text-emerald-900 hover:bg-emerald-400"
                  >
                    x
                  </button>
                </span>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Work Mode
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              name="work_mode"
              value={form.work_mode}
              onChange={handleChange}
            >
              <option value="remote">Remote</option>
              <option value="offline">Office / Offline</option>
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            Engagement Type
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              name="engagement_type"
              value={form.engagement_type}
              onChange={handleChange}
            >
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            Area
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              name="area"
              value={form.area}
              onChange={(event) => {
                handleChange(event);
                setFieldErrors((prev) => ({ ...prev, area: null }));
              }}
              placeholder="e.g. Andheri West"
              required
            />
            {fieldErrors.area ? <p className="mt-1 text-xs text-red-600">{fieldErrors.area}</p> : null}
          </label>

          <label className="text-sm font-medium text-slate-700 sm:col-span-2">
            Address
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              name="address"
              value={form.address}
              onChange={(event) => {
                handleChange(event);
                setFieldErrors((prev) => ({ ...prev, address: null }));
              }}
              placeholder="e.g. 301 Business Park, MG Road"
            />
            {fieldErrors.address ? <p className="mt-1 text-xs text-red-600">{fieldErrors.address}</p> : null}
          </label>

          <label className="text-sm font-medium text-slate-700">
            Budget
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              name="budget"
              type="number"
              min="1"
              step="0.01"
              value={form.budget}
              onChange={(event) => {
                handleChange(event);
                setFieldErrors((prev) => ({ ...prev, budget: null }));
              }}
              required
            />
            {fieldErrors.budget ? <p className="mt-1 text-xs text-red-600">{fieldErrors.budget}</p> : null}
          </label>

          <label className="text-sm font-medium text-slate-700">
            Deadline
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              name="deadline"
              type="date"
              value={form.deadline}
              onChange={(event) => {
                handleChange(event);
                setFieldErrors((prev) => ({ ...prev, deadline: null }));
              }}
              required
            />
            {fieldErrors.deadline ? <p className="mt-1 text-xs text-red-600">{fieldErrors.deadline}</p> : null}
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Status
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            name="project_status"
            value={form.project_status}
            onChange={handleChange}
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="closed">Closed</option>
          </select>
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Posting..." : "Post Project"}
        </button>
        </form>
      </div>

      <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Posted Projects</h3>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            {postedProjects.length}
          </span>
        </div>

        <p className="mt-2 text-sm text-slate-600">Your recently posted projects appear here.</p>

        {isLoadingProjects ? <p className="mt-4 text-sm text-slate-600">Loading posted projects...</p> : null}

        {!isLoadingProjects ? (
          <div className="mt-4 space-y-3 lg:max-h-[72vh] lg:overflow-y-auto lg:pr-1">
            {postedProjects.map((project) => (
              <article
                key={project.project_id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-sm font-semibold text-slate-900">{project.title}</h4>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    {toLabel(project.project_status)}
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-500 line-clamp-2">{project.description}</p>

                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <p>Budget: {formatCurrency(project.budget)}</p>
                  <p>Deadline: {formatDate(project.deadline)}</p>
                  <p>Work Mode: {toLabel(project.work_mode)}</p>
                </div>

                {Array.isArray(project.tech_stack) && project.tech_stack.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {project.tech_stack.slice(0, 4).map((item) => (
                      <span key={`${project.project_id}-${item}`} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}

            {postedProjects.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                You have not posted any projects yet.
              </div>
            ) : null}
          </div>
        ) : null}
      </aside>
    </section>
  );
}

export default PostProjectPage;
