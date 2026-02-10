"use client";

/**
 * ─────────────────────────────────────────────────────────────
 *  GUIDED — Authentication Context
 * ─────────────────────────────────────────────────────────────
 *  Provides login, signup, and logout actions to every component
 *  via React Context.  The JWT token is persisted in localStorage
 *  and validated against the backend on every page load so the
 *  user stays signed in across refreshes.
 * ─────────────────────────────────────────────────────────────
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";


/* ════════════════════════════════════════════════════════════
 *  TYPE DEFINITIONS
 * ════════════════════════════════════════════════════════════ */

/** The shape of the authenticated user returned by the backend. */
export interface User {
  id: string;
  email: string;
  name: string;
  role: "candidate" | "mentor" | "admin";
  verified: boolean;
}

/** Everything the AuthContext exposes to consumers. */
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
}

/** Fields collected on the signup form. */
interface SignupData {
  email: string;
  password: string;
  name: string;
  role: string;
  linkedinUrl?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Backend base URL — must match the API server. */
const API_BASE = "http://localhost:8000";


/* ════════════════════════════════════════════════════════════
 *  AUTH PROVIDER
 * ════════════════════════════════════════════════════════════ */

/**
 * Wrap your app in `<AuthProvider>` so that any child component
 * can call `useAuth()` to access login / signup / logout actions
 * and the current user / token.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /* ── Restore session from localStorage on first mount ── */
  useEffect(() => {
    const stored = localStorage.getItem("guided_token");

    if (stored) {
      setToken(stored);

      // Validate the stored token against the backend
      fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${stored}` },
      })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => {
          setUser(data as User);
          setIsLoading(false);
        })
        .catch(() => {
          // Token expired or invalid — clear everything
          localStorage.removeItem("guided_token");
          setToken(null);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  /* ── Login with email + password ── */
  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.detail || "Login failed" };
      }

      // Persist the token and update state
      localStorage.setItem("guided_token", data.token);
      setToken(data.token);
      setUser(data.user as User);
      return { success: true, user: data.user as User };
    } catch {
      return { success: false, error: "Cannot connect to server" };
    }
  }, []);

  /* ── Create a new account ── */
  const signup = useCallback(async (signupData: SignupData) => {
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signupData.email,
          password: signupData.password,
          name: signupData.name,
          role: signupData.role,
          linkedin_url: signupData.linkedinUrl || "",
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.detail || "Signup failed" };
      }

      // Persist the token and update state
      localStorage.setItem("guided_token", data.token);
      setToken(data.token);
      setUser(data.user as User);
      return { success: true, user: data.user as User };
    } catch {
      return { success: false, error: "Cannot connect to server" };
    }
  }, []);

  /* ── Sign out and wipe all stored session data ── */
  const logout = useCallback(() => {
    localStorage.removeItem("guided_token");
    localStorage.removeItem("candidateId");
    localStorage.removeItem("onboardingData");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}


/* ════════════════════════════════════════════════════════════
 *  CONSUMER HOOK
 * ════════════════════════════════════════════════════════════ */

/**
 * Access the current authentication state from any component.
 * Must be called inside an `<AuthProvider>`.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
