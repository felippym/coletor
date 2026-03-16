"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { UserPlus, Trash2, KeyRound } from "lucide-react";
import { ConfirmDeleteDrawer } from "@/components/ConfirmDeleteDrawer";

interface User {
  id: string;
  username: string;
  created_at: string;
}

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [editPasswordId, setEditPasswordId] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchUsers = async () => {
    setFetchError(null);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (res.ok) {
        setUsers(Array.isArray(data) ? data : []);
      } else {
        setUsers([]);
        setFetchError(data?.error ?? `Erro ${res.status} ao carregar logins`);
      }
    } catch (err) {
      setUsers([]);
      setFetchError("Falha ao conectar. Verifique se SUPABASE_SERVICE_ROLE_KEY está no .env");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    const u = newUsername.trim().toLowerCase();
    const p = newPassword;
    if (!u || !p) {
      setCreateError("Usuário e senha são obrigatórios");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: p }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) => [...prev, data].sort((a, b) => a.username.localeCompare(b.username)));
        setNewUsername("");
        setNewPassword("");
      } else {
        setCreateError(data.error ?? "Erro ao criar usuário");
      }
    } catch {
      setCreateError("Erro ao criar usuário");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } catch {
      // ignore
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleUpdatePassword = async (id: string) => {
    if (!editPassword.trim() || editPassword.length < 4) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: editPassword }),
      });
      if (res.ok) {
        setEditPasswordId(null);
        setEditPassword("");
      }
    } finally {
      setUpdating(false);
    }
  };

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

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--background)]">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-4">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-1 text-[var(--secondary)] transition-colors hover:text-[var(--foreground)]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </Link>
          <h1 className="flex-1 text-center text-lg font-semibold text-[var(--foreground)]">
            Usuários
          </h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="flex-1 p-4">
        <div className="mx-auto max-w-2xl space-y-6">
          <form onSubmit={handleCreate} className="rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] p-4">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <UserPlus className="h-4 w-4" />
              Novo usuário
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1">
                <label htmlFor="new-username" className="block text-xs font-medium text-[var(--muted)]">
                  Usuário
                </label>
                <input
                  id="new-username"
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                  placeholder="ex: vendedor1"
                  className="w-full rounded-lg border-2 border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                  autoComplete="username"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label htmlFor="new-password" className="block text-xs font-medium text-[var(--muted)]">
                  Senha
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mín. 4 caracteres"
                  className="w-full rounded-lg border-2 border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                disabled={creating || !newUsername.trim() || !newPassword}
                className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] disabled:opacity-50"
              >
                {creating ? "Criando…" : "Criar"}
              </button>
            </div>
            {createError && (
              <p className="mt-2 text-sm text-[var(--destructive)]">{createError}</p>
            )}
          </form>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Usuários cadastrados ({users.length})
            </h2>
            {loading ? (
              <p className="text-sm text-[var(--secondary)]">Carregando...</p>
            ) : fetchError ? (
              <div className="rounded-xl border-2 border-[var(--destructive)]/30 bg-[var(--destructive)]/5 p-4">
                <p className="text-sm text-[var(--destructive)]">{fetchError}</p>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  A API de logins usa Supabase. Adicione SUPABASE_SERVICE_ROLE_KEY no .env.local. Rode:{" "}
                  <code className="rounded bg-[var(--surface)] px-1">npm run config:service-role</code>
                  {" "}ou copie a chave em{" "}
                  <a
                    href="https://supabase.com/dashboard/project/jkgrxdscxznnbsodllmd/settings/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent)] underline"
                  >
                    Supabase → Settings → API
                  </a>
                  .
                </p>
                <button
                  onClick={() => { setLoading(true); fetchUsers(); }}
                  className="mt-3 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm"
                >
                  Tentar novamente
                </button>
              </div>
            ) : users.length === 0 ? (
              <p className="rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--secondary)]">
                Nenhum login. Crie um acima.
              </p>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-[var(--foreground)]">{u.username}</span>
                      {u.username === "admin" && (
                        <span className="ml-2 text-xs text-[var(--muted)]">(admin)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {editPasswordId === u.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="password"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            placeholder="Nova senha"
                            className="w-32 rounded-lg border-2 border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdatePassword(u.id)}
                            disabled={updating || editPassword.length < 4}
                            className="rounded-lg bg-[var(--accent)] px-2 py-1.5 text-xs font-medium text-[var(--primary-foreground)] disabled:opacity-50"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => {
                              setEditPasswordId(null);
                              setEditPassword("");
                            }}
                            className="rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditPasswordId(u.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-hover)]"
                          aria-label="Alterar senha"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                      )}
                      {u.username !== "admin" && (
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--destructive)]/10 text-[var(--destructive)] hover:bg-[var(--destructive)]/20"
                          aria-label="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <ConfirmDeleteDrawer
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir usuário?"
        message={deleteTarget ? `O usuário "${deleteTarget.username}" será excluído. Não será possível fazer login com ele.` : undefined}
      />
    </div>
  );
}
