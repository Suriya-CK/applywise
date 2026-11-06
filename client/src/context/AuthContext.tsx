/**
 * AuthContext - shares "who is logged in" with every component.
 *
 * Without Context we would have to pass `user` as a prop through every level of
 * the component tree ("prop drilling"). A Provider wraps the app once, and any
 * component can read the value with the useAuth() hook.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, tokenStore } from "../api/client";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  loading: boolean; // true while we check a saved token on page load
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => tokenStore.get() !== null);

  // useEffect runs after the first render. Here: if a token was saved from an
  // earlier visit, ask the API who it belongs to. [] = run only once.
  useEffect(() => {
    if (!tokenStore.get()) return;
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => tokenStore.clear()) // token expired or invalid
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const { user, token } = await api.login(email, password);
    tokenStore.set(token);
    setUser(user);
  }

  async function register(name: string, email: string, password: string) {
    const { user, token } = await api.register(name, email, password);
    tokenStore.set(token);
    setUser(user);
  }

  function logout() {
    tokenStore.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

// A custom hook: components call useAuth() instead of useContext(AuthContext).
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
