// Sonda o teto de rate-limit de LOGIN: tenta N logins paced e reporta sucesso/falha. Uso: N=80 POOL=8 node scripts/probe-login.mjs
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const U = env.NEXT_PUBLIC_SUPABASE_URL, K = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const N = +(process.env.N || 80), POOL = +(process.env.POOL || 8);
const login = async (email) => { const r = await fetch(`${U}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: K, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "Demo1234" }) }).then((x) => x.json()); return r.access_token ? "ok" : (r.error_code || r.msg || r.code || "fail"); };
let ok = 0, fail = 0, primeiroErro = null, i = 0;
const items = Array.from({ length: N }, (_, k) => `sim.est.${k}@gmail.com`);
const work = async () => { while (i < items.length) { const r = await login(items[i++]); if (r === "ok") ok++; else { fail++; if (!primeiroErro) primeiroErro = r; } } };
const t0 = Date.now();
await Promise.all(Array.from({ length: POOL }, work));
console.log(`logins: ${ok} ok / ${fail} fail em ${((Date.now() - t0) / 1000).toFixed(1)}s | primeiro erro: ${primeiroErro || "—"}`);
