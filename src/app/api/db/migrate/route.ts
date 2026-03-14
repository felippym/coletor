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
    const pool = new Pool({ connectionString: url });
    const client = await pool.connect();
    const migrations = [
      "004_add_inventory_status.sql",
      "006_add_lojas_and_relationships.sql",
      "007_add_kelly_joana_users.sql",
    ];
    const messages: string[] = [];
    for (const file of migrations) {
      const sqlPath = join(process.cwd(), "supabase", "migrations", file);
      const sql = readFileSync(sqlPath, "utf-8");
      await client.query(sql);
      messages.push(file.replace(".sql", "") + " executada");
    }
    client.release();
    await pool.end();

    return NextResponse.json({ success: true, message: messages.join(". ") });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("already exists")) {
      return NextResponse.json({ success: true, message: "Coluna status já existe." });
    }
    console.error("[migrate]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
