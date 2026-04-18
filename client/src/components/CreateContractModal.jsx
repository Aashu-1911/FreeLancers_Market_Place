import { useEffect, useState } from "react";
import api from "../lib/api.js";

const initialForm = {
  agreed_amount: "",
  start_date: "",
  end_date: "",
};

function CreateContractModal({ isOpen, onClose, projectId, freelancer, clientId, onCreated }) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setForm(initialForm);
      setError("");
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
    setError("");
    setIsSubmitting(true);

    try {
      const response = await api.post("/api/contracts", {
        project_id: projectId,
        freelancer_id: freelancer.freelancer_id,
        client_id: clientId,
        agreed_amount: Number(form.agreed_amount),
        start_date: form.start_date,
        end_date: form.end_date || null,
        status: "active",
      });

      onCreated(response.data);
      onClose();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to create contract");
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
              onChange={handleChange}
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Start Date
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                name="start_date"
                type="date"
                value={form.start_date}
                onChange={handleChange}
                required
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              End Date
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                name="end_date"
                type="date"
                value={form.end_date}
                onChange={handleChange}
              />
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
