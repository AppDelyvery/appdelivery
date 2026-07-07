// Monitor passivo do GPS do entregador durante a caminhada. Loga posição a cada 20s
// por ~12 min, mostrando se a posição se move (lat/lng muda) e o frescor de cada ponto.
// Uso: node scripts/monitor-gps.mjs [email=sim.ent.1@gmail.com] [iteracoes=36]
import { readFileSync } from "node:fs";
import pg from "pg";

const EMAIL = process.argv[2] || "sim.ent.1@gmail.com";
const ITER = Number(process.argv[3] || 36);
const GAP = 20000;

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const m = env.DATABASE_URL.match(/^postgres(?:ql)?:\/\/([^:]+):(.*)@([^:/]+):(\d+)\/(.+)$/);
const c = new pg.Client({ user: m[1], password: m[2], host: m[3], port: +m[4], database: m[5], ssl: { rejectUnauthorized: false } });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const R = 6371000, rad = (d) => d * Math.PI / 180;
function metros(a, b) {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function main() {
  await c.connect();
  console.log(`monitor GPS de ${EMAIL} — ${ITER} leituras a cada ${GAP / 1000}s\n`);
  let prev = null, totalM = 0, paradas = 0;
  for (let i = 0; i < ITER; i++) {
    const r = await c.query(
      `select e.is_online, st_y(e.posicao::geometry) lat, st_x(e.posicao::geometry) lng,
              round(extract(epoch from (now()-e.ultima_posicao_at))) idade,
              (select count(*) from ofertas o where o.entregador_id=e.id and o.status='ofertada' and o.expira_at>now()) oferta
         from entregadores e join profiles p on p.id=e.profile_id join auth.users u on u.id=p.id where u.email=$1`,
      [EMAIL],
    );
    const row = r.rows[0];
    const hora = new Date().toISOString().slice(11, 19);
    if (!row) { console.log(`[${hora}] entregador não encontrado`); }
    else if (!row.is_online) { console.log(`[${hora}] OFFLINE`); }
    else if (row.lat == null) { console.log(`[${hora}] online, sem GPS`); }
    else {
      let mov = "";
      if (prev) {
        const d = metros({ lat: +prev.lat, lng: +prev.lng }, { lat: +row.lat, lng: +row.lng });
        totalM += d;
        if (d < 3) { paradas++; mov = `  PARADO (${d.toFixed(0)}m)`; }
        else mov = `  +${d.toFixed(0)}m`;
      }
      console.log(`[${hora}] ${(+row.lat).toFixed(5)}, ${(+row.lng).toFixed(5)} | GPS ${row.idade}s | oferta:${row.oferta}${mov}`);
      prev = { lat: row.lat, lng: row.lng };
    }
    if (i < ITER - 1) await sleep(GAP);
  }
  console.log(`\n=== RESUMO === deslocamento total: ${(totalM / 1000).toFixed(2)} km | leituras paradas: ${paradas}`);
  await c.end();
}
main().catch((e) => { console.error("ERRO:", e.message); process.exit(1); });
