import { VIEWER_HEADER } from "@/lib/product-review-viewer";

const STORAGE_V1 = "funcionarios_v1";
const STORAGE_V2 = "funcionarios_v2";
const LOCAL_ID_PREFIX = "local:";

export type FuncionarioRow = { id: string; nome: string; responsavel: string };

function normalizeList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const set = new Set<string>();
  for (const x of raw) {
    const s = String(x).trim();
    if (s) set.add(s);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function viewerFetchHeaders(viewer: string | null | undefined): HeadersInit {
  const headers: Record<string, string> = {};
  const v = viewer?.trim().toLowerCase();
  if (v) headers[VIEWER_HEADER] = v;
  return headers;
}

function filterRowsByViewer(rows: FuncionarioRow[], viewerUser: string | null): FuncionarioRow[] {
  const v = viewerUser?.trim().toLowerCase() ?? "";
  if (!v) return [];
  if (v === "admin") return [...rows].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return rows
    .filter((r) => r.responsavel.trim().toLowerCase() === v)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function localRowId(nome: string, responsavel: string): string {
  return `${LOCAL_ID_PREFIX}${encodeURIComponent(nome)}@${encodeURIComponent(responsavel)}`;
}

function parseLocalRowId(id: string): { nome: string; responsavel: string } | null {
  if (!id.startsWith(LOCAL_ID_PREFIX)) return null;
  const rest = id.slice(LOCAL_ID_PREFIX.length);
  const at = rest.indexOf("@");
  try {
    if (at === -1) {
      return { nome: decodeURIComponent(rest), responsavel: "admin" };
    }
    return {
      nome: decodeURIComponent(rest.slice(0, at)),
      responsavel: decodeURIComponent(rest.slice(at + 1)),
    };
  } catch {
    return null;
  }
}

type LocalPair = { nome: string; responsavel: string };

function readLocalPairs(): LocalPair[] {
  if (typeof window === "undefined") return [];
  try {
    const v2 = localStorage.getItem(STORAGE_V2);
    if (v2) {
      const parsed = JSON.parse(v2) as unknown;
      if (!Array.isArray(parsed)) return [];
      const out: LocalPair[] = [];
      for (const x of parsed) {
        if (!x || typeof x !== "object") continue;
        const nome = String((x as { nome?: string }).nome ?? "").trim();
        const resp = String((x as { responsavel?: string }).responsavel ?? "admin")
          .trim()
          .toLowerCase();
        if (nome) out.push({ nome, responsavel: resp });
      }
      return out;
    }
    const v1 = localStorage.getItem(STORAGE_V1);
    if (v1) {
      return normalizeList(JSON.parse(v1)).map((nome) => ({ nome, responsavel: "admin" }));
    }
  } catch {
    // ignore
  }
  return [];
}

function writeLocalPairs(pairs: LocalPair[]): void {
  if (typeof window === "undefined") return;
  const dedup = new Map<string, LocalPair>();
  for (const p of pairs) {
    const k = `${p.nome.toLowerCase()}\0${p.responsavel.toLowerCase()}`;
    dedup.set(k, p);
  }
  const list = [...dedup.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  localStorage.setItem(STORAGE_V2, JSON.stringify(list));
}

function localRowsFromPairs(pairs: LocalPair[]): FuncionarioRow[] {
  return pairs.map((p) => ({
    id: localRowId(p.nome, p.responsavel),
    nome: p.nome,
    responsavel: p.responsavel,
  }));
}

function updateFuncionarioResponsavelLocal(nome: string, oldR: string, newR: string): boolean {
  const oldL = oldR.trim().toLowerCase();
  const newL = newR.trim().toLowerCase();
  if (oldL === newL) return true;
  const pairs = readLocalPairs();
  if (
    pairs.some(
      (p) => p.nome.toLowerCase() === nome.toLowerCase() && p.responsavel === newL,
    )
  ) {
    return false;
  }
  let found = false;
  const next = pairs.map((p) => {
    if (p.nome.toLowerCase() === nome.toLowerCase() && p.responsavel === oldL) {
      found = true;
      return { nome: p.nome, responsavel: newL };
    }
    return p;
  });
  if (!found) return false;
  writeLocalPairs(next);
  return true;
}

function addFuncionarioLocal(nome: string, responsavel: string): boolean {
  const n = nome.trim();
  const r = responsavel.trim().toLowerCase();
  if (!n || !r) return false;
  const pairs = readLocalPairs();
  if (pairs.some((p) => p.nome.toLowerCase() === n.toLowerCase() && p.responsavel === r)) {
    return false;
  }
  pairs.push({ nome: n, responsavel: r });
  writeLocalPairs(pairs);
  return true;
}

function removeFuncionarioLocal(nome: string, responsavel: string): void {
  const r = responsavel.trim().toLowerCase();
  writeLocalPairs(
    readLocalPairs().filter(
      (p) => !(p.nome === nome && p.responsavel.toLowerCase() === r),
    ),
  );
}

function parseFuncionarioRows(data: unknown): FuncionarioRow[] {
  if (!Array.isArray(data)) return [];
  const out: FuncionarioRow[] = [];
  for (const x of data) {
    if (!x || typeof x !== "object") continue;
    const id = (x as { id?: string }).id;
    const nome = (x as { nome?: string }).nome;
    const respRaw = (x as { responsavel?: string }).responsavel;
    if (typeof id !== "string" || typeof nome !== "string") continue;
    const n = nome.trim();
    if (!n) continue;
    const responsavel =
      typeof respRaw === "string" && respRaw.trim()
        ? respRaw.trim().toLowerCase()
        : "admin";
    out.push({ id, nome: n, responsavel });
  }
  return out.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Lista com id (Supabase ou fallback local). Filtra por loja quando viewer não é admin. */
export async function loadFuncionarioRows(viewerUser: string | null): Promise<FuncionarioRow[]> {
  try {
    const res = await fetch("/api/funcionarios", {
      cache: "no-store",
      headers: viewerFetchHeaders(viewerUser),
    });
    if (res.ok) {
      const data = (await res.json()) as unknown;
      if (Array.isArray(data)) return parseFuncionarioRows(data);
    }
  } catch {
    // fallback local
  }
  const local = localRowsFromPairs(readLocalPairs());
  return filterRowsByViewer(local, viewerUser);
}

/** Nomes para o select (já filtrados por loja). */
export async function loadFuncionarioNames(viewerUser: string | null): Promise<string[]> {
  const rows = await loadFuncionarioRows(viewerUser);
  return rows.map((r) => r.nome);
}

export async function addFuncionario(
  nome: string,
  responsavel: string,
): Promise<{ ok: boolean; error?: "empty" | "empty_responsavel" | "duplicate" | "network" }> {
  const n = nome.trim();
  const r = responsavel.trim().toLowerCase();
  if (!n) return { ok: false, error: "empty" };
  if (!r) return { ok: false, error: "empty_responsavel" };
  try {
    const res = await fetch("/api/funcionarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: n, responsavel: r }),
    });
    if (res.ok) return { ok: true };
    if (res.status === 409) return { ok: false, error: "duplicate" };
    if (addFuncionarioLocal(n, r)) return { ok: true };
    return { ok: false, error: "duplicate" };
  } catch {
    if (addFuncionarioLocal(n, r)) return { ok: true };
    return { ok: false, error: "network" };
  }
}

export async function updateFuncionarioResponsavel(
  id: string,
  responsavel: string,
): Promise<{ ok: boolean; error?: "empty_responsavel" | "duplicate" | "network" | "not_found" }> {
  const r = responsavel.trim().toLowerCase();
  if (!r) return { ok: false, error: "empty_responsavel" };
  const parsed = parseLocalRowId(id);
  if (parsed) {
    const ok = updateFuncionarioResponsavelLocal(parsed.nome, parsed.responsavel, r);
    return ok ? { ok: true } : { ok: false, error: "duplicate" };
  }
  try {
    const res = await fetch(`/api/funcionarios/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responsavel: r }),
    });
    if (res.ok) return { ok: true };
    if (res.status === 404) return { ok: false, error: "not_found" };
    if (res.status === 409) return { ok: false, error: "duplicate" };
    return { ok: false, error: "network" };
  } catch {
    return { ok: false, error: "network" };
  }
}

export async function removeFuncionario(id: string): Promise<boolean> {
  const parsed = parseLocalRowId(id);
  if (parsed) {
    removeFuncionarioLocal(parsed.nome, parsed.responsavel);
    return true;
  }
  try {
    const res = await fetch(`/api/funcionarios/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}
