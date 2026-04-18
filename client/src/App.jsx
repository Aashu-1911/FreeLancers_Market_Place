import { Link, Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home.jsx";
import NotFound from "./pages/NotFound.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import FreelancerProfilePage from "./pages/FreelancerProfilePage.jsx";
import ClientProfilePage from "./pages/ClientProfilePage.jsx";
import ProjectListPage from "./pages/ProjectListPage.jsx";
import ProjectDetailPage from "./pages/ProjectDetailPage.jsx";
import PostProjectPage from "./pages/PostProjectPage.jsx";
import ManageProjectsPage from "./pages/ManageProjectsPage.jsx";
import MyApplicationsPage from "./pages/MyApplicationsPage.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";
import { useAuth } from "./context/AuthContext.jsx";

function App() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-semibold">SkillHire</h1>
          <div className="flex items-center gap-4 text-sm font-medium">
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
                <Link className="hover:text-blue-600" to="/freelancer/profile">
                  My Profile
                </Link>
                <Link className="hover:text-blue-600" to="/freelancer/applications">
                  My Applications
                </Link>
              </>
            ) : null}
            {isAuthenticated && user?.role === "client" ? (
              <>
                <Link className="hover:text-blue-600" to="/client/profile">
                  My Profile
                </Link>
                <Link className="hover:text-blue-600" to="/projects/post">
                  Post Project
                </Link>
                <Link className="hover:text-blue-600" to="/client/manage-projects">
                  Manage Projects
                </Link>
              </>
            ) : null}
            {isAuthenticated ? (
              <button className="hover:text-blue-600" type="button" onClick={logout}>
                Logout
              </button>
            ) : null}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/projects" element={<ProjectListPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route element={<PrivateRoute allowedRoles={["freelancer"]} />}>
            <Route path="/freelancer/profile" element={<FreelancerProfilePage />} />
            <Route path="/freelancer/applications" element={<MyApplicationsPage />} />
          </Route>

          <Route element={<PrivateRoute allowedRoles={["client"]} />}>
            <Route path="/client/profile" element={<ClientProfilePage />} />
            <Route path="/projects/post" element={<PostProjectPage />} />
            <Route path="/client/manage-projects" element={<ManageProjectsPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
