"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Users, FileText, List, Package } from "lucide-react";
import { StartInventoryDrawer } from "@/components/StartInventoryDrawer";
import { useAuth } from "@/components/AuthProvider";

const actionButtons = [
  {
    id: "iniciar",
    label: "Iniciar Inventário",
    href: null,
    onClick: true,
    icon: Plus,
  },
  {
    id: "usuarios",
    label: "Usuários",
    href: "/users",
    icon: Users,
    adminOnly: true,
  },
  {
    id: "nfe",
    label: "Conferir NFe",
    href: "/nfe",
    icon: FileText,
  },
  {
    id: "conferencias",
    label: "Ver Conferências",
    href: "/nfe/conferences",
    icon: List,
  },
  {
    id: "inventarios",
    label: "Ver Inventários",
    href: "/inventories",
    icon: Package,
  },
];

export default function Home() {
  const [showDrawer, setShowDrawer] = useState(false);
  const { user, logout } = useAuth();

  const visibleButtons = actionButtons.filter(
    (b) => !b.adminOnly || user === "admin"
  );

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[var(--background)]">
      {/* Padrão sutil de fundo */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0 Q45 15 30 30 Q15 45 30 60' stroke='%23ff9900' fill='none' stroke-width='0.5'/%3E%3Cpath d='M0 30 Q15 45 30 30 Q45 15 60 30' stroke='%23ff9900' fill='none' stroke-width='0.5'/%3E%3C/svg%3E")`,
        }}
      />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pt-[calc(4rem+env(safe-area-inset-top))] pb-2">
        {/* Seção perfil / logo */}
        <div className="mb-6 flex flex-col items-center gap-4">
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--primary)] bg-[var(--surface)] p-3">
            <img
              src="/logo.png"
              alt="Cutelaria do ISAÍAS"
              className="logo h-full w-full object-contain"
            />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
              Inventário de Loja
            </h1>
          </div>
        </div>

        {/* Grid de ações */}
        <div className="grid w-full max-w-sm grid-cols-2 gap-3">
          {visibleButtons.map((btn) => {
            const Icon = btn.icon;
            const content = (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)] p-6 transition-all duration-200 hover:border-[var(--border)] hover:bg-[var(--surface-hover)] active:scale-[0.98]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-hover)] text-[var(--primary)]">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-center text-sm font-medium text-[var(--foreground)]">
                  {btn.label}
                </span>
              </div>
            );

            if (btn.onClick && btn.id === "iniciar") {
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setShowDrawer(true)}
                  className="text-left"
                >
                  {content}
                </button>
              );
            }

            return (
              <Link key={btn.id} href={btn.href!} className="block">
                {content}
              </Link>
            );
          })}
        </div>
      </main>

      <footer className="relative z-10 flex shrink-0 flex-col items-center gap-1 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-center text-xs text-[var(--muted)]">
        desenvolvido por Felippy 🚀
      </footer>

      <StartInventoryDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
      />
    </div>
  );
}
