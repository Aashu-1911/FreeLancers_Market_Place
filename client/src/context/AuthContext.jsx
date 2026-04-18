import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

function decodeToken(token) {
  if (!token) {
    return null;
  }

  try {
    const payloadPart = token.split(".")[1];

    if (!payloadPart) {
      return null;
    }

    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded));

    return {
      user_id: payload.user_id,
      role: payload.role,
      exp: payload.exp,
      first_name: null,
      last_name: null,
      email: null,
    };
  } catch (_error) {
    return null;
  }
}

function mergeTokenAndUser(token, userData) {
  const tokenData = decodeToken(token);

  if (!tokenData) {
    return null;
  }

  return {
    ...tokenData,
    first_name: userData?.first_name || tokenData.first_name,
    last_name: userData?.last_name || tokenData.last_name,
    email: userData?.email || tokenData.email,
  };
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const existingToken = localStorage.getItem("token");
    const savedUserRaw = localStorage.getItem("auth_user");
    let savedUser = null;

    try {
      savedUser = savedUserRaw ? JSON.parse(savedUserRaw) : null;
    } catch (_error) {
      savedUser = null;
    }

    return mergeTokenAndUser(existingToken, savedUser);
  });

  const login = (newToken, userData = null) => {
    localStorage.setItem("token", newToken);
    if (userData) {
      localStorage.setItem("auth_user", JSON.stringify(userData));
    }
    setToken(newToken);
    setUser(mergeTokenAndUser(newToken, userData));
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("auth_user");
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
