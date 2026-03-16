import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSupabaseServer } from "@/lib/supabase";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID ausente" }, { status: 400 });
  }
  try {
    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) {
      console.error("[api/users] DELETE:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/users] DELETE error:", err);
    return NextResponse.json({ error: "Erro ao excluir usuário" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID ausente" }, { status: 400 });
  }
  try {
    const body = await request.json();
    const { password } = body;
    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Senha é obrigatória" }, { status: 400 });
    }
    if (password.length < 4) {
      return NextResponse.json({ error: "Senha deve ter pelo menos 4 caracteres" }, { status: 400 });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const { error } = await supabase
      .from("users")
      .update({ password_hash })
      .eq("id", id);
    if (error) {
      console.error("[api/users] PATCH:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/users] PATCH error:", err);
    return NextResponse.json({ error: "Erro ao atualizar senha" }, { status: 500 });
  }
}
