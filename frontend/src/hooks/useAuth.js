import { useState, useEffect } from "react";
import { setToken, fetchMe, logout as apiLogout } from "../api/spotify";

/**
 * Returns { user, loading, isDemo, login, logout }
 * Token flow: Django callback → redirect to /#token=ACCESS_TOKEN
 * Frontend reads hash, stores token in memory, sends as Authorization header.
 */
export default function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check URL hash for token coming back from OAuth
    const hash = window.location.hash;
    if (hash.startsWith("#token=")) {
      const token = hash.slice(7);
      setToken(token);
      sessionStorage.setItem("sp_token", token);
      window.history.replaceState({}, "", window.location.pathname);
    } else {
      // 2. Restore token from sessionStorage on page reload
      const stored = sessionStorage.getItem("sp_token");
      if (stored) setToken(stored);
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
    sessionStorage.removeItem("sp_token");
    setToken(null);
    setUser(null);
  };

  return { user, loading, isDemo: !user, login, logout };
}
