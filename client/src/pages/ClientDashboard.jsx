import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

function ClientDashboard() {
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user?.user_id) {
        return;
      }

      try {
        setError("");

        const profileResponse = await api.get(`/api/profile/client/${user.user_id}`);
        const clientId = profileResponse.data.client_id;

        const [projectsResponse, contractsResponse] = await Promise.all([
          api.get(`/api/projects/client/${clientId}`),
          api.get(`/api/contracts/client/${clientId}`),
        ]);

        setProjects(projectsResponse.data);
        setContracts(contractsResponse.data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to load dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, [user?.user_id]);

  const summary = useMemo(() => {
    const totalProjectsPosted = projects.length;
    const totalContractsCreated = contracts.length;
    const totalSpent = contracts
      .filter((contract) => contract.status === "completed")
      .reduce((sum, contract) => sum + Number(contract.agreed_amount || 0), 0);

    return {
      totalProjectsPosted,
      totalContractsCreated,
      totalSpent,
    };
  }, [projects, contracts]);

  const activeProjects = projects.filter((project) => ["open", "in_progress"].includes(project.project_status)).slice(0, 6);
  const activeContracts = contracts.filter((contract) => contract.status === "active").slice(0, 6);

  if (isLoading) {
    return <p className="text-slate-600">Loading client dashboard...</p>;
  }

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Client Dashboard</h2>
        <p className="mt-2 text-sm text-slate-600">Monitor your hiring pipeline and contract activity.</p>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total Projects Posted</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.totalProjectsPosted}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total Contracts Created</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.totalContractsCreated}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total Spent</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{formatCurrency(summary.totalSpent)}</p>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Active Projects</h3>
          <ul className="mt-4 space-y-3">
            {activeProjects.map((project) => (
              <li key={project.project_id} className="rounded-md border border-slate-200 p-3">
                <p className="font-medium text-slate-900">{project.title}</p>
                <p className="mt-1 text-sm text-slate-600">
                  Applicants: {project._count?.applications || 0} • Status: {project.project_status}
                </p>
              </li>
            ))}
            {activeProjects.length === 0 ? <li className="text-sm text-slate-500">No active projects.</li> : null}
          </ul>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Active Contracts</h3>
          <ul className="mt-4 space-y-3">
            {activeContracts.map((contract) => (
              <li key={contract.contract_id} className="rounded-md border border-slate-200 p-3">
                <p className="font-medium text-slate-900">{contract.project.title}</p>
                <p className="mt-1 text-sm text-slate-600">
                  Freelancer: {contract.freelancer.user.first_name} {contract.freelancer.user.last_name}
                </p>
                <p className="mt-1 text-sm text-slate-600">Status: {contract.status}</p>
              </li>
            ))}
            {activeContracts.length === 0 ? <li className="text-sm text-slate-500">No active contracts.</li> : null}
          </ul>
        </article>
      </div>

      <div>
        <Link
          to="/projects/post"
          className="inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Post a New Project
        </Link>
      </div>
    </section>
  );
}

export default ClientDashboard;
