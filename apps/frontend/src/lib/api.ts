import axios, { type InternalAxiosRequestConfig } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("uptimeToken");
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
  }
  return config;
});

export default api;
