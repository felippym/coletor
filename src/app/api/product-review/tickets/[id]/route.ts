import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { canAccessTicket, normalizeViewerUser } from "@/lib/product-review-viewer";
import type { ProductTicketStatus } from "@/types/product-ticket";

export const maxDuration = 30;

function parseStatus(v: unknown): ProductTicketStatus {
  return v === "concluido" ? "concluido" : "em_aberto";
}

function ticketFromRow(row: Record<string, unknown>) {
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }

  const viewer = normalizeViewerUser(req.headers.get("x-viewer-user"));

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const status = parseStatus((body as { status?: string }).status);
  const sb = getSupabaseServer();
  if (!sb) {
    return NextResponse.json(
      { error: "Supabase não configurado (SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 503 }
    );
  }

  const { data: existing, error: fetchErr } = await sb
    .from("product_review_tickets")
    .select("id, created_by")
    .eq("id", id.trim())
    .maybeSingle();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Ticket não encontrado" }, { status: 404 });
  }

  const row = existing as { id: string; created_by: string | null };
  if (!canAccessTicket(viewer, row.created_by)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { data, error } = await sb
    .from("product_review_tickets")
    .update({ status })
    .eq("id", id.trim())
    .select("id, funcionario, ean, photo_ean, photo_produto, created_at, status, created_by")
    .single();

  if (error) {
    console.error("[product-review/tickets PATCH]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ticket: ticketFromRow(data as Record<string, unknown>),
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }

  const viewer = normalizeViewerUser(req.headers.get("x-viewer-user"));

  const sb = getSupabaseServer();
  if (!sb) {
    return NextResponse.json(
      { error: "Supabase não configurado (SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 503 }
    );
  }

  const { data: existing, error: fetchErr } = await sb
    .from("product_review_tickets")
    .select("id, created_by")
    .eq("id", id.trim())
    .maybeSingle();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Ticket não encontrado" }, { status: 404 });
  }

  const row = existing as { id: string; created_by: string | null };
  if (!canAccessTicket(viewer, row.created_by)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { error } = await sb.from("product_review_tickets").delete().eq("id", id.trim());

  if (error) {
    console.error("[product-review/tickets DELETE]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
