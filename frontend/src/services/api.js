import axios from "axios";

// One shared Axios instance for the whole app.
// withCredentials: true is required so the browser sends our
// HTTP-only JWT cookie with every request (set up on the backend
// back in Phase 3) — forgetting this on even one call would silently
// break auth for that call.
export const api = axios.create({
  baseURL: "/api", // proxied to http://localhost:5000/api in dev (see vite.config.js)
  withCredentials: true,
});

// WHAT: a tiny pub/sub so AuthContext can react to a 401 from ANY
// request, not just the ones it made itself.
// WHY this needs to exist: if a user's session expires (or they get
// suspended mid-session — see Phase 15) while they're, say, fetching
// a project's task list, that 401 doesn't go through AuthContext's
// own login/logout functions at all. Without this, the app would
// keep rendering as if they were still logged in until they happened
// to refresh the page.
const unauthorizedListeners = new Set();

export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      unauthorizedListeners.forEach((listener) => listener());
    }
    return Promise.reject(error);
  }
);
