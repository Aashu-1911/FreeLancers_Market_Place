import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import PaymentSection from "../components/PaymentSection.jsx";
import ReviewForm from "./ReviewForm.jsx";

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

function ContractPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [contract, setContract] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadContract = async () => {
    const response = await api.get(`/api/contracts/${id}`);
    setContract(response.data);
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        setError("");
        await loadContract();
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to load contract");
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [id]);

  const handleMarkCompleted = async () => {
    try {
      setError("");
      setSuccessMessage("");
      setIsUpdatingStatus(true);

      const response = await api.put(`/api/contracts/${id}/status`, {
        status: "completed",
      });

      setContract(response.data);
      setSuccessMessage("Contract marked as completed.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to update contract status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return <p className="text-slate-600">Loading contract...</p>;
  }

  if (!contract) {
    return <p className="text-slate-600">Contract not found.</p>;
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-2xl font-semibold text-slate-900">Contract #{contract.contract_id}</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-700">
            {contract.status}
          </span>
        </div>

        <div className="mt-5 grid gap-4 text-sm text-slate-700 sm:grid-cols-2">
          <p>Project: {contract.project.title}</p>
          <p>Agreed Amount: {formatCurrency(contract.agreed_amount)}</p>
          <p>Scope: {contract.contract_scope === "task_based" ? "Specific Task" : "Whole Project"}</p>
          <p>
            Freelancer: {contract.freelancer.user.first_name} {contract.freelancer.user.last_name}
          </p>
          <p>
            Client: {contract.client.user.first_name} {contract.client.user.last_name}
          </p>
          <p>Freelancer Username: @{contract.freelancer.user.username || "user"}</p>
          <p>Client Username: @{contract.client.user.username || "user"}</p>
          <p>Freelancer Email: {contract.freelancer.user.email || "Not set"}</p>
          <p>Freelancer Phone: {contract.freelancer.user.phone || "Not set"}</p>
          <p>Client Email: {contract.client.user.email || "Not set"}</p>
          <p>Client Phone: {contract.client.user.phone || "Not set"}</p>
          <p>Start Date: {new Date(contract.start_date).toLocaleDateString()}</p>
          <p>End Date: {contract.end_date ? new Date(contract.end_date).toLocaleDateString() : "Not set"}</p>
        </div>

        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Task Description</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
            {contract.task_description || "No task description provided for this contract."}
          </p>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {successMessage ? <p className="mt-4 text-sm text-emerald-700">{successMessage}</p> : null}

        {user?.role === "client" && contract.status === "active" ? (
          <button
            type="button"
            onClick={handleMarkCompleted}
            disabled={isUpdatingStatus}
            className="mt-5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUpdatingStatus ? "Updating..." : "Mark as Completed"}
          </button>
        ) : null}
      </div>

      <PaymentSection contractId={contract.contract_id} userRole={user?.role} agreedAmount={contract.agreed_amount} />

      {user?.role === "client" && contract.status === "completed" ? (
        <ReviewForm contractId={contract.contract_id} reviewerUserId={user.user_id} />
      ) : null}
    </section>
  );
}

export default ContractPage;
