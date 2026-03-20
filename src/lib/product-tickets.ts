import { VIEWER_HEADER } from "@/lib/product-review-viewer";
import type { ProductTicket, ProductTicketStatus } from "@/types/product-ticket";

const STORAGE_KEY = "product_tickets_v1";

export async function compressImageFile(file: File, maxWidth = 1200, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    let w = bitmap.width;
    let h = bitmap.height;
    if (w > maxWidth) {
      h = (h * maxWidth) / w;
      w = maxWidth;
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas não suportado");
    ctx.drawImage(bitmap, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    bitmap.close();
  }
}

export function normalizeProductTicket(t: ProductTicket): ProductTicket {
  const st = (t as { status?: string }).status;
  const cb = (t as { createdBy?: string }).createdBy;
  return {
    id: t.id,
    funcionario: t.funcionario,
    ean: t.ean,
    photoEan: t.photoEan,
    photoProduto: t.photoProduto,
    createdAt: t.createdAt,
    status: st === "concluido" ? "concluido" : "em_aberto",
    createdBy: typeof cb === "string" && cb.trim() ? cb.trim() : undefined,
  };
}

function viewerFetchHeaders(viewer: string | null | undefined): HeadersInit {
  const headers: Record<string, string> = {};
  if (viewer) headers[VIEWER_HEADER] = viewer;
  return headers;
}

function filterTicketsForViewer(tickets: ProductTicket[], viewer: string | null): ProductTicket[] {
  if (!viewer || viewer === "admin") return tickets;
  return tickets.filter((t) => {
    const o = t.createdBy?.trim().toLowerCase();
    return o === viewer;
  });
}

function getProductTicketsLocal(): ProductTicket[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as ProductTicket[]).map((x) =>
      normalizeProductTicket(x as ProductTicket)
    );
  } catch {
    return [];
  }
}

function saveProductTicketLocal(ticket: ProductTicket): void {
  const t = normalizeProductTicket(ticket);
  const list = getProductTicketsLocal();
  const idx = list.findIndex((x) => x.id === t.id);
  if (idx >= 0) list[idx] = t;
  else list.unshift(t);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function deleteProductTicketLocal(id: string): void {
  const list = getProductTicketsLocal().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/** Carrega tickets: API (Supabase) + entradas só em localStorage que ainda não subiram. */
export async function loadProductTickets(viewerUser: string | null): Promise<ProductTicket[]> {
  let remote: ProductTicket[] = [];
  try {
    const res = await fetch("/api/product-review/tickets", {
      cache: "no-store",
      headers: viewerFetchHeaders(viewerUser),
    });
    if (res.ok) {
      const data = (await res.json()) as { tickets?: ProductTicket[] };
      if (Array.isArray(data.tickets)) {
        remote = data.tickets.map(normalizeProductTicket);
      }
    }
  } catch {
    // ignora
  }
  const local = filterTicketsForViewer(getProductTicketsLocal(), viewerUser);
  const byId = new Map<string, ProductTicket>();
  for (const t of remote) byId.set(t.id, t);
  for (const t of local) {
    if (!byId.has(t.id)) byId.set(t.id, t);
  }
  const merged = Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return filterTicketsForViewer(merged, viewerUser);
}

export async function saveProductTicket(
  ticket: ProductTicket,
  createdBy?: string | null
): Promise<{ remote: boolean }> {
  const payload = normalizeProductTicket({
    ...ticket,
    createdBy: createdBy?.trim() || ticket.createdBy,
  });
  try {
    const res = await fetch("/api/product-review/tickets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...viewerFetchHeaders(createdBy ?? null),
      },
      body: JSON.stringify({
        id: payload.id,
        funcionario: payload.funcionario,
        ean: payload.ean,
        photoEan: payload.photoEan,
        photoProduto: payload.photoProduto,
        createdBy: createdBy?.trim().toLowerCase() || undefined,
        status: payload.status,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { ticket?: ProductTicket };
      const saved = data.ticket ? normalizeProductTicket(data.ticket) : payload;
      saveProductTicketLocal(saved);
      return { remote: true };
    }
  } catch (e) {
    console.warn("[product-tickets] salvamento remoto falhou:", e);
  }
  saveProductTicketLocal(payload);
  return { remote: false };
}

export async function updateProductTicketStatus(
  id: string,
  status: ProductTicketStatus,
  viewerUser: string | null
): Promise<{ remote: boolean }> {
  const s: ProductTicketStatus = status === "concluido" ? "concluido" : "em_aberto";
  const list = getProductTicketsLocal();
  const existing = list.find((t) => t.id === id);
  if (existing) {
    saveProductTicketLocal({ ...existing, status: s });
  }
  try {
    const res = await fetch(`/api/product-review/tickets/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...viewerFetchHeaders(viewerUser),
      },
      body: JSON.stringify({ status: s }),
    });
    if (res.ok) {
      const data = (await res.json()) as { ticket?: ProductTicket };
      if (data.ticket) saveProductTicketLocal(normalizeProductTicket(data.ticket));
      return { remote: true };
    }
  } catch (e) {
    console.warn("[product-tickets] atualização de status falhou:", e);
  }
  return { remote: false };
}

export async function deleteProductTicket(
  id: string,
  viewerUser: string | null
): Promise<{ remote: boolean }> {
  try {
    const res = await fetch(`/api/product-review/tickets/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: viewerFetchHeaders(viewerUser),
    });
    if (res.ok) {
      deleteProductTicketLocal(id);
      return { remote: true };
    }
  } catch (e) {
    console.warn("[product-tickets] exclusão remota falhou:", e);
  }
  deleteProductTicketLocal(id);
  return { remote: false };
}
