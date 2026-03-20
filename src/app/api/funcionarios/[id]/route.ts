import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });
  }
  const { id } = await params;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  try {
    const body = await request.json();
    const responsavel =
      typeof body?.responsavel === "string" ? body.responsavel.trim().toLowerCase() : "";
    if (!responsavel) {
      return NextResponse.json({ error: "Usuário responsável é obrigatório" }, { status: 400 });
    }
    const { data: existing, error: fetchErr } = await supabase
      .from("funcionarios")
      .select("id, nome")
      .eq("id", id)
      .maybeSingle();
    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
    }
    const { data, error } = await supabase
      .from("funcionarios")
      .update({ responsavel })
      .eq("id", id)
      .select("id, nome, responsavel")
      .single();
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Já existe um funcionário com esse nome para este usuário/loja" },
          { status: 409 },
        );
      }
      console.error("[api/funcionarios] PATCH:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/funcionarios] PATCH error:", err);
    return NextResponse.json({ error: "Erro ao atualizar funcionário" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });
  }
  const { id } = await params;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  try {
    const { error } = await supabase.from("funcionarios").delete().eq("id", id);
    if (error) {
      console.error("[api/funcionarios] DELETE:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[api/funcionarios] DELETE error:", err);
    return NextResponse.json({ error: "Erro ao remover funcionário" }, { status: 500 });
  }
}
