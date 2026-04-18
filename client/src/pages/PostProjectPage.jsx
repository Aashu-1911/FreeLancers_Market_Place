import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../lib/api.js";

const initialState = {
  title: "",
  description: "",
  budget: "",
  deadline: "",
  project_status: "open",
};

function PostProjectPage() {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

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
