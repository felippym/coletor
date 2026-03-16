"use client";

import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { ThemeSwitch } from "@/components/ThemeSwitch";

export function TopRightActions() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isHome = pathname === "/";

  return (
    <div className="fixed right-4 top-[calc(1rem+env(safe-area-inset-top))] z-40 flex items-center gap-2">
      {isHome && user && (
        <span className="text-sm font-medium text-[var(--foreground)]">
          {user}
        </span>
      )}
      {isHome && (
        <button
          onClick={logout}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition-all duration-200 hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
          aria-label="Sair"
        >
          <LogOut className="h-5 w-5" />
        </button>
      )}
      <ThemeSwitch embedded />
    </div>
  );
}
