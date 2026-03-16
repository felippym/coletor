import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSupabaseServer } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });
  }
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, created_at")
      .order("username");
    if (error) {
      console.error("[api/users] GET:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("[api/users] GET error:", err);
    return NextResponse.json({ error: "Erro ao listar usuários" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });
  }
  try {
    const body = await request.json();
    const { username, password } = body;
    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Usuário e senha são obrigatórios" }, { status: 400 });
    }
    const user = username.trim().toLowerCase();
    if (user.length < 2) {
      return NextResponse.json({ error: "Usuário deve ter pelo menos 2 caracteres" }, { status: 400 });
    }
    if (password.length < 4) {
      return NextResponse.json({ error: "Senha deve ter pelo menos 4 caracteres" }, { status: 400 });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from("users")
      .insert({ username: user, password_hash })
      .select("id, username, created_at")
      .single();
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Usuário já existe" }, { status: 409 });
      }
      console.error("[api/users] POST:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/users] POST error:", err);
    return NextResponse.json({ error: "Erro ao criar usuário" }, { status: 500 });
  }
}
