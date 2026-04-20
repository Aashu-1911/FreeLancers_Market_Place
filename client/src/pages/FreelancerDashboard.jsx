import { useEffect, useMemo, useState } from "react";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

function ratingStars(rating) {
  const safe = Math.max(0, Math.min(5, Number(rating) || 0));
  return `${"*".repeat(safe)}${"-".repeat(5 - safe)} (${safe}/5)`;
}

function FreelancerDashboard() {
  const { user } = useAuth();

  const [applications, setApplications] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user?.user_id) {
        return;
      }

      try {
        setError("");

        const profileResponse = await api.get(`/api/profile/freelancer/${user.user_id}`);
        const freelancerId = profileResponse.data.freelancer_id;

        const [applicationsResponse, contractsResponse, reviewsResponse] = await Promise.all([
          api.get(`/api/applications/freelancer/${freelancerId}`),
          api.get(`/api/contracts/freelancer/${freelancerId}`),
          api.get(`/api/reviews/freelancer/${freelancerId}`),
        ]);

        setApplications(applicationsResponse.data);
        setContracts(contractsResponse.data);
        setReviews(reviewsResponse.data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to load dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, [user?.user_id]);

  const summary = useMemo(() => {
    const activeContracts = contracts.filter((contract) => contract.status === "active").length;
    const completedContracts = contracts.filter((contract) => contract.status === "completed").length;
    const averageRating =
      reviews.length > 0
        ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1)
        : "0.0";

    return {
      totalApplications: applications.length,
      activeContracts,
      completedContracts,
      averageRating,
    };
  }, [applications, contracts, reviews]);

  const recentApplications = applications.slice(0, 5);
  const recentContracts = contracts.slice(0, 5);

  if (isLoading) {
    return <p className="text-slate-600">Loading freelancer dashboard...</p>;
  }

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Freelancer Dashboard</h2>
        <p className="mt-2 text-sm text-slate-600">Track your applications, contracts, and feedback.</p>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="stat-card rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total Applications</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.totalApplications}</p>
        </article>
        <article className="stat-card rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Active Contracts</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.activeContracts}</p>
        </article>
        <article className="stat-card rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Completed Contracts</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.completedContracts}</p>
        </article>
        <article className="stat-card rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Average Rating</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.averageRating}</p>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Recent Applications</h3>
          <ul className="mt-4 space-y-3">
            {recentApplications.map((application) => (
              <li key={application.application_id} className="rounded-md border border-slate-200 p-3">
                <p className="font-medium text-slate-900">{application.project.title}</p>
                <p className="mt-1 text-sm text-slate-600">Project Status: {application.project.project_status}</p>
              </li>
            ))}
            {recentApplications.length === 0 ? <li className="text-sm text-slate-500">No recent applications.</li> : null}
          </ul>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Recent Contracts</h3>
          <ul className="mt-4 space-y-3">
            {recentContracts.map((contract) => (
              <li key={contract.contract_id} className="rounded-md border border-slate-200 p-3">
                <p className="font-medium text-slate-900">{contract.project.title}</p>
                <p className="mt-1 text-sm text-slate-600">
                  Client: {contract.client.user.first_name} {contract.client.user.last_name}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Amount: {formatCurrency(contract.agreed_amount)} • Status: {contract.status}
                </p>
              </li>
            ))}
            {recentContracts.length === 0 ? <li className="text-sm text-slate-500">No recent contracts.</li> : null}
          </ul>
        </article>
      </div>

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Reviews Received</h3>
        <ul className="mt-4 space-y-3">
          {reviews.map((review) => (
            <li key={review.review_id} className="rounded-md border border-slate-200 p-3">
              <p className="font-medium text-slate-900">Rating: {ratingStars(review.rating)}</p>
              <p className="mt-1 text-sm text-slate-600">Comment: {review.comment || "No comment"}</p>
              <p className="mt-1 text-xs text-slate-500">Project: {review.contract.project.title}</p>
            </li>
          ))}
          {reviews.length === 0 ? <li className="text-sm text-slate-500">No reviews yet.</li> : null}
        </ul>
      </article>
    </section>
  );
}

export default FreelancerDashboard;
