import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

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

function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const profilePath = user?.role === "client" ? "/client/profile" : "/freelancer/profile";
  const dashboardPath = user?.role === "client" ? "/dashboard/client" : "/dashboard/freelancer";
  const profilePictureUrl = toPublicFileUrl(user?.profile_picture, user?.profile_picture_version);
  const profileInitial = String(user?.username || user?.first_name || "U").charAt(0).toUpperCase();
  const navLinkClass = "transition-colors hover:text-[#4EA8F7]";

  return (
    <header className="border-b border-[#2B3A4C] bg-[#1E2A3A] text-slate-100 shadow-sm">
      <nav className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <h1 className="text-xl font-semibold tracking-wide text-white">SkillHire</h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-slate-200">
          {!isAuthenticated ? (
            <Link className={navLinkClass} to="/home">
              Home
            </Link>
          ) : (
            <Link className={navLinkClass} to={dashboardPath}>
              Dashboard
            </Link>
          )}
          {user?.role !== "client" ? (
            <Link className={navLinkClass} to="/projects">
              Projects
            </Link>
          ) : null}

          {!isAuthenticated ? (
            <>
              <Link className={navLinkClass} to="/register">
                Register
              </Link>
              <Link className={navLinkClass} to="/login">
                Login
              </Link>
            </>
          ) : null}

          {isAuthenticated && user?.role === "freelancer" ? (
            <>
              <Link className={navLinkClass} to="/freelancer/applications">
                Applications
              </Link>
              <Link className={navLinkClass} to="/freelancer/contracts">
                Contracts
              </Link>
            </>
          ) : null}

          {isAuthenticated && user?.role === "client" ? (
            <>
              <Link className={navLinkClass} to="/post-project">
                Post Project
              </Link>
              <Link className={navLinkClass} to="/client/manage-projects">
                Manage Projects
              </Link>
              <Link className={navLinkClass} to="/client/contracts">
                Contracts
              </Link>
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          {isAuthenticated ? (
            <Link
              to={profilePath}
              className="inline-flex items-center gap-2 rounded-md border border-[#44556A] bg-[#243447] px-2.5 py-1.5 text-slate-100 transition-colors hover:border-[#4EA8F7] hover:bg-[#2B3D52]"
            >
              {profilePictureUrl ? (
                <img
                  src={profilePictureUrl}
                  alt="Profile"
                  className="h-8 w-8 rounded-full border border-[#44556A] object-cover"
                />
              ) : (
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#4EA8F7] font-semibold text-white">
                  {profileInitial}
                </span>
              )}
              <span className="flex flex-col leading-tight">
                <span className="font-medium text-white">Profile</span>
                {user?.username ? <span className="text-xs text-slate-300">@{user.username}</span> : null}
              </span>
            </Link>
          ) : null}

          {isAuthenticated ? (
            <button
              className="rounded-md border border-[#44556A] bg-[#243447] px-3 py-1.5 font-medium text-slate-100 transition-colors hover:border-[#4EA8F7] hover:bg-[#2B3D52]"
              type="button"
              onClick={logout}
            >
              Logout
            </button>
          ) : null}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
