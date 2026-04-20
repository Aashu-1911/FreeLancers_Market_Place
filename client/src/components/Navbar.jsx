import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../lib/api.js";
import skillHireLogo from "../assets/skillhire-logo.svg";

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
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
  const profilePath = user?.role === "client" ? "/client/profile" : "/freelancer/profile";
  const dashboardPath = user?.role === "client" ? "/dashboard/client" : "/dashboard/freelancer";
  const profilePictureUrl = toPublicFileUrl(user?.profile_picture, user?.profile_picture_version);
  const profileInitial = String(user?.username || user?.first_name || "U").charAt(0).toUpperCase();
  const navLinkClass = "transition-colors hover:text-[#4EA8F7]";

  const fetchNotifications = async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setIsNotificationsLoading(true);
      const response = await api.get("/api/notifications");
      setNotifications(response.data?.items || []);
      setUnreadCount(response.data?.unread_count || 0);
    } catch (_error) {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsNotificationsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    let isCurrent = true;

    const loadNotifications = async () => {
      if (!isCurrent) {
        return;
      }

      await fetchNotifications();
    };

    loadNotifications();
    const intervalId = setInterval(loadNotifications, 30000);

    return () => {
      isCurrent = false;
      clearInterval(intervalId);
    };
  }, [isAuthenticated, user?.user_id]);

  const limitedNotifications = useMemo(() => notifications.slice(0, 6), [notifications]);

  return (
    <header className="border-b border-[#2B3A4C] bg-[#1E2A3A] text-slate-100 shadow-sm">
      <nav className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div className="flex items-center gap-2.5">
          <img src={skillHireLogo} alt="SkillHire logo" className="h-9 w-9" />
          <h1 className="text-xl font-semibold tracking-wide text-white">SkillHire</h1>
        </div>

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
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotificationsOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-md border border-[#44556A] bg-[#243447] px-3 py-1.5 font-medium text-slate-100 transition-colors hover:border-[#4EA8F7] hover:bg-[#2B3D52]"
              >
                Notifications
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#4EA8F7] px-1.5 text-xs font-semibold text-white">
                  {Math.min(unreadCount, 99)}
                </span>
              </button>

              {isNotificationsOpen ? (
                <div className="absolute right-0 z-30 mt-2 w-80 rounded-lg border border-[#44556A] bg-[#243447] p-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">Recent Notifications</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsNotificationsOpen(false);
                      }}
                      className="text-xs text-slate-300 hover:text-white"
                    >
                      Close
                    </button>
                  </div>

                  {isNotificationsLoading ? <p className="mt-3 text-xs text-slate-300">Loading...</p> : null}

                  {!isNotificationsLoading ? (
                    <ul className="mt-3 space-y-2">
                      {limitedNotifications.map((item) => (
                        <li key={item.id} className="rounded-md border border-[#44556A] bg-[#2B3D52] p-2.5">
                          <p className="text-xs font-semibold uppercase text-[#4EA8F7]">{item.title}</p>
                          <p className="mt-1 text-xs text-slate-200">{item.message}</p>
                          <p className="mt-1 text-[11px] text-slate-400">{new Date(item.created_at).toLocaleString()}</p>
                        </li>
                      ))}

                      {limitedNotifications.length === 0 ? (
                        <li className="rounded-md border border-[#44556A] bg-[#2B3D52] p-2.5 text-xs text-slate-300">
                          No notifications right now.
                        </li>
                      ) : null}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

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
