import { NextResponse } from "next/server";
import { VIEWER_HEADER, normalizeViewerUser } from "@/lib/product-review-viewer";
import { getSupabaseServer } from "@/lib/supabase";

export async function GET(request: Request) {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });
  }
  const viewer = normalizeViewerUser(request.headers.get(VIEWER_HEADER));
  if (!viewer) {
    return NextResponse.json([]);
  }
  try {
    let q = supabase.from("funcionarios").select("id, nome, responsavel").order("nome");
    if (viewer !== "admin") {
      q = q.eq("responsavel", viewer);
    }
    const { data, error } = await q;
    if (error) {
      console.error("[api/funcionarios] GET:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("[api/funcionarios] GET error:", err);
    return NextResponse.json({ error: "Erro ao listar funcionários" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });
  }
  try {
    const body = await request.json();
    const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
    const responsavel =
      typeof body?.responsavel === "string" ? body.responsavel.trim().toLowerCase() : "";
    if (!nome) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }
    if (!responsavel) {
      return NextResponse.json({ error: "Usuário responsável é obrigatório" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("funcionarios")
      .insert({ nome, responsavel })
      .select("id, nome, responsavel")
      .single();
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Já existe um funcionário com esse nome para este usuário/loja" },
          { status: 409 },
        );
      }
      console.error("[api/funcionarios] POST:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/funcionarios] POST error:", err);
    return NextResponse.json({ error: "Erro ao criar funcionário" }, { status: 500 });
  }
}
