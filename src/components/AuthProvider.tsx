"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LoginOverlay } from "./LoginOverlay";

const SESSION_KEY = "inventory_session_user";

type AuthContextValue = {
  user: string | null;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      setUser(stored);
    } catch {
      setUser(null);
    } finally {
      setChecking(false);
    }
  }, []);

  const handleLogin = useCallback(async (username: string, password: string): Promise<boolean> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), password }),
    });
    const data = await res.json();
    if (data.ok && data.user) {
      sessionStorage.setItem(SESSION_KEY, data.user);
      setUser(data.user);
      router.push("/");
      return true;
    }
    return false;
  }, [router]);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, logout }}>
      {children}
      {!user && <LoginOverlay onLogin={handleLogin} />}
    </AuthContext.Provider>
  );
}
