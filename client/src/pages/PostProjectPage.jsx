import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../lib/api.js";

const initialState = {
  title: "",
  description: "",
  budget: "",
  deadline: "",
  tech_stack: [],
  required_skill_ids: [],
  project_status: "open",
};

function PostProjectPage() {
  const [form, setForm] = useState(initialState);
  const [skills, setSkills] = useState([]);
  const [techStackInput, setTechStackInput] = useState("");
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoadingSkills, setIsLoadingSkills] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

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
      await api.post("/api/projects", {
        ...form,
        budget: Number(form.budget),
      });

      toast.success("Project posted successfully.");
      navigate("/client/manage-projects", { replace: true });
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to post project";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
    </section>
  );
}

export default PostProjectPage;
