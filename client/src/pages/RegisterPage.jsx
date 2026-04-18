import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const validate = () => {
    const nextErrors = {};

    if (!form.first_name.trim()) {
      nextErrors.first_name = "First name is required.";
    }

    if (!form.last_name.trim()) {
      nextErrors.last_name = "Last name is required.";
    }

    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!form.password || form.password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await api.post("/api/auth/register", form);
      login(response.data.token, response.data.user);
      toast.success("Registration successful.");

      if (form.role === "freelancer") {
        navigate("/freelancer/profile", { replace: true });
      } else {
        navigate("/client/profile", { replace: true });
      }
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Registration failed";
      setError(message);
      toast.error(message);
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
              onChange={(event) => {
                handleChange(event);
                setFieldErrors((prev) => ({ ...prev, first_name: null }));
              }}
              required
            />
            {fieldErrors.first_name ? <p className="mt-1 text-xs text-red-600">{fieldErrors.first_name}</p> : null}
          </label>

          <label className="text-sm font-medium text-slate-700">
            Last name
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              name="last_name"
              value={form.last_name}
              onChange={(event) => {
                handleChange(event);
                setFieldErrors((prev) => ({ ...prev, last_name: null }));
              }}
              required
            />
            {fieldErrors.last_name ? <p className="mt-1 text-xs text-red-600">{fieldErrors.last_name}</p> : null}
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            name="email"
            type="email"
            value={form.email}
            onChange={(event) => {
              handleChange(event);
              setFieldErrors((prev) => ({ ...prev, email: null }));
            }}
            required
          />
          {fieldErrors.email ? <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p> : null}
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
              onChange={(event) => {
                handleChange(event);
                setFieldErrors((prev) => ({ ...prev, password: null }));
              }}
              required
              minLength={6}
            />
            {fieldErrors.password ? <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p> : null}
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
