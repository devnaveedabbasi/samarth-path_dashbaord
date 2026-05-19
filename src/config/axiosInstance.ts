// /lib/axios.js
import { baseUrl } from "@/store/slicer";
import axios from "axios";

const axiosInstance = axios.create({
  baseURL:
    baseUrl ||
    "",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor (NO STORE HERE)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");

      // 🔔 only event dispatch
      window.dispatchEvent(
        new CustomEvent("unauthorized", {
          detail: { redirect: "/auth/login" },
        })
      );
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
