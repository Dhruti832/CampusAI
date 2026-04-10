import axios from "axios";
import Cookies from "js-cookie";

const api = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove("access_token");
      window.location.href = "/auth/login";
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const login = (email: string, password: string) =>
  api.post("/auth/login", { email, password });
export const register = (data: {
  email: string;
  password: string;
  full_name: string;
  university_id?: string;
}) => api.post("/auth/register", data);
export const getMe = () => api.get("/auth/me");

// Universities
export const getUniversities = () => api.get("/universities/");
export const getUniversity = (slug: string) => api.get(`/universities/${slug}`);
export const createUniversity = (data: object) =>
  api.post("/universities/", data);
export const updateUniversity = (slug: string, data: object) =>
  api.patch(`/universities/${slug}`, data);
export const deleteUniversity = (slug: string) =>
  api.delete(`/universities/${slug}`);

// Users
export const getUsers = (params?: object) => api.get("/users/", { params });
export const createUser = (data: object) => api.post("/users/", data);
export const updateUser = (id: string, data: object) =>
  api.patch(`/users/${id}`, data);
export const deleteUser = (id: string) => api.delete(`/users/${id}`);

// Documents
export const getDocuments = (params?: object) =>
  api.get("/documents/", { params });
export const deleteDocument = (id: string) => api.delete(`/documents/${id}`);

// Scrape jobs
export const getScrapeJobs = (params?: object) =>
  api.get("/scrape-jobs/", { params });
export const triggerScrape = (university_id: string) =>
  api.post("/scrape-jobs/", { university_id });
export const getScrapeJob = (id: string) => api.get(`/scrape-jobs/${id}`);

// Chat
export const sendMessage = (data: {
  university_slug: string;
  message: string;
  session_id?: string;
}) => api.post("/chat/", data);
