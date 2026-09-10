import axios from "axios";

// One shared Axios instance for the whole app.
//
// WHY centralize this instead of calling axios.get() everywhere?
// - `withCredentials: true` is required so the browser sends our
//   HTTP-only JWT cookie with every request once auth exists (Phase 3).
//   Forgetting this on even one call would silently break auth.
// - If the API base URL ever changes (e.g. deploying), we change it here once.
// - We can attach shared interceptors later (e.g. redirect to /login on 401).
export const api = axios.create({
  baseURL: "/api", // proxied to http://localhost:5000/api in dev (see vite.config.js)
  withCredentials: true,
});
