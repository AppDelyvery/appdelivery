// Imprime a fonte crua de uma função. Uso: node scripts/funcsrc.mjs <nome>
import { readFileSync } from "node:fs";
import pg from "pg";
const env = Object.fromEntries(readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const m = env.DATABASE_URL.match(/^postgres(?:ql)?:\/\/([^:]+):(.*)@([^:\/]+):(\d+)\/(.+)$/);
const c = new pg.Client({ user: m[1], password: m[2], host: m[3], port: +m[4], database: m[5], ssl: { rejectUnauthorized: false } });
await c.connect();
const r = await c.query(`select pg_get_functiondef(oid) as def from pg_proc where proname=$1`, [process.argv[2]]);
for (const row of r.rows) console.log(row.def + "\n----------------");
await c.end();
