import { useState, useEffect } from "react";
import { setToken, fetchMe, logout as apiLogout } from "../api/spotify";

/**
 * Returns { user, loading, isDemo, login, logout }
 * Token flow: Django callback → redirect to /#token=ACCESS_TOKEN
 * Frontend reads hash, stores token in memory only (never persisted).
 */
export default function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#token=")) {
      const token = hash.slice(7);
      setToken(token);
      window.history.replaceState({}, "", window.location.pathname);
    }

    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = () => {
    window.location.href = "http://127.0.0.1:8000/api/auth/login/";
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return { user, loading, isDemo: !user, login, logout };
}
