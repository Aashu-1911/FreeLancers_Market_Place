import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

function statusClasses(status) {
  if (status === "completed") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "cancelled") {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-blue-100 text-blue-700";
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

function ClientContractsPage() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchContracts = async () => {
      if (!user?.user_id) {
        return;
      }

      try {
        setError("");
        const profileResponse = await api.get(`/api/profile/client/${user.user_id}`);
        const clientId = profileResponse.data.client_id;

        const contractsResponse = await api.get(`/api/contracts/client/${clientId}`);
        setContracts(contractsResponse.data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to load contracts");
      } finally {
        setIsLoading(false);
      }
    };

    fetchContracts();
  }, [user?.user_id]);

  if (isLoading) {
    return <p className="text-slate-600">Loading contracts...</p>;
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Client Contracts</h2>
        <p className="mt-2 text-sm text-slate-600">View and manage all contracts you created.</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <ul className="space-y-4">
        {contracts.map((contract) => (
          <li key={contract.contract_id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{contract.project.title}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Freelancer: {contract.freelancer.user.first_name} {contract.freelancer.user.last_name}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusClasses(contract.status)}`}>
                {contract.status}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-700">
              <p>Amount: {formatCurrency(contract.agreed_amount)}</p>
              <p>Start: {new Date(contract.start_date).toLocaleDateString()}</p>
              <p>End: {contract.end_date ? new Date(contract.end_date).toLocaleDateString() : "Not set"}</p>
            </div>

            <Link
              to={`/contracts/${contract.contract_id}`}
              className="mt-4 inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              View Contract
            </Link>
          </li>
        ))}

        {contracts.length === 0 ? (
          <li className="rounded-xl border border-slate-200 bg-white p-5 text-slate-600">No contracts available yet.</li>
        ) : null}
      </ul>
    </section>
  );
}

export default ClientContractsPage;
