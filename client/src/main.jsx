import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { LoadingProvider } from "./context/LoadingContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LoadingProvider>
      <AuthProvider>
        <BrowserRouter>
          <App />
          <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
        </BrowserRouter>
      </AuthProvider>
    </LoadingProvider>
  </StrictMode>
);
