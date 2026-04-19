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
  const profilePictureUrl = toPublicFileUrl(user?.profile_picture, user?.profile_picture_version);
  const profileInitial = String(user?.username || user?.first_name || "U").charAt(0).toUpperCase();

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <h1 className="text-xl font-semibold">SkillHire</h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium">
          <Link className="hover:text-blue-600" to="/home">
            Home
          </Link>
          {user?.role !== "client" ? (
            <Link className="hover:text-blue-600" to="/projects">
              Projects
            </Link>
          ) : null}

          {!isAuthenticated ? (
            <>
              <Link className="hover:text-blue-600" to="/register">
                Register
              </Link>
              <Link className="hover:text-blue-600" to="/login">
                Login
              </Link>
            </>
          ) : null}

          {isAuthenticated && user?.role === "freelancer" ? (
            <>
              <Link className="hover:text-blue-600" to="/dashboard/freelancer">
                Dashboard
              </Link>
              <Link className="hover:text-blue-600" to="/freelancer/applications">
                Applications
              </Link>
              <Link className="hover:text-blue-600" to="/freelancer/contracts">
                Contracts
              </Link>
            </>
          ) : null}

          {isAuthenticated && user?.role === "client" ? (
            <>
              <Link className="hover:text-blue-600" to="/dashboard/client">
                Dashboard
              </Link>
              <Link className="hover:text-blue-600" to="/post-project">
                Post Project
              </Link>
              <Link className="hover:text-blue-600" to="/client/manage-projects">
                Manage Projects
              </Link>
              <Link className="hover:text-blue-600" to="/client/contracts">
                Contracts
              </Link>
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          {isAuthenticated ? (
            <Link
              to={profilePath}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-slate-700 hover:bg-slate-50"
            >
              {profilePictureUrl ? (
                <img
                  src={profilePictureUrl}
                  alt="Profile"
                  className="h-8 w-8 rounded-full border border-slate-200 object-cover"
                />
              ) : (
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-700">
                  {profileInitial}
                </span>
              )}
              <span className="flex flex-col leading-tight">
                <span className="font-medium text-slate-800">Profile</span>
                {user?.username ? <span className="text-xs text-slate-500">@{user.username}</span> : null}
              </span>
            </Link>
          ) : null}

          {isAuthenticated ? (
            <button
              className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
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
