import { useMemo } from "react";

function normalizeUrl(value) {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("/")) {
    const apiBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
    return `${apiBaseUrl}${trimmed}`;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function formatFreelancerRating(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed.toFixed(1);
}

function FreelancerProfilePreviewModal({ isOpen, freelancer, onClose }) {
  const skills = useMemo(
    () => (freelancer?.skills || []).map((entry) => entry.skill.skill_name),
    [freelancer]
  );

  if (!isOpen || !freelancer) {
    return null;
  }

  const initials = `${freelancer.user.first_name?.[0] || ""}${freelancer.user.last_name?.[0] || ""}`.toUpperCase() || "F";
  const profilePictureUrl = normalizeUrl(freelancer.user.profile_picture);
  const portfolioUrl = normalizeUrl(freelancer.portfolio);
  const resumeUrl = normalizeUrl(freelancer.resume);
  const ratingValue = formatFreelancerRating(freelancer.average_rating);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {profilePictureUrl ? (
              <img
                src={profilePictureUrl}
                alt="Freelancer"
                className="h-12 w-12 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                {initials}
              </div>
            )}
            <div>
              <h3 className="text-xl font-semibold text-slate-900">
                {freelancer.user.first_name} {freelancer.user.last_name}
              </h3>
              <p className="text-sm text-slate-600">@{freelancer.user.username || "user"}</p>
              <p className="mt-1 text-sm font-semibold text-amber-600">
                {freelancer.rating_count > 0 && ratingValue ? `★ ${ratingValue}` : "No ratings yet"}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-600">Work Score: {freelancer.work_score || 0}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</p>
            <p className="mt-2 text-sm text-slate-700">Email: {freelancer.user.email || "Not provided"}</p>
            <p className="mt-1 text-sm text-slate-700">Phone: {freelancer.user.phone || "Not provided"}</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profile Links</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {portfolioUrl ? (
                <a
                  href={portfolioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                >
                  Portfolio
                </a>
              ) : (
                <span className="text-sm text-slate-500">Portfolio not added</span>
              )}

              {resumeUrl ? (
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  Resume
                </a>
              ) : (
                <span className="text-sm text-slate-500">Resume not added</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Skills</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {skills.length > 0 ? (
              skills.map((skill) => (
                <span key={skill} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">No skills added yet.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FreelancerProfilePreviewModal;
