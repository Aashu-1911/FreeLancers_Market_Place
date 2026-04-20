import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

function projectStatusLabel(status) {
  if (status === "in_progress") {
    return "In progress";
  }

  if (status === "open") {
    return "Open";
  }

  if (status === "closed") {
    return "Closed";
  }

  return String(status || "Unknown");
}

function projectStatusClasses(status) {
  if (status === "in_progress") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "open") {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-slate-100 text-slate-700";
}

function contractStatusLabel(status) {
  if (status === "active") {
    return "Active";
  }

  if (status === "completed") {
    return "Completed";
  }

  if (status === "cancelled") {
    return "Cancelled";
  }

  return String(status || "Unknown");
}

function contractStatusClasses(status) {
  if (status === "active") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "completed") {
    return "bg-slate-200 text-slate-700";
  }

  if (status === "cancelled") {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-blue-100 text-blue-700";
}

function formatShortDate(value) {
  if (!value) {
    return "TBD";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "TBD";
  }

  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function getContractProgress(contract) {
  if (contract.status === "completed") {
    return 100;
  }

  if (contract.status === "cancelled") {
    return 0;
  }

  const startDate = new Date(contract.start_date);
  const dueDate = contract.end_date ? new Date(contract.end_date) : new Date(contract.project?.deadline);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(dueDate.getTime()) || dueDate <= startDate) {
    return 60;
  }

  const now = Date.now();
  const elapsed = now - startDate.getTime();
  const total = dueDate.getTime() - startDate.getTime();

  if (elapsed <= 0) {
    return 15;
  }

  if (elapsed >= total) {
    return 100;
  }

  const ratio = (elapsed / total) * 100;
  return Math.max(10, Math.min(95, Math.round(ratio)));
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
        <article className="stat-card rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total Projects Posted</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.totalProjectsPosted}</p>
        </article>
        <article className="stat-card rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total Contracts Created</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.totalContractsCreated}</p>
        </article>
        <article className="stat-card rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total Spent</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{formatCurrency(summary.totalSpent)}</p>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">Active projects</h3>
            <Link to="/client/manage-projects" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>

          <ul className="mt-4 space-y-3">
            {activeProjects.map((project) => (
              <li key={project.project_id} className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
                <p className="text-[1.08rem] font-semibold text-slate-900">{project.title}</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${projectStatusClasses(project.project_status)}`}
                  >
                    {projectStatusLabel(project.project_status)}
                  </span>
                  <span>{project._count?.applications || 0} applicants</span>
                  <span>·</span>
                  <span>Budget {formatCurrency(project.budget)}</span>
                </p>
              </li>
            ))}
            {activeProjects.length === 0 ? <li className="text-sm text-slate-500">No active projects.</li> : null}
          </ul>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Active contracts</h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {activeContracts.map((contract) => (
              <li key={contract.contract_id} className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
                <p className="text-[1.08rem] font-semibold text-slate-900">{contract.project.title}</p>
                <p className="mt-1 text-sm text-slate-600">
                  Freelancer: {contract.freelancer.user.first_name} {contract.freelancer.user.last_name}
                </p>

                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${contractStatusClasses(contract.status)}`}
                  >
                    {contractStatusLabel(contract.status)}
                  </span>
                  <span className="text-xl font-semibold text-slate-900">{formatCurrency(contract.agreed_amount)}</span>
                </div>

                <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-200">
                  <div
                    className="h-1.5 rounded-full bg-[#4EA8F7] transition-all"
                    style={{ width: `${getContractProgress(contract)}%` }}
                  />
                </div>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {getContractProgress(contract)}% · Due {formatShortDate(contract.end_date || contract.project?.deadline)}
                </p>
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
