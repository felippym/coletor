import { NextResponse } from "next/server";
import { Pool } from "pg";
import { readFileSync } from "fs";
import { join } from "path";

export async function POST(request: Request) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return NextResponse.json(
      { error: "DATABASE_URL não configurada em .env.local" },
      { status: 500 }
    );
  }

  try {
    const sqlPath = join(process.cwd(), "supabase", "migrations", "004_add_inventory_status.sql");
    const sql = readFileSync(sqlPath, "utf-8");

    const pool = new Pool({ connectionString: url });
    const client = await pool.connect();
    await client.query(sql);
    client.release();
    await pool.end();

    return NextResponse.json({ success: true, message: "Migração executada." });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("already exists")) {
      return NextResponse.json({ success: true, message: "Coluna status já existe." });
    }
    console.error("[migrate]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
