import { useEffect, useState } from "react";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

function applicationStatusClasses(status) {
  if (status === "accepted") {
    return "bg-emerald-100 text-emerald-700";
  }

  return "bg-amber-100 text-amber-700";
}

function applicationStatusLabel(status) {
  return status === "accepted" ? "accepted" : "application pending";
}

function MyApplicationsPage() {
  const { user } = useAuth();
  const [applicationItems, setApplicationItems] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchApplications = async () => {
      if (!user?.user_id) {
        return;
      }

      try {
        setError("");
        const profileResponse = await api.get(`/api/profile/freelancer/${user.user_id}`);
        const freelancerId = profileResponse.data.freelancer_id;

        const [applicationsResponse, contractsResponse] = await Promise.all([
          api.get(`/api/applications/freelancer/${freelancerId}`),
          api.get(`/api/contracts/freelancer/${freelancerId}`),
        ]);

        const pendingItems = (applicationsResponse.data || []).map((application) => ({
          id: `application-${application.application_id}`,
          application_status: "pending",
          project: application.project,
          client: application.project.client,
          amount: application.project.budget,
          amount_label: "Budget",
          project_status: application.project.project_status,
          date_label: "Applied",
          status_date: application.applied_date,
        }));

        const acceptedItems = (contractsResponse.data || []).map((contract) => ({
          id: `accepted-${contract.contract_id}`,
          application_status: "accepted",
          project: contract.project,
          client: contract.client,
          amount: contract.agreed_amount,
          amount_label: "Agreed Amount",
          project_status: contract.project.project_status,
          date_label: "Accepted",
          status_date: contract.start_date,
        }));

        const mergedItems = [...acceptedItems, ...pendingItems].sort(
          (a, b) => new Date(b.status_date).getTime() - new Date(a.status_date).getTime()
        );

        setApplicationItems(mergedItems);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to load applications");
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();
  }, [user?.user_id]);

  if (isLoading) {
    return <p className="text-slate-600">Loading your applications...</p>;
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">My Applications</h2>
        <p className="mt-2 text-sm text-slate-600">Review all projects you have applied to.</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <ul className="space-y-4">
        {applicationItems.map((item) => (
          <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{item.project.title}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Client: {item.client.user.first_name} {item.client.user.last_name}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${applicationStatusClasses(item.application_status)}`}
              >
                {applicationStatusLabel(item.application_status)}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-700">
              <p>{item.amount_label}: {formatCurrency(item.amount)}</p>
              <p>Deadline: {new Date(item.project.deadline).toLocaleDateString()}</p>
              <p>Status: {item.project_status}</p>
              <p>{item.date_label}: {new Date(item.status_date).toLocaleDateString()}</p>
            </div>
          </li>
        ))}

        {applicationItems.length === 0 ? (
          <li className="rounded-xl border border-slate-200 bg-white p-5 text-slate-600">
            You have not applied to any projects yet.
          </li>
        ) : null}
      </ul>
    </section>
  );
}

export default MyApplicationsPage;
