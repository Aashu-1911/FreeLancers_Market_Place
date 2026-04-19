import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
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
import ContractPage from "./pages/ContractPage.jsx";
import FreelancerContractsPage from "./pages/FreelancerContractsPage.jsx";
import ClientContractsPage from "./pages/ClientContractsPage.jsx";
import FreelancerDashboard from "./pages/FreelancerDashboard.jsx";
import ClientDashboard from "./pages/ClientDashboard.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";
import Navbar from "./components/Navbar.jsx";
import LoadingSpinner from "./components/LoadingSpinner.jsx";
import { useAuth } from "./context/AuthContext.jsx";

function App() {
  const { isAuthenticated, user } = useAuth();

  const authenticatedHomePath = user?.role === "client" ? "/dashboard/client" : "/dashboard/freelancer";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <LoadingSpinner />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
        <Routes>
          <Route path="/" element={<Navigate to={isAuthenticated ? authenticatedHomePath : "/home"} replace />} />
          <Route path="/home" element={isAuthenticated ? <Navigate to={authenticatedHomePath} replace /> : <HomePage />} />
          <Route
            path="/projects"
            element={isAuthenticated && user?.role === "client" ? <Navigate to="/dashboard/client" replace /> : <ProjectListPage />}
          />
          <Route
            path="/projects/:id"
            element={isAuthenticated && user?.role === "client" ? <Navigate to="/dashboard/client" replace /> : <ProjectDetailPage />}
          />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route element={<PrivateRoute allowedRoles={["freelancer"]} />}>
            <Route path="/dashboard/freelancer" element={<FreelancerDashboard />} />
            <Route path="/freelancer/profile" element={<FreelancerProfilePage />} />
            <Route path="/freelancer/applications" element={<MyApplicationsPage />} />
            <Route path="/freelancer/contracts" element={<FreelancerContractsPage />} />
          </Route>

          <Route element={<PrivateRoute allowedRoles={["client"]} />}>
            <Route path="/dashboard/client" element={<ClientDashboard />} />
            <Route path="/client/profile" element={<ClientProfilePage />} />
            <Route path="/post-project" element={<PostProjectPage />} />
            <Route path="/projects/post" element={<PostProjectPage />} />
            <Route path="/client/manage-projects" element={<ManageProjectsPage />} />
            <Route path="/client/contracts" element={<ClientContractsPage />} />
          </Route>

          <Route element={<PrivateRoute allowedRoles={["freelancer", "client"]} />}>
            <Route path="/contracts/:id" element={<ContractPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
