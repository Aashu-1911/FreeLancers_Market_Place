import axios from "axios";

let onRequestStarted = () => {};
let onRequestFinished = () => {};

export function registerApiLoadingHandlers(startHandler, finishHandler) {
  onRequestStarted = typeof startHandler === "function" ? startHandler : () => {};
  onRequestFinished = typeof finishHandler === "function" ? finishHandler : () => {};
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
});

api.interceptors.request.use((config) => {
  onRequestStarted();

  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}, (error) => {
  onRequestFinished();
  return Promise.reject(error);
});

api.interceptors.response.use((response) => {
  onRequestFinished();
  return response;
}, (error) => {
  onRequestFinished();
  return Promise.reject(error);
});

export default api;
