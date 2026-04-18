import { useEffect, useState } from "react";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

function MyApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
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

        const applicationsResponse = await api.get(`/api/applications/freelancer/${freelancerId}`);
        setApplications(applicationsResponse.data);
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
        {applications.map((application) => (
          <li key={application.application_id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">{application.project.title}</h3>
            <p className="mt-1 text-sm text-slate-600">
              Client: {application.project.client.user.first_name} {application.project.client.user.last_name}
            </p>

            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-700">
              <p>Budget: {formatCurrency(application.project.budget)}</p>
              <p>Deadline: {new Date(application.project.deadline).toLocaleDateString()}</p>
              <p>Status: {application.project.project_status}</p>
              <p>Applied: {new Date(application.applied_date).toLocaleDateString()}</p>
            </div>
          </li>
        ))}

        {applications.length === 0 ? (
          <li className="rounded-xl border border-slate-200 bg-white p-5 text-slate-600">
            You have not applied to any projects yet.
          </li>
        ) : null}
      </ul>
    </section>
  );
}

export default MyApplicationsPage;
