import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const fields = ["first_name", "last_name", "email", "phone", "city", "pincode", "client_type"];

function ClientProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.user_id) {
        return;
      }

      try {
        setError("");
        const response = await api.get(`/api/profile/client/${user.user_id}`);
        setProfile(response.data);
        setForm({
          first_name: response.data.user.first_name || "",
          last_name: response.data.user.last_name || "",
          email: response.data.user.email || "",
          phone: response.data.user.phone || "",
          city: response.data.user.city || "",
          pincode: response.data.user.pincode || "",
          client_type: response.data.client_type || "",
        });
      } catch (requestError) {
        const message = requestError.response?.data?.message || "Failed to load client profile";
        setError(message);
        toast.error(message);
      }
    };

    fetchProfile();
  }, [user?.user_id]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};
    if (!form.first_name?.trim()) {
      nextErrors.first_name = "First name is required.";
    }
    if (!form.last_name?.trim()) {
      nextErrors.last_name = "Last name is required.";
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email || "")) {
      nextErrors.email = "Enter a valid email address.";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!profile?.client_id) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const payload = {
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        email: form.email || null,
        phone: form.phone || null,
        city: form.city || null,
        pincode: form.pincode || null,
        client_type: form.client_type || "individual",
      };

      const response = await api.put(`/api/profile/client/${profile.client_id}`, payload);
      setProfile(response.data);
      toast.success("Profile updated successfully.");
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to update client profile";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile) {
    return <p className="text-slate-600">Loading client profile...</p>;
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">Client Profile</h2>
      <p className="mt-2 text-sm text-slate-600">Update your account and organization details.</p>

      <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
        {fields.map((field) => (
          <label key={field} className="text-sm font-medium text-slate-700">
            {field.replaceAll("_", " ")}
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              name={field}
              value={form[field] || ""}
              onChange={(event) => {
                handleChange(event);
                setFieldErrors((prev) => ({ ...prev, [field]: null }));
              }}
            />
            {fieldErrors[field] ? <p className="mt-1 text-xs text-red-600">{fieldErrors[field]}</p> : null}
          </label>
        ))}

        {error ? <p className="text-sm text-red-600 sm:col-span-2">{error}</p> : null}

        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
        >
          {isSaving ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </section>
  );
}

export default ClientProfilePage;
