/**
 * Copia o SQL da migração created_by para a área de transferência e abre o Supabase SQL Editor.
 * Cole (Ctrl+V) e clique em Run.
 */
require("dotenv").config({ path: require("path").join(process.cwd(), ".env.local") });
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const sql = fs.readFileSync(
  path.join(process.cwd(), "supabase", "RUN_THIS_TO_FIX_CREATED_BY.sql"),
  "utf-8"
);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ref = url?.match(/https:\/\/([a-z]+)\.supabase\.co/)?.[1] || "project";
const editorUrl = `https://supabase.com/dashboard/project/${ref}/sql/new`;

try {
  if (process.platform === "win32") {
    const { spawnSync } = require("child_process");
    const proc = spawnSync("powershell", ["-Command", `Set-Clipboard -Value @'\n${sql}\n'@`], {
      encoding: "utf-8",
    });
    if (proc.status !== 0) {
      throw new Error(proc.stderr);
    }
  } else if (process.platform === "darwin") {
    const proc = require("child_process").spawnSync("pbcopy", { input: sql });
    if (proc.status !== 0) throw new Error();
  } else {
    const proc = require("child_process").spawnSync("xclip", ["-selection", "clipboard"], {
      input: sql,
    });
    if (proc.status !== 0) throw new Error();
  }
} catch {
  console.log("SQL (copie manualmente):\n", sql);
}

console.log("Supabase SQL Editor:", editorUrl);
console.log("SQL copiado para a área de transferência.");
console.log("Abra o link acima, cole (Ctrl+V) e clique em Run.");

if (process.platform === "win32") {
  execSync(`start ${editorUrl}`);
} else if (process.platform === "darwin") {
  execSync(`open ${editorUrl}`);
} else {
  execSync(`xdg-open ${editorUrl}`);
}
