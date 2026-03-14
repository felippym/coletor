"use client";

import { Store, LogOut } from "lucide-react";
import { useAuth } from "./AuthProvider";

interface UserLojaHeaderProps {
  /** Se false, não exibe o botão Sair (ex: quando fica no rodapé) */
  showSairButton?: boolean;
}

export function UserLojaHeader({ showSairButton = true }: UserLojaHeaderProps) {
  const { user, lojaName, isAdmin, logout } = useAuth();

  if (!user) return null;

  const displayLoja = lojaName || (isAdmin ? "Administrador" : null);

  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3">
      <div className="flex flex-wrap items-stretch gap-3 justify-start">
        {/* Painel Loja */}
        <div className="flex min-w-0 max-w-[180px] flex-1 items-center gap-2 rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/20 text-[var(--accent)]">
            <Store className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-[var(--foreground)]">
              {displayLoja || "—"}
            </p>
          </div>
        </div>

        {/* Painel Usuário */}
        <div className="flex min-w-0 max-w-[180px] flex-1 items-center gap-2 rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
          <div className="min-w-0 flex-1">
            <p className="truncate capitalize text-base font-semibold text-[var(--foreground)]">
              {user}
            </p>
          </div>
        </div>
      </div>

      {showSairButton && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 rounded-[20px] bg-[var(--destructive)] px-[20px] py-[20px] text-sm font-semibold text-white transition-all hover:bg-[var(--destructive-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--destructive)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}

/** Botão Sair para usar no rodapé (ex: acima de "desenvolvido por Felippy") */
export function SairButton() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <button
      type="button"
      onClick={logout}
      className="flex items-center gap-2 rounded-[20px] bg-[var(--destructive)] px-[20px] py-[20px] text-sm font-semibold text-white transition-all hover:bg-[var(--destructive-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--destructive)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
    >
      <LogOut className="h-4 w-4" />
      Sair
    </button>
  );
}
