import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const userFields = ["first_name", "last_name", "email", "phone", "city", "pincode"];
const freelancerFields = ["college_name", "degree", "year_of_study", "portfolio", "resume", "status"];

function FreelancerProfilePage() {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [skillQuery, setSkillQuery] = useState("");
  const [form, setForm] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

      if (payload.year_of_study) {
        payload.year_of_study = Number(payload.year_of_study);
      }

      const response = await api.put(`/api/profile/freelancer/${profile.freelancer_id}`, payload);
      setProfile(response.data);
      toast.success("Profile updated successfully.");
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to update profile";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
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

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Freelancer Profile</h2>
        <p className="mt-2 text-sm text-slate-600">Manage your personal and professional details.</p>

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
