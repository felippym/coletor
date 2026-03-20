"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  addFuncionario,
  loadFuncionarioRows,
  removeFuncionario,
  updateFuncionarioResponsavel,
  type FuncionarioRow,
} from "@/lib/funcionarios";
import { UserPlus, Trash2, KeyRound, Users, Plus } from "lucide-react";
import { ConfirmDeleteDrawer } from "@/components/ConfirmDeleteDrawer";
import { SkeletonUserList } from "@/components/Skeleton";

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

  const [funcionarios, setFuncionarios] = useState<FuncionarioRow[]>([]);
  const [funcionariosLoading, setFuncionariosLoading] = useState(true);
  const [novoFuncionario, setNovoFuncionario] = useState("");
  const [funcionarioResponsavel, setFuncionarioResponsavel] = useState("");
  const [funcionarioError, setFuncionarioError] = useState<string | null>(null);
  const [funcionarioUpdatingId, setFuncionarioUpdatingId] = useState<string | null>(null);

  const refreshFuncionarios = useCallback(async () => {
    setFuncionariosLoading(true);
    try {
      setFuncionarios(await loadFuncionarioRows(user ?? null));
    } finally {
      setFuncionariosLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshFuncionarios();
  }, [refreshFuncionarios]);

  useEffect(() => {
    if (!loading && users.length > 0 && !funcionarioResponsavel) {
      const preferred = users.find((u) => u.username !== "admin") ?? users[0];
      setFuncionarioResponsavel(preferred.username);
    }
  }, [loading, users, funcionarioResponsavel]);

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

  const handleAddFuncionario = async (e: React.FormEvent) => {
    e.preventDefault();
    setFuncionarioError(null);
    if (!funcionarioResponsavel.trim()) {
      setFuncionarioError("Selecione o usuário (loja) responsável.");
      return;
    }
    const result = await addFuncionario(novoFuncionario, funcionarioResponsavel);
    if (result.ok) {
      setNovoFuncionario("");
      await refreshFuncionarios();
      return;
    }
    if (result.error === "empty") {
      setFuncionarioError("Informe o nome.");
      return;
    }
    if (result.error === "empty_responsavel") {
      setFuncionarioError("Selecione o usuário (loja) responsável.");
      return;
    }
    if (result.error === "duplicate") {
      setFuncionarioError("Já existe um funcionário com esse nome para esse usuário/loja.");
      return;
    }
    setFuncionarioError("Não foi possível salvar. Verifique a conexão e o Supabase.");
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

          <section className="rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] p-4">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <Users className="h-4 w-4" />
              Funcionários
            </h2>
            <p className="mb-4 text-xs text-[var(--muted)]">
              Aqui serão registrados os funcionários que irão realizar ações no app. Cada um fica vinculado a um{" "}
              <span className="font-medium text-[var(--foreground)]">login (loja)</span> — por exemplo Carina para
              leblon, Felipe para ipanema.               No Revisar Produto, cada loja só vê os seus funcionários. Você pode alterar o usuário responsável
              pelo menu ao lado de cada nome. Dados no Supabase (fallback: navegador se a API falhar).
            </p>
            <form onSubmit={handleAddFuncionario} className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="min-w-0 space-y-1">
                  <label htmlFor="novo-funcionario-nome" className="block text-xs font-medium text-[var(--muted)]">
                    Novo funcionário
                  </label>
                  <input
                    id="novo-funcionario-nome"
                    type="text"
                    value={novoFuncionario}
                    onChange={(e) => {
                      setNovoFuncionario(e.target.value);
                      setFuncionarioError(null);
                    }}
                    placeholder="Nome completo ou apelido"
                    className="w-full rounded-lg border-2 border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <label
                    htmlFor="funcionario-responsavel"
                    className="block text-xs font-medium text-[var(--muted)]"
                  >
                    Usuário responsável (loja)
                  </label>
                  <select
                    id="funcionario-responsavel"
                    value={funcionarioResponsavel}
                    onChange={(e) => {
                      setFuncionarioResponsavel(e.target.value);
                      setFuncionarioError(null);
                    }}
                    disabled={loading || users.length === 0}
                    className="w-full rounded-lg border-2 border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] disabled:opacity-50"
                  >
                    {users.length === 0 ? (
                      <option value="">Carregue os logins acima</option>
                    ) : (
                      [...users]
                        .sort((a, b) => a.username.localeCompare(b.username))
                        .map((u) => (
                          <option key={u.id} value={u.username}>
                            {u.username}
                          </option>
                        ))
                    )}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || users.length === 0}
                className="flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] disabled:opacity-50 sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Adicionar
              </button>
            </form>
            {funcionarioError && (
              <p className="mt-2 text-sm text-[var(--destructive)]" role="status">
                {funcionarioError}
              </p>
            )}
            {funcionariosLoading ? (
              <p className="mt-4 text-sm text-[var(--muted)]">Carregando funcionários…</p>
            ) : funcionarios.length > 0 ? (
              <ul className="mt-4 space-y-2 border-t border-[var(--border)] pt-4">
                {funcionarios.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                  >
                    <span className="min-w-0 shrink-0 font-medium sm:max-w-[40%] sm:truncate">
                      {row.nome}
                    </span>
                    <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                      <div className="min-w-0 flex-1 sm:max-w-xs">
                        <label className="sr-only" htmlFor={`funcionario-resp-${row.id}`}>
                          Usuário responsável por {row.nome}
                        </label>
                        <select
                          id={`funcionario-resp-${row.id}`}
                          value={row.responsavel}
                          disabled={
                            funcionarioUpdatingId === row.id || loading || users.length === 0
                          }
                          onChange={(e) => {
                            const next = e.target.value;
                            if (next === row.responsavel) return;
                            void (async () => {
                              setFuncionarioUpdatingId(row.id);
                              setFuncionarioError(null);
                              const result = await updateFuncionarioResponsavel(row.id, next);
                              await refreshFuncionarios();
                              setFuncionarioUpdatingId(null);
                              if (!result.ok) {
                                if (result.error === "duplicate") {
                                  setFuncionarioError(
                                    "Já existe um funcionário com esse nome para o usuário/loja selecionado.",
                                  );
                                } else {
                                  setFuncionarioError("Não foi possível atualizar o responsável.");
                                }
                              }
                            })();
                          }}
                          className="w-full rounded-lg border-2 border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--foreground)] disabled:opacity-50 sm:text-sm"
                        >
                          {!users.some(
                            (u) => u.username.toLowerCase() === row.responsavel.toLowerCase(),
                          ) ? (
                            <option value={row.responsavel}>{row.responsavel}</option>
                          ) : null}
                          {[...users]
                            .sort((a, b) => a.username.localeCompare(b.username))
                            .map((u) => (
                              <option key={u.id} value={u.username}>
                                {u.username}
                              </option>
                            ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          void (async () => {
                            await removeFuncionario(row.id);
                            await refreshFuncionarios();
                          })();
                        }}
                        className="shrink-0 rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)]"
                        aria-label={`Remover ${row.nome}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Usuários cadastrados {loading ? "(…)" : `(${users.length})`}
            </h2>
            {loading ? (
              <SkeletonUserList count={4} />
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
