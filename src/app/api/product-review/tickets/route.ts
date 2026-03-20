import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { normalizeViewerUser } from "@/lib/product-review-viewer";
import type { ProductTicket, ProductTicketStatus } from "@/types/product-ticket";

export const maxDuration = 60;

function parseStatus(v: unknown): ProductTicketStatus {
  return v === "concluido" ? "concluido" : "em_aberto";
}

function rowToTicket(row: Record<string, unknown>): ProductTicket {
  return {
    id: String(row.id),
    funcionario: row.funcionario != null ? String(row.funcionario) : undefined,
    ean: String(row.ean),
    photoEan: String(row.photo_ean),
    photoProduto: String(row.photo_produto),
    createdAt:
      typeof row.created_at === "string"
        ? row.created_at
        : new Date(row.created_at as string).toISOString(),
    status: parseStatus(row.status),
    createdBy:
      row.created_by != null && String(row.created_by).trim()
        ? String(row.created_by).trim()
        : undefined,
  };
}

/** Lista tickets (mais recentes primeiro). Admin vê todos; demais usuários só os próprios (created_by). */
export async function GET(req: Request) {
  const sb = getSupabaseServer();
  if (!sb) {
    return NextResponse.json(
      { error: "Supabase não configurado (SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 503 }
    );
  }

  const viewer = normalizeViewerUser(req.headers.get("x-viewer-user"));
  if (!viewer) {
    return NextResponse.json({ tickets: [] });
  }

  let q = sb
    .from("product_review_tickets")
    .select("id, funcionario, ean, photo_ean, photo_produto, created_at, status, created_by")
    .order("created_at", { ascending: false });

  if (viewer !== "admin") {
    q = q.eq("created_by", viewer);
  }

  const { data, error } = await q;

  if (error) {
    console.error("[product-review/tickets GET]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const rows = (data ?? []) as Record<string, unknown>[];
  return NextResponse.json({ tickets: rows.map(rowToTicket) });
}

/** Cria ticket no banco. */
export async function POST(req: Request) {
  const sb = getSupabaseServer();
  if (!sb) {
    return NextResponse.json(
      { error: "Supabase não configurado (SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const b = body as {
    id?: string;
    funcionario?: string;
    ean?: string;
    photoEan?: string;
    photoProduto?: string;
    createdBy?: string | null;
    status?: string;
  };

  const id = typeof b.id === "string" && b.id.trim() ? b.id.trim() : crypto.randomUUID();
  const funcionario = typeof b.funcionario === "string" ? b.funcionario.trim() : "";
  const ean = typeof b.ean === "string" ? b.ean.trim() : "";
  const photoEan = typeof b.photoEan === "string" ? b.photoEan.trim() : "";
  const photoProduto = typeof b.photoProduto === "string" ? b.photoProduto.trim() : "";
  const createdBy =
    typeof b.createdBy === "string" && b.createdBy.trim()
      ? b.createdBy.trim().toLowerCase()
      : null;
  const status = parseStatus(b.status);

  if (!funcionario || !ean || !photoEan || !photoProduto) {
    return NextResponse.json(
      { error: "Campos obrigatórios: funcionario, ean, photoEan, photoProduto" },
      { status: 400 }
    );
  }

  const createdAt = new Date().toISOString();

  const { data, error } = await sb
    .from("product_review_tickets")
    .insert({
      id,
      funcionario,
      ean,
      photo_ean: photoEan,
      photo_produto: photoProduto,
      created_at: createdAt,
      created_by: createdBy,
      status,
    })
    .select("id, funcionario, ean, photo_ean, photo_produto, created_at, status, created_by")
    .single();

  if (error) {
    console.error("[product-review/tickets POST]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ticket = rowToTicket(data as Record<string, unknown>);
  return NextResponse.json({ ticket });
}
