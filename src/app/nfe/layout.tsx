"use client";

import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

export default function NFeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  if (user !== "admin") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center p-4">
        <p className="text-[var(--destructive)]">Acesso negado. Apenas admin.</p>
        <Link href="/" className="mt-4 text-[var(--accent)] hover:underline">
          Voltar
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
