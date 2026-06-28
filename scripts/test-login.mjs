// Testa login REST de um email (prova que conta semeada por SQL funciona). Uso: EMAIL=.. node scripts/test-login.mjs
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const U = env.NEXT_PUBLIC_SUPABASE_URL, K = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.EMAIL || "sim.sqltest@gmail.com";
const r = await fetch(`${U}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: K, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "Demo1234" }) }).then((x) => x.json());
console.log(r.access_token ? `LOGIN OK (${email})` : `LOGIN FALHOU: ${JSON.stringify(r).slice(0, 200)}`);
