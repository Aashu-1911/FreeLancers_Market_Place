import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../lib/api.js";

const reasonOptions = [
  "Unprofessional behavior",
  "Abusive language",
  "Payment-related misconduct",
  "Scope manipulation",
  "Harassment",
  "Other",
];

function formatStatusLabel(status) {
  const normalized = String(status || "pending").replace(/_/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function ReportClientForm({ contractId }) {
  const [reason, setReason] = useState(reasonOptions[0]);
  const [description, setDescription] = useState("");
  const [existingReport, setExistingReport] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchExistingReport = async () => {
      try {
        setError("");
        const response = await api.get(`/api/reports/contract/${contractId}`);
        setExistingReport(response.data);
      } catch (requestError) {
        if (requestError.response?.status !== 404) {
          const message = requestError.response?.data?.message || "Failed to load report information";
          setError(message);
          toast.error(message);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchExistingReport();
  }, [contractId]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!reason) {
      setError("Please select a reason for reporting.");
      return;
    }

    try {
      setError("");
      setSuccessMessage("");
      setIsSubmitting(true);

      const response = await api.post("/api/reports", {
        contract_id: contractId,
        reason,
        description: description.trim() || null,
      });

      setExistingReport(response.data);
      setSuccessMessage("Report submitted. Our team will review it.");
      toast.success("Report submitted successfully.");
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to submit report";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900">Report Client</h3>
        <p className="mt-3 text-slate-600">Loading report status...</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-slate-900">Report Client</h3>
      <p className="mt-1 text-sm text-slate-600">
        If you experienced improper behavior, submit one report for this contract. The moderation team can review and suspend repeat offenders.
      </p>

      {existingReport ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">Report already submitted</p>
          <p className="mt-1 text-sm text-slate-700">Reason: {existingReport.reason}</p>
          <p className="mt-1 text-sm text-slate-700">Details: {existingReport.description || "No extra details"}</p>
          <p className="mt-1 text-sm text-slate-700">Status: {formatStatusLabel(existingReport.status)}</p>
        </div>
      ) : (
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700">
            Reason
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            >
              {reasonOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Details (optional)
            <textarea
              className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add context that helps moderation review this report"
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </button>
        </form>
      )}

      {error && existingReport ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}

export default ReportClientForm;
