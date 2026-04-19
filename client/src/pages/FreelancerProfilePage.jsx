import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const userFields = ["first_name", "last_name", "email", "phone", "city", "pincode"];
const freelancerFields = ["college_name", "degree", "year_of_study", "status"];

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

function parseYearOfStudyInput(value) {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    return null;
  }

  const numericValue = Number(normalizedValue);

  if (Number.isInteger(numericValue) && numericValue > 0) {
    return numericValue;
  }

  const normalizedLabel = normalizedValue
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ");

  const yearMap = {
    "1": 1,
    "1st": 1,
    "1st year": 1,
    "first": 1,
    "first year": 1,
    "2": 2,
    "2nd": 2,
    "2nd year": 2,
    "second": 2,
    "second year": 2,
    "3": 3,
    "3rd": 3,
    "3rd year": 3,
    "third": 3,
    "third year": 3,
    "4": 4,
    "4th": 4,
    "4th year": 4,
    "fourth": 4,
    "fourth year": 4,
  };

  return yearMap[normalizedLabel] || null;
}

function FreelancerProfilePage() {
  const { user, updateUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [skillQuery, setSkillQuery] = useState("");
  const [form, setForm] = useState({});
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingProfilePicture, setIsUploadingProfilePicture] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [profilePictureVersion, setProfilePictureVersion] = useState(null);

  const assignedSkillIds = useMemo(
    () => new Set((profile?.skills || []).map((entry) => entry.skill_id)),
    [profile]
  );

  const availableSkills = useMemo(
    () => skills.filter((skill) => !assignedSkillIds.has(skill.skill_id)),
    [skills, assignedSkillIds]
  );

  const loadData = async () => {
    if (!user?.user_id) {
      return;
    }

    const [profileResponse, skillsResponse] = await Promise.all([
      api.get(`/api/profile/freelancer/${user.user_id}`),
      api.get("/api/skills"),
    ]);

    setProfile(profileResponse.data);
    setSkills(skillsResponse.data);
    setForm({
      first_name: profileResponse.data.user.first_name || "",
      last_name: profileResponse.data.user.last_name || "",
      email: profileResponse.data.user.email || "",
      phone: profileResponse.data.user.phone || "",
      city: profileResponse.data.user.city || "",
      pincode: profileResponse.data.user.pincode || "",
      college_name: profileResponse.data.college_name || "",
      degree: profileResponse.data.degree || "",
      year_of_study: profileResponse.data.year_of_study || "",
      portfolio: profileResponse.data.portfolio || "",
      resume: profileResponse.data.resume || "",
      status: profileResponse.data.status || "active",
      availability: Boolean(profileResponse.data.availability),
    });
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        setError("");
        await loadData();
      } catch (requestError) {
        const message = requestError.response?.data?.message || "Failed to load freelancer profile";
        setError(message);
        toast.error(message);
      }
    };

    initialize();
  }, [user?.user_id]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    const nextErrors = {};
    const normalizedPortfolioUrl = normalizePortfolioUrl(form.portfolio);
    const parsedYearOfStudy = parseYearOfStudyInput(form.year_of_study);

    if (!form.first_name?.trim()) {
      nextErrors.first_name = "First name is required.";
    }
    if (!form.last_name?.trim()) {
      nextErrors.last_name = "Last name is required.";
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email || "")) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (String(form.year_of_study || "").trim() && parsedYearOfStudy === null) {
      nextErrors.year_of_study = "Enter a valid year (for example: 2, 2nd year, second year).";
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

    if (!profile?.freelancer_id) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const payload = {
        availability: form.availability,
      };

      [...userFields, ...freelancerFields].forEach((field) => {
        payload[field] = form[field] || null;
      });

      payload.portfolio = normalizedPortfolioUrl || null;
      payload.year_of_study = parsedYearOfStudy;

      const response = await api.put(`/api/profile/freelancer/${profile.freelancer_id}`, payload);
      setProfile(response.data);
      updateUser({
        first_name: response.data.user.first_name,
        last_name: response.data.user.last_name,
        email: response.data.user.email,
      });
      setForm((prev) => ({
        ...prev,
        portfolio: response.data.portfolio || "",
        year_of_study: response.data.year_of_study || "",
        resume: response.data.resume || "",
      }));
      toast.success("Profile updated successfully.");
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to update profile";
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
    if (!profile?.freelancer_id || !resumeFile) {
      return;
    }

    setIsUploadingResume(true);

    try {
      setError("");

      const payload = new FormData();
      payload.append("resume", resumeFile);

      const response = await api.post(`/api/profile/freelancer/${profile.freelancer_id}/resume`, payload);

      setProfile(response.data.freelancer || profile);
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

  const handleAssignSkill = async () => {
    if (!profile?.freelancer_id) {
      return;
    }

    const matchedSkill = availableSkills.find(
      (skill) => skill.skill_name.toLowerCase() === skillQuery.trim().toLowerCase()
    );
    const resolvedSkillId = selectedSkillId || matchedSkill?.skill_id;

    if (!resolvedSkillId) {
      const message = "Please choose a skill from suggestions.";
      setError(message);
      toast.error(message);
      return;
    }

    try {
      setError("");
      await api.post("/api/skills/assign", {
        freelancer_id: profile.freelancer_id,
        skill_id: Number(resolvedSkillId),
      });
      setSelectedSkillId("");
      setSkillQuery("");
      await loadData();
      toast.success("Skill assigned successfully.");
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to assign skill";
      setError(message);
      toast.error(message);
    }
  };

  const handleSkillQueryChange = (event) => {
    const nextQuery = event.target.value;
    setSkillQuery(nextQuery);

    const matchedSkill = availableSkills.find(
      (skill) => skill.skill_name.toLowerCase() === nextQuery.trim().toLowerCase()
    );

    setSelectedSkillId(matchedSkill ? String(matchedSkill.skill_id) : "");
  };

  const handleRemoveSkill = async (skillId) => {
    if (!profile?.freelancer_id) {
      return;
    }

    try {
      setError("");
      await api.delete("/api/skills/remove", {
        data: {
          freelancer_id: profile.freelancer_id,
          skill_id: skillId,
        },
      });
      await loadData();
      toast.success("Skill removed successfully.");
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to remove skill";
      setError(message);
      toast.error(message);
    }
  };

  if (!profile) {
    return <p className="text-slate-600">Loading freelancer profile...</p>;
  }

  const profilePictureUrl = toPublicFileUrl(
    profile.user?.profile_picture || user?.profile_picture,
    profilePictureVersion || user?.profile_picture_version
  );
  const profileInitial = String(profile.user?.username || profile.user?.first_name || "U").charAt(0).toUpperCase();

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Freelancer Profile</h2>
        <p className="mt-2 text-sm text-slate-600">Manage your personal and professional details.</p>

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

        <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleSave}>
          {userFields.map((field) => (
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

          {freelancerFields.map((field) => (
            <label key={field} className="text-sm font-medium text-slate-700">
              {field.replaceAll("_", " ")}
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                name={field}
                value={form[field] || ""}
                onChange={handleChange}
              />
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

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
            <input
              type="checkbox"
              name="availability"
              checked={Boolean(form.availability)}
              onChange={handleChange}
            />
            Available for projects
          </label>

          {error ? <p className="text-sm text-red-600 sm:col-span-2">{error}</p> : null}

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
          >
            {isSaving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900">Skills</h3>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            list="skill-suggestions"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={skillQuery}
            onChange={handleSkillQueryChange}
            placeholder="Type a skill to see suggestions"
          />

          <datalist id="skill-suggestions">
            {availableSkills.map((skill) => (
              <option key={skill.skill_id} value={skill.skill_name} />
            ))}
          </datalist>

          <button
            type="button"
            disabled={!selectedSkillId}
            className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleAssignSkill}
          >
            Add Skill
          </button>
        </div>

        <ul className="mt-5 space-y-2">
          {profile.skills.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
            >
              <span className="text-slate-700">{entry.skill.skill_name}</span>
              <button
                type="button"
                onClick={() => handleRemoveSkill(entry.skill_id)}
                className="rounded-md bg-rose-600 px-3 py-1 text-sm font-medium text-white hover:bg-rose-700"
              >
                Remove
              </button>
            </li>
          ))}
          {profile.skills.length === 0 ? <li className="text-sm text-slate-500">No skills assigned yet.</li> : null}
        </ul>
      </div>
    </section>
  );
}

export default FreelancerProfilePage;
