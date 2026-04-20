import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../lib/api.js";

function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const [stats, setStats] = useState({ total_projects: 0, total_freelancers: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setError("");
        const response = await api.get("/api/stats/overview");
        setStats(response.data);
      } catch (_requestError) {
        setError("Unable to load live platform stats right now.");
      }
    };

    fetchStats();
  }, []);

  const postProjectLink = isAuthenticated && user?.role === "client" ? "/post-project" : "/register";

  return (
    <section className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-100 p-8 shadow-sm">
        <h2 className="text-3xl font-semibold text-slate-900">Build Faster with Verified Freelancers</h2>
        <p className="mt-4 max-w-3xl text-slate-700">
          SkillHire connects clients and freelancers for projects, contracts, payments, and transparent feedback in one
          streamlined platform.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/projects"
            className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Find Work
          </Link>
          <Link
            to={postProjectLink}
            className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Post a Project
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <article className="stat-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Projects</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">{stats.total_projects}</p>
        </article>
        <article className="stat-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Freelancers</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">{stats.total_freelancers}</p>
        </article>
      </div>

      {error ? <p className="text-sm text-amber-700">{error}</p> : null}
    </section>
  );
}

export default HomePage;
