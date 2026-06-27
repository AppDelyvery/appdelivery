// Roda um arquivo .sql no Supabase do AppDelyvery via DATABASE_URL do .env.local.
// (Mesmo padrão do ComandaPRO — conexão direta no Postgres, roda DDL de verdade: migrations, índices.)
// Uso: node scripts/db.mjs supabase/migrations/0046_indices_performance.sql
import { readFileSync } from "node:fs";
import pg from "pg";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const url = (env.match(/DATABASE_URL=(.+)/) || [])[1]?.trim();
if (!url || url.includes("[YOUR-PASSWORD]") || url.includes("[SUA-SENHA]")) {
  console.error("✗ DATABASE_URL sem senha no .env.local — cole a connection string do Supabase (Settings → Database).");
  process.exit(1);
}
const file = process.argv[2];
if (!file) {
  console.error("uso: node scripts/db.mjs <arquivo.sql>");
  process.exit(1);
}
const sql = readFileSync(file, "utf8");
// parse manual (senha pode ter # @ etc que quebram a connection string)
const m = url.match(/^postgres(?:ql)?:\/\/([^:]+):(.*)@([^:/]+):(\d+)\/(.+)$/);
if (!m) {
  console.error("✗ DATABASE_URL em formato inesperado");
  process.exit(1);
}
const [, user, password, host, port, database] = m;
const client = new pg.Client({ user, password, host, port: +port, database, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(sql);
  console.log("✓ rodou:", file);
} catch (e) {
  console.error("✗ erro:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
