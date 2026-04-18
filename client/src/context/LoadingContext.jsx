import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { registerApiLoadingHandlers } from "../lib/api.js";

const LoadingContext = createContext(null);

export function LoadingProvider({ children }) {
  const [activeRequests, setActiveRequests] = useState(0);

  useEffect(() => {
    registerApiLoadingHandlers(
      () => setActiveRequests((prev) => prev + 1),
      () => setActiveRequests((prev) => Math.max(0, prev - 1))
    );
  }, []);

  const value = useMemo(
    () => ({
      isLoading: activeRequests > 0,
      activeRequests,
    }),
    [activeRequests]
  );

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
}

export function useLoading() {
  const context = useContext(LoadingContext);

  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }

  return context;
}
