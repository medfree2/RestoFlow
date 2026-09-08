import { API_BASE_URL } from "../config/api";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const AuthContext = createContext(null);

const API_URL = `${API_BASE_URL}/api`;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    localStorage.getItem("token") || ""
  );
  const [loading, setLoading] = useState(true);

  // =====================================================
  // CHECK CURRENT SESSION
  // =====================================================

  useEffect(() => {
    const checkAuth = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Session invalide");
        }

        const data = await response.json();

        setUser(data.user);
      } catch (error) {
        console.error(error);

        localStorage.removeItem("token");

        setToken("");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [token]);

  // =====================================================
  // LOGIN
  // =====================================================

  const login = async (email, password) => {
    const response = await fetch(
      `${API_URL}/auth/login`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Connexion impossible"
      );
    }

    localStorage.setItem(
      "token",
      data.token
    );

    setToken(data.token);
    setUser(data.user);

    return data;
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = () => {
    localStorage.removeItem("token");

    setToken("");
    setUser(null);
  };

  // =====================================================
  // AUTHORIZED FETCH
  // =====================================================

  const authFetch = async (
    url,
    options = {}
  ) => {
    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  };

  // =====================================================
  // VALUE
  // =====================================================

  const value = {
    user,
    token,
    loading,

    isAuthenticated: Boolean(
      user && token
    ),

    login,
    logout,
    authFetch,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth doit être utilisé dans AuthProvider"
    );
  }

  return context;
}