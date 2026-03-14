import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSupabaseServer, getSupabaseServerAnon } from "@/lib/supabase";
import { getAuthHashes } from "@/lib/auth-hashes";

async function fetchUserProfile(
  username: string
): Promise<{ userId: string; lojaId: string | null; lojaName: string | null } | null> {
  const supabase = getSupabaseServer();
  if (!supabase) return null;
  const { data } = await supabase
    .from("users")
    .select("id, loja_id, lojas(name)")
    .ilike("username", username)
    .maybeSingle();
  if (!data) return null;
  const lojaName =
    data.loja_id && typeof data.lojas === "object" && data.lojas && "name" in data.lojas
      ? (data.lojas as { name: string }).name
      : null;
  return { userId: data.id, lojaId: data.loja_id ?? null, lojaName };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json({ ok: false, error: "Usuário e senha são obrigatórios" }, { status: 400 });
    }

    const key = username.toLowerCase().trim();

    // 1. auth-hashes.json (bcrypt nativo - compatível com hashes $2b$ do Node)
    const hashes = getAuthHashes();
    const hash = hashes[key];
    if (hash) {
      const valid = await bcrypt.compare(password, hash);
      if (valid) {
        const profile = await fetchUserProfile(key);
        return NextResponse.json({
          ok: true,
          user: key,
          userId: profile?.userId,
          lojaId: profile?.lojaId ?? null,
          lojaName: profile?.lojaName ?? null,
        });
      }
      return NextResponse.json({ ok: false, error: "Usuário ou senha inválidos" }, { status: 401 });
    }

    // 2. Supabase com service_role (query direta na tabela users)
    const supabaseAdmin = getSupabaseServer();
    if (supabaseAdmin) {
      const { data: userRow, error } = await supabaseAdmin
        .from("users")
        .select("id, username, password_hash, loja_id, lojas(name)")
        .ilike("username", key)
        .maybeSingle();

      if (error) {
        console.error("Supabase auth error:", error);
        return NextResponse.json({ ok: false, error: "Erro ao validar credenciais" }, { status: 500 });
      }

      if (userRow) {
        const valid = await bcrypt.compare(password, userRow.password_hash);
        if (valid) {
          const lojaName =
            userRow.loja_id && typeof userRow.lojas === "object" && userRow.lojas && "name" in userRow.lojas
              ? (userRow.lojas as { name: string }).name
              : null;
          return NextResponse.json({
            ok: true,
            user: userRow.username.toLowerCase(),
            userId: userRow.id,
            lojaId: userRow.loja_id ?? null,
            lojaName,
          });
        }
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
        const profile = await fetchUserProfile(validUsername);
        return NextResponse.json({
          ok: true,
          user: validUsername.toLowerCase(),
          userId: profile?.userId,
          lojaId: profile?.lojaId ?? null,
          lojaName: profile?.lojaName ?? null,
        });
      }
    }

    // 4. Usuário não encontrado em nenhuma fonte
    return NextResponse.json({ ok: false, error: "Usuário ou senha inválidos" }, { status: 401 });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}
