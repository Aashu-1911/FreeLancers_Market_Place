import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <h1 className="text-xl font-semibold">SkillHire</h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium">
          <Link className="hover:text-blue-600" to="/home">
            Home
          </Link>
          <Link className="hover:text-blue-600" to="/projects">
            Projects
          </Link>

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
              <Link className="hover:text-blue-600" to="/freelancer/profile">
                Profile
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
              <Link className="hover:text-blue-600" to="/client/profile">
                Profile
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
            <p className="text-slate-600">
              {user?.username ? `@${user.username}` : "@user"}
              {user?.first_name ? ` · ${`${user.first_name} ${user.last_name || ""}`.trim()}` : ""}
            </p>
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
