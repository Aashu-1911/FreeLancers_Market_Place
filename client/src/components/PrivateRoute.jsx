import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function PrivateRoute({ allowedRoles = [] }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    const fallbackPath = user?.role === "client" ? "/client/profile" : "/freelancer/profile";
    return <Navigate to={fallbackPath} replace />;
  }

  return <Outlet />;
}

export default PrivateRoute;
