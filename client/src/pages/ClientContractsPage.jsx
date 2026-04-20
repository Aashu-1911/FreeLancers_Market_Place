import { useEffect, useMemo, useState } from "react";
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
  const [projects, setProjects] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const selectedProject = useMemo(
    () => projects.find((project) => project.project_id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const contractsByProjectId = useMemo(() => {
    return contracts.reduce((acc, contract) => {
      acc[contract.project_id] = (acc[contract.project_id] || 0) + 1;
      return acc;
    }, {});
  }, [contracts]);

  const filteredContracts = useMemo(() => {
    if (!selectedProjectId) {
      return [];
    }

    return contracts.filter((contract) => contract.project_id === selectedProjectId);
  }, [contracts, selectedProjectId]);

  useEffect(() => {
    const fetchContracts = async () => {
      if (!user?.user_id) {
        return;
      }

      try {
        setError("");
        const profileResponse = await api.get(`/api/profile/client/${user.user_id}`);
        const clientId = profileResponse.data.client_id;

        const [contractsResponse, projectsResponse] = await Promise.all([
          api.get(`/api/contracts/client/${clientId}`),
          api.get(`/api/projects/client/${clientId}`),
        ]);

        setContracts(contractsResponse.data);
        setProjects(projectsResponse.data);

        const firstProjectWithContracts = projectsResponse.data.find(
          (project) => (contractsResponse.data || []).some((contract) => contract.project_id === project.project_id)
        );

        if (firstProjectWithContracts) {
          setSelectedProjectId(firstProjectWithContracts.project_id);
        } else if (projectsResponse.data.length > 0) {
          setSelectedProjectId(projectsResponse.data[0].project_id);
        }
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
        <p className="mt-2 text-sm text-slate-600">Select a project to view and manage only its related contracts.</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Your Projects</h3>
          <ul className="mt-4 space-y-3">
            {projects.map((project) => (
              <li key={project.project_id}>
                <button
                  type="button"
                  onClick={() => setSelectedProjectId(project.project_id)}
                  className={`w-full rounded-lg border px-4 py-3 text-left ${
                    selectedProjectId === project.project_id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <p className="font-semibold text-slate-900">{project.title}</p>
                  <p className="mt-1 text-sm font-medium text-slate-700">Project ID: #{project.project_id}</p>
                  <p className="mt-1 text-xs uppercase text-slate-500">
                    {project.project_status} • {contractsByProjectId[project.project_id] || 0} contracts
                  </p>
                </button>
              </li>
            ))}

            {projects.length === 0 ? <li className="text-sm text-slate-500">No projects found.</li> : null}
          </ul>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Contracts</h3>

          {selectedProject ? (
            <p className="mt-2 text-sm text-slate-600">
              Showing contracts for Project #{selectedProject.project_id}: {selectedProject.title}
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Select a project to view contracts.</p>
          )}

          <ul className="mt-4 space-y-4">
            {filteredContracts.map((contract) => (
              <li key={contract.contract_id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Freelancer: {contract.freelancer.user.first_name} {contract.freelancer.user.last_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">@{contract.freelancer.user.username || "user"}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusClasses(contract.status)}`}>
                    {contract.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-700">
                  <p>Amount: {formatCurrency(contract.agreed_amount)}</p>
                  <p>Scope: {contract.contract_scope === "task_based" ? "Specific Task" : "Whole Project"}</p>
                  <p>Start: {new Date(contract.start_date).toLocaleDateString()}</p>
                  <p>End: {contract.end_date ? new Date(contract.end_date).toLocaleDateString() : "Not set"}</p>
                </div>

                {contract.task_description ? <p className="mt-2 text-sm text-slate-600">Task: {contract.task_description}</p> : null}

                <Link
                  to={`/contracts/${contract.contract_id}`}
                  className="mt-3 inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  View Contract
                </Link>
              </li>
            ))}

            {selectedProject && filteredContracts.length === 0 ? (
              <li className="text-sm text-slate-500">No contracts found for this project.</li>
            ) : null}

            {!selectedProject ? <li className="text-sm text-slate-500">Select a project to view contracts.</li> : null}
          </ul>
        </article>
      </div>
    </section>
  );
}

export default ClientContractsPage;
