/**
 * Gera SQL para inserir usuários na tabela users do Supabase.
 * Execute com as senhas em variáveis de ambiente.
 *
 * Windows (PowerShell):
 *   $env:AUTH_ADMIN_PASS="sua_senha_admin"
 *   $env:AUTH_LEBLON_PASS="sua_senha_leblon"
 *   $env:AUTH_IPANEMA_PASS="sua_senha_ipanema"
 *   node scripts/seed-supabase-users.js
 *
 * Linux/Mac:
 *   AUTH_ADMIN_PASS=xxx AUTH_LEBLON_PASS=xxx AUTH_IPANEMA_PASS=xxx node scripts/seed-supabase-users.js
 *
 * Cole o SQL gerado no Supabase Dashboard → SQL Editor e execute.
 */

const bcrypt = require("bcryptjs");

const USERS = [
  { username: "admin", env: "AUTH_ADMIN_PASS" },
  { username: "leblon", env: "AUTH_LEBLON_PASS" },
  { username: "ipanema", env: "AUTH_IPANEMA_PASS" },
];

function escapeSql(str) {
  return str.replace(/'/g, "''");
}

async function main() {
  const inserts = [];
  for (const { username, env } of USERS) {
    const pass = process.env[env];
    if (!pass) {
      console.error(`Erro: variável ${env} não definida. Defina as senhas antes de executar.`);
      process.exit(1);
    }
    const hash = await bcrypt.hash(pass, 10);
    inserts.push(`insert into public.users (username, password_hash) values ('${escapeSql(username)}', '${escapeSql(hash)}') on conflict (username) do update set password_hash = excluded.password_hash;`);
  }
  console.log("-- Cole e execute no Supabase SQL Editor:\n");
  console.log(inserts.join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
