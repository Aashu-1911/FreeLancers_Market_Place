import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await api.post("/api/auth/login", { email, password });
      login(response.data.token);

      const fallbackPath = response.data?.user?.role === "client" ? "/dashboard/client" : "/dashboard/freelancer";
      const redirectPath = location.state?.from?.pathname || fallbackPath;
      navigate(redirectPath, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">Welcome back</h2>
      <p className="mt-2 text-sm text-slate-600">Log in to continue on SkillHire.</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Password
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        New here?{" "}
        <Link className="font-medium text-blue-600 hover:text-blue-700" to="/register">
          Create an account
        </Link>
      </p>
    </section>
  );
}

export default LoginPage;
