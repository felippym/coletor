"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LoginOverlay } from "./LoginOverlay";

const SESSION_KEY = "inventory_session_user";
const SESSION_KEY_USER_ID = "inventory_session_user_id";
const SESSION_KEY_LOJA_ID = "inventory_session_loja_id";
const SESSION_KEY_LOJA_NAME = "inventory_session_loja_name";

/** Fallback quando login via auth-hashes (sem Supabase) - mapeamento usuário -> loja */
const USERNAME_TO_LOJA: Record<string, string> = {
  kelly: "Leblon",
  joana: "Ipanema",
  leblon: "Leblon",
  ipanema: "Ipanema",
};

type AuthContextValue = {
  user: string | null;
  userId: string | null;
  lojaId: string | null;
  /** Nome da loja (ex: "Leblon") - para exibição na tela */
  lojaName: string | null;
  isAdmin: boolean;
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
  const [userId, setUserId] = useState<string | null>(null);
  const [lojaId, setLojaId] = useState<string | null>(null);
  const [lojaName, setLojaName] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    try {
      setUser(sessionStorage.getItem(SESSION_KEY));
      setUserId(sessionStorage.getItem(SESSION_KEY_USER_ID));
      setLojaId(sessionStorage.getItem(SESSION_KEY_LOJA_ID));
      setLojaName(sessionStorage.getItem(SESSION_KEY_LOJA_NAME));
    } catch {
      setUser(null);
      setUserId(null);
      setLojaId(null);
      setLojaName(null);
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
      if (data.userId) sessionStorage.setItem(SESSION_KEY_USER_ID, data.userId);
      else sessionStorage.removeItem(SESSION_KEY_USER_ID);
      if (data.lojaId) sessionStorage.setItem(SESSION_KEY_LOJA_ID, data.lojaId);
      else sessionStorage.removeItem(SESSION_KEY_LOJA_ID);
      const name = data.lojaName ?? USERNAME_TO_LOJA[data.user?.toLowerCase()] ?? null;
      if (name) sessionStorage.setItem(SESSION_KEY_LOJA_NAME, name);
      else sessionStorage.removeItem(SESSION_KEY_LOJA_NAME);
      setUser(data.user);
      setUserId(data.userId ?? null);
      setLojaId(data.lojaId ?? null);
      setLojaName(name);
      router.push("/");
      return true;
    }
    return false;
  }, [router]);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY_USER_ID);
    sessionStorage.removeItem(SESSION_KEY_LOJA_ID);
    sessionStorage.removeItem(SESSION_KEY_LOJA_NAME);
    setUser(null);
    setUserId(null);
    setLojaId(null);
    setLojaName(null);
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  const effectiveLojaName = lojaName ?? (user ? USERNAME_TO_LOJA[user.toLowerCase()] ?? null : null);
  return (
    <AuthContext.Provider value={{ user, userId, lojaId, lojaName: effectiveLojaName, isAdmin: user === "admin", logout }}>
      {children}
      {!user && <LoginOverlay onLogin={handleLogin} />}
    </AuthContext.Provider>
  );
}
