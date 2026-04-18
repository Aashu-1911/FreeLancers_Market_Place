import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const initialFormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  city: "",
  pincode: "",
  password: "",
  role: "freelancer",
};

function RegisterPage() {
  const [form, setForm] = useState(initialFormState);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await api.post("/api/auth/register", form);
      login(response.data.token);

      if (form.role === "freelancer") {
        navigate("/freelancer/profile", { replace: true });
      } else {
        navigate("/client/profile", { replace: true });
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">Create your account</h2>
      <p className="mt-2 text-sm text-slate-600">Join SkillHire as a freelancer or client.</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            First name
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              required
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Last name
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              required
            />
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Phone
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              name="phone"
              value={form.phone}
              onChange={handleChange}
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Pincode
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              name="pincode"
              value={form.pincode}
              onChange={handleChange}
            />
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          City
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            name="city"
            value={form.city}
            onChange={handleChange}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Password
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Role
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              name="role"
              value={form.role}
              onChange={handleChange}
            >
              <option value="freelancer">Freelancer</option>
              <option value="client">Client</option>
            </select>
          </label>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Creating account..." : "Register"}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        Already have an account?{" "}
        <Link className="font-medium text-blue-600 hover:text-blue-700" to="/login">
          Login
        </Link>
      </p>
    </section>
  );
}

export default RegisterPage;
