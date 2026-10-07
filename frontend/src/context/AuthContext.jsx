import { createContext, useState, useEffect, useCallback } from "react";
import { api, onUnauthorized } from "../services/api.js";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // WHY a separate "checking session" flag from "user is null": on
  // first load we don't yet know if the HTTP-only cookie from a
  // previous visit is still valid. Treating "unknown" the same as
  // "logged out" would flash a login screen for an instant even for
  // someone who's actually still signed in.
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data.data);
    } catch {
      setUser(null);
    } finally {
      setIsCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Any 401 from anywhere in the app (not just auth calls — see
  // api.js) means the session is no longer valid. Reacting to it here
  // keeps the UI's idea of "who's logged in" honest everywhere.
  useEffect(() => {
    return onUnauthorized(() => setUser(null));
  }, []);

  const register = useCallback(async (payload) => {
    const res = await api.post("/auth/register", payload);
    setUser(res.data.data);
    return res.data.data;
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    setUser(res.data.data);
    return res.data.data;
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setUser(null);
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isCheckingSession,
    register,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
