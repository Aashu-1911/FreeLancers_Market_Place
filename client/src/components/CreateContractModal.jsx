import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../lib/api.js";

const initialForm = {
  agreed_amount: "",
  contract_scope: "full_project",
  task_description: "",
  start_date: "",
  end_date: "",
};

function CreateContractModal({ isOpen, onClose, projectId, freelancer, clientId, onCreated }) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setForm(initialForm);
      setError("");
      setFieldErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen || !freelancer) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};
    if (!form.agreed_amount || Number(form.agreed_amount) <= 0) {
      nextErrors.agreed_amount = "Amount must be a positive number.";
    }
    if (!form.start_date) {
      nextErrors.start_date = "Start date is required.";
    }
    if (form.contract_scope === "task_based" && !form.task_description.trim()) {
      nextErrors.task_description = "Task details are required for a task-based contract.";
    }
    if (form.end_date && new Date(form.end_date) < new Date(form.start_date)) {
      nextErrors.end_date = "End date cannot be earlier than start date.";
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await api.post("/api/contracts", {
        project_id: projectId,
        freelancer_id: freelancer.freelancer_id,
        client_id: clientId,
        agreed_amount: Number(form.agreed_amount),
        contract_scope: form.contract_scope,
        task_description: form.task_description.trim() || null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        status: "active",
      });

      onCreated(response.data);
      toast.success("Contract created successfully.");
      onClose();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to create contract";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
        <h3 className="text-xl font-semibold text-slate-900">Create Contract</h3>
        <p className="mt-2 text-sm text-slate-600">
          Hiring {freelancer.user.first_name} {freelancer.user.last_name}
        </p>
        <p className="text-sm text-slate-500">@{freelancer.user.username || "user"}</p>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <p className="font-medium text-slate-900">Interview & Contact Details</p>
          <p className="mt-1">Email: {freelancer.user.email || "Not provided"}</p>
          <p className="mt-1">Phone: {freelancer.user.phone || "Not provided"}</p>
          <p className="mt-2 text-xs text-slate-500">
            Connect with the freelancer first, take the interview, and then confirm this contract.
          </p>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700">
            Agreed Amount
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              name="agreed_amount"
              type="number"
              min="1"
              step="0.01"
              value={form.agreed_amount}
              onChange={(event) => {
                handleChange(event);
                setFieldErrors((prev) => ({ ...prev, agreed_amount: null }));
              }}
              required
            />
            {fieldErrors.agreed_amount ? <p className="mt-1 text-xs text-red-600">{fieldErrors.agreed_amount}</p> : null}
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Contract Scope
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              name="contract_scope"
              value={form.contract_scope}
              onChange={handleChange}
            >
              <option value="full_project">Whole Project / Website</option>
              <option value="task_based">Specific Task</option>
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Task Details
            <textarea
              className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2"
              name="task_description"
              value={form.task_description}
              onChange={(event) => {
                handleChange(event);
                setFieldErrors((prev) => ({ ...prev, task_description: null }));
              }}
              placeholder="Describe the work to be done. For full project scope, you can keep this optional."
            />
            {fieldErrors.task_description ? <p className="mt-1 text-xs text-red-600">{fieldErrors.task_description}</p> : null}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Start Date
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                name="start_date"
                type="date"
                value={form.start_date}
                onChange={(event) => {
                  handleChange(event);
                  setFieldErrors((prev) => ({ ...prev, start_date: null }));
                }}
                required
              />
              {fieldErrors.start_date ? <p className="mt-1 text-xs text-red-600">{fieldErrors.start_date}</p> : null}
            </label>

            <label className="text-sm font-medium text-slate-700">
              End Date
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                name="end_date"
                type="date"
                value={form.end_date}
                onChange={(event) => {
                  handleChange(event);
                  setFieldErrors((prev) => ({ ...prev, end_date: null }));
                }}
              />
              {fieldErrors.end_date ? <p className="mt-1 text-xs text-red-600">{fieldErrors.end_date}</p> : null}
            </label>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating..." : "Create Contract"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateContractModal;
