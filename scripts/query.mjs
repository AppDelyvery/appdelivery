// Roda um SELECT e imprime — ferramenta de prova na fonte (read-after-write).
// Uso: node scripts/query.mjs "select indexname from pg_indexes where tablename='ofertas'"
import { readFileSync } from "node:fs";
import pg from "pg";
const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const url = (env.match(/DATABASE_URL=(.+)/) || [])[1]?.trim();
if (!url || url.includes("[YOUR-PASSWORD]") || url.includes("[SUA-SENHA]")) {
  console.error("✗ DATABASE_URL sem senha no .env.local.");
  process.exit(1);
}
const m = url.match(/^postgres(?:ql)?:\/\/([^:]+):(.*)@([^:/]+):(\d+)\/(.+)$/);
const [, user, password, host, port, database] = m;
const client = new pg.Client({ user, password, host, port: +port, database, ssl: { rejectUnauthorized: false } });
await client.connect();
try { console.table((await client.query(process.argv[2])).rows); }
finally { await client.end(); }
