// Torna o endereço das contas sim. coerente com a coordenada (reverse geocode):
// coord -> endereço real do Mapbox. Assim o texto bate com o ponto e o pino crava.
// Uso: node scripts/geocode-sim.mjs
import { readFileSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const T = env.NEXT_PUBLIC_MAPBOX_TOKEN;
const REF = "https://appdelivery-psi.vercel.app/";
const m = env.DATABASE_URL.match(/^postgres(?:ql)?:\/\/([^:]+):(.*)@([^:/]+):(\d+)\/(.+)$/);
const c = new pg.Client({ user: m[1], password: m[2], host: m[3], port: +m[4], database: m[5], ssl: { rejectUnauthorized: false } });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function reverse(lng, lat) {
  const u = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${T}&country=br&language=pt&types=address&limit=1`;
  try {
    const d = await (await fetch(u, { headers: { Referer: REF } })).json();
    const f = (d.features || [])[0];
    return f?.place_name ?? null;
  } catch {
    return null;
  }
}

async function main() {
  await c.connect();
  const ests = (await c.query(
    `select e.id, e.lat, e.lng from estabelecimentos e join profiles p on p.id=e.profile_id
     join auth.users u on u.id=p.id where u.email like 'sim.est.%' order by u.email`,
  )).rows;
  console.log("estabelecimentos sim:", ests.length);
  const r6 = (n) => Math.round(n * 1e6) / 1e6;
  const coreLat = () => r6(-10.21 + Math.random() * 0.04); // miolo do Plano Diretor
  const coreLng = () => r6(-48.34 + Math.random() * 0.03);
  let ok = 0;
  const amostra = [];
  for (const e of ests) {
    let lat = e.lat, lng = e.lng, rerolled = false;
    let novo = await reverse(lng, lat);
    for (let t = 0; !novo && t < 6; t++) {
      lat = coreLat(); lng = coreLng(); rerolled = true;
      novo = await reverse(lng, lat);
      await sleep(60);
    }
    if (novo) {
      if (rerolled) await c.query(`update estabelecimentos set endereco=$1, lat=$2, lng=$3 where id=$4`, [novo, lat, lng, e.id]);
      else await c.query(`update estabelecimentos set endereco=$1 where id=$2`, [novo, e.id]);
      ok++;
      if (amostra.length < 5) amostra.push(novo);
    }
    await sleep(60); // ~16/s, folgado p/ o rate-limit do Mapbox
  }
  // sincroniza a coleta dos pedidos com endereço E coordenada novos do estabelecimento
  const upd = await c.query(
    `update pedidos pd set coleta_endereco = e.endereco, coleta_lat = e.lat, coleta_lng = e.lng
     from estabelecimentos e join profiles p on p.id=e.profile_id join auth.users u on u.id=p.id
     where pd.estabelecimento_id=e.id and u.email like 'sim.est.%'`,
  );
  console.log("endereços atualizados:", ok, "| pedidos coleta sincronizados:", upd.rowCount);
  console.log("amostra:", amostra);
  await c.end();
}
main().catch((e) => { console.error("ERRO:", e.message); process.exit(1); });
