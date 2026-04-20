import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const fields = ["first_name", "last_name", "email", "phone"];

function toPublicFileUrl(value, cacheKey = null) {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return "";
  }

  let publicUrl = trimmed;

  if (!/^https?:\/\//i.test(trimmed)) {
    const apiBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
    const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    publicUrl = `${apiBaseUrl}${normalizedPath}`;
  }

  if (!cacheKey) {
    return publicUrl;
  }

  try {
    const parsedUrl = new URL(publicUrl);
    parsedUrl.searchParams.set("v", String(cacheKey));
    return parsedUrl.toString();
  } catch (_error) {
    const separator = publicUrl.includes("?") ? "&" : "?";
    return `${publicUrl}${separator}v=${encodeURIComponent(String(cacheKey))}`;
  }
}

function normalizePortfolioUrl(value) {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function ClientProfilePage() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingProfilePicture, setIsUploadingProfilePicture] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [profilePictureVersion, setProfilePictureVersion] = useState(null);

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
          portfolio: response.data.portfolio || "",
          resume: response.data.resume || "",
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
    const normalizedPortfolioUrl = normalizePortfolioUrl(form.portfolio);

    if (!form.first_name?.trim()) {
      nextErrors.first_name = "First name is required.";
    }
    if (!form.last_name?.trim()) {
      nextErrors.last_name = "Last name is required.";
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email || "")) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (normalizedPortfolioUrl) {
      try {
        const parsedUrl = new URL(normalizedPortfolioUrl);

        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          nextErrors.portfolio = "Portfolio link must start with http:// or https://";
        }
      } catch (_error) {
        nextErrors.portfolio = "Enter a valid portfolio link.";
      }
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
        portfolio: normalizedPortfolioUrl || null,
      };

      const response = await api.put(`/api/profile/client/${profile.client_id}`, payload);
      setProfile(response.data);
      setForm((prev) => ({
        ...prev,
        portfolio: response.data.portfolio || "",
        resume: response.data.resume || "",
      }));
      updateUser({
        first_name: response.data.user.first_name,
        last_name: response.data.user.last_name,
        email: response.data.user.email,
      });
      toast.success("Profile updated successfully.");
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to update client profile";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfilePictureFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setProfilePictureFile(selectedFile);
  };

  const handleProfilePictureUpload = async () => {
    if (!profilePictureFile) {
      return;
    }

    setIsUploadingProfilePicture(true);

    try {
      setError("");

      const payload = new FormData();
      payload.append("profile_picture", profilePictureFile);

      const response = await api.post("/api/profile/photo", payload);
      const cacheVersion = Date.now();

      setProfile((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          profile_picture: response.data.user.profile_picture,
        },
      }));
      setProfilePictureVersion(cacheVersion);
      updateUser({
        profile_picture: response.data.user.profile_picture,
        profile_picture_version: cacheVersion,
      });
      setProfilePictureFile(null);
      toast.success("Profile picture uploaded successfully.");
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to upload profile picture";
      setError(message);
      toast.error(message);
    } finally {
      setIsUploadingProfilePicture(false);
    }
  };

  const handleResumeFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setResumeFile(selectedFile);
  };

  const handleResumeUpload = async () => {
    if (!profile?.client_id || !resumeFile) {
      return;
    }

    setIsUploadingResume(true);

    try {
      setError("");

      const payload = new FormData();
      payload.append("resume", resumeFile);

      const response = await api.post(`/api/profile/client/${profile.client_id}/resume`, payload);

      setProfile(response.data.client || profile);
      setForm((prev) => ({
        ...prev,
        resume: response.data.resume || prev.resume,
      }));
      setResumeFile(null);
      toast.success("Resume uploaded successfully.");
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to upload resume";
      setError(message);
      toast.error(message);
    } finally {
      setIsUploadingResume(false);
    }
  };

  if (!profile) {
    return <p className="text-slate-600">Loading client profile...</p>;
  }

  const profilePictureUrl = toPublicFileUrl(
    profile.user?.profile_picture || user?.profile_picture,
    profilePictureVersion || user?.profile_picture_version
  );
  const profileInitial = String(profile.user?.username || profile.user?.first_name || "U").charAt(0).toUpperCase();

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">Client Profile</h2>
      <p className="mt-2 text-sm text-slate-600">Update your account details, portfolio link, and resume.</p>

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-800">Profile Picture</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          {profilePictureUrl ? (
            <img
              src={profilePictureUrl}
              alt="Profile"
              className="h-16 w-16 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-xl font-semibold text-slate-700">
              {profileInitial}
            </span>
          )}

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleProfilePictureFileChange}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleProfilePictureUpload}
              disabled={!profilePictureFile || isUploadingProfilePicture}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploadingProfilePicture ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      </div>

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

        <label className="text-sm font-medium text-slate-700 sm:col-span-2">
          Portfolio Link
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            name="portfolio"
            type="url"
            placeholder="https://your-portfolio.com"
            value={form.portfolio || ""}
            onChange={(event) => {
              handleChange(event);
              setFieldErrors((prev) => ({ ...prev, portfolio: null }));
            }}
          />
          {fieldErrors.portfolio ? <p className="mt-1 text-xs text-red-600">{fieldErrors.portfolio}</p> : null}
          {form.portfolio ? (
            <a
              className="mt-2 inline-block text-xs font-medium text-blue-700 hover:underline"
              href={normalizePortfolioUrl(form.portfolio)}
              target="_blank"
              rel="noreferrer"
            >
              Open portfolio
            </a>
          ) : null}
        </label>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
          <p className="text-sm font-semibold text-slate-800">Resume</p>
          <p className="mt-1 text-xs text-slate-600">Upload PDF, DOC, or DOCX (max 5MB).</p>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleResumeFileChange}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            />

            <button
              type="button"
              onClick={handleResumeUpload}
              disabled={!resumeFile || isUploadingResume}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploadingResume ? "Uploading..." : "Upload Resume"}
            </button>
          </div>

          {form.resume ? (
            <a
              className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline"
              href={toPublicFileUrl(form.resume)}
              target="_blank"
              rel="noreferrer"
            >
              View current resume
            </a>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No resume uploaded yet.</p>
          )}
        </div>

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
