import { useEffect, useState } from "react";
import { login as apiLogin, logout as apiLogout, me } from "../api/auth";

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    me()
      .then((r) => setUser(r.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const r = await apiLogin(username, password);
    setUser(r.data.user);
    return r.data.user;
  };

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  };

  return { user, loading, login, logout };
}