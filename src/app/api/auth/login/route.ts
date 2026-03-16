import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSupabaseServer, getSupabaseServerAnon } from "@/lib/supabase";
import { getAuthHashes } from "@/lib/auth-hashes";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json({ ok: false, error: "Usuário e senha são obrigatórios" }, { status: 400 });
    }

    const key = username.toLowerCase().trim();

    // 1. Supabase com service_role (prioridade: senhas alteradas na tela de usuários)
    const supabaseAdmin = getSupabaseServer();
    if (supabaseAdmin) {
      const { data: userRow, error } = await supabaseAdmin
        .from("users")
        .select("username, password_hash")
        .ilike("username", key)
        .maybeSingle();

      if (error) {
        console.error("Supabase auth error:", error);
        return NextResponse.json({ ok: false, error: "Erro ao validar credenciais" }, { status: 500 });
      }

      if (userRow) {
        const valid = await bcrypt.compare(password, userRow.password_hash);
        if (valid) {
          return NextResponse.json({ ok: true, user: userRow.username.toLowerCase() });
        }
        return NextResponse.json({ ok: false, error: "Usuário ou senha inválidos" }, { status: 401 });
      }
    }

    // 2. auth-hashes.json (fallback quando usuário não está no Supabase)
    const hashes = getAuthHashes();
    const hash = hashes[key];
    if (hash) {
      const valid = await bcrypt.compare(password, hash);
      if (valid) {
        return NextResponse.json({ ok: true, user: key });
      }
      return NextResponse.json({ ok: false, error: "Usuário ou senha inválidos" }, { status: 401 });
    }

    // 3. Supabase anon + RPC (pgcrypto - só funciona com hashes $2a$ do Postgres)
    const supabaseAnon = getSupabaseServerAnon();
    if (supabaseAnon) {
      const { data: validUsername, error } = await supabaseAnon.rpc("auth_validate_user", {
        p_username: username.trim(),
        p_password: password,
      });

      if (!error && validUsername && typeof validUsername === "string") {
        return NextResponse.json({ ok: true, user: validUsername.toLowerCase() });
      }
    }

    // 4. Usuário não encontrado em nenhuma fonte
    return NextResponse.json({ ok: false, error: "Usuário ou senha inválidos" }, { status: 401 });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}
