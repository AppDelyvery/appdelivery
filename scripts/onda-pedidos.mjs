// Onda de pedidos REAIS (moto, buscando) pra testar o despacho ao vivo no celular.
// Coleta e entrega = endereços reais de Palmas (estabelecimentos sim). Triggers LIGADOS:
// cobra a carteira e despacha (ofertar_proximo) de verdade. O cron processar-ofertas (15s)
// vai alimentando a fila pro entregador conforme ele aceita/recusa.
// Uso: node scripts/onda-pedidos.mjs [N=12] [veiculo=moto]
import { readFileSync } from "node:fs";
import pg from "pg";

const N = Number(process.argv[2] || 12);
const VEIC = process.argv[3] || "moto";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const m = env.DATABASE_URL.match(/^postgres(?:ql)?:\/\/([^:]+):(.*)@([^:/]+):(\d+)\/(.+)$/);
const c = new pg.Client({ user: m[1], password: m[2], host: m[3], port: +m[4], database: m[5], ssl: { rejectUnauthorized: false } });

const ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = (a) => a[ri(0, a.length - 1)];
const money = (n) => Math.round(n * 100) / 100;
const NOMES = ["João Silva", "Maria Souza", "Carlos Lima", "Ana Costa", "Pedro Rocha", "Lucas Alves", "Bia Martins", "Rafa Gomes", "Duda Pires", "Igor Melo"];
const DESC = ["Documentos", "Medicamentos", "Encomenda", "Peças", "Lanche", "Roupas", "Presente", "Material de escritório"];

const R = 6371000, rad = (d) => d * Math.PI / 180;
function distKm(a, b) {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return (2 * R * Math.asin(Math.sqrt(s))) / 1000;
}
function preco(km) {
  const base = { moto: 5, carro: 8, van: 15, bike: 4 }[VEIC] ?? 5;
  const perkm = { moto: 1.8, carro: 2.5, van: 4, bike: 1.2 }[VEIC] ?? 1.8;
  return money(Math.max(base + km * perkm, base));
}

async function main() {
  await c.connect();
  // lojas com saldo (coleta) e qualquer loja como destino — todos endereços reais
  const lojas = (await c.query(
    `select e.id, e.razao_social, e.endereco, e.lat, e.lng, e.saldo_carteira
       from estabelecimentos e join profiles p on p.id=e.profile_id join auth.users u on u.id=p.id
      where u.email like 'sim.est.%' and e.lat is not null`,
  )).rows;
  const comSaldo = lojas.filter((l) => Number(l.saldo_carteira) > 200);
  if (comSaldo.length < 1) { console.log("nenhuma loja com saldo > 200"); await c.end(); return; }

  let criados = 0;
  for (let i = 0; i < N; i++) {
    const A = pick(comSaldo);                 // coleta (tem saldo)
    let B = pick(lojas); let t = 0;
    while (B.id === A.id && t++ < 5) B = pick(lojas); // destino diferente
    const km = money(Math.max(0.6, distKm({ lat: +A.lat, lng: +A.lng }, { lat: +B.lat, lng: +B.lng })));
    const total = preco(km);
    if (Number(A.saldo_carteira) < total) continue;
    const pe = money(total * 0.8), pp = money(total - pe);
    const dur = Math.round(km * 2.5) + 5;
    try {
      const r = await c.query(
        `insert into pedidos (estabelecimento_id, coleta_endereco, coleta_lat, coleta_lng,
           entrega_endereco, entrega_lat, entrega_lng, cliente_final_nome, cliente_final_telefone,
           descricao, valor_declarado, vehicle_type, distancia_km, duracao_min,
           preco_total, preco_entregador, preco_plataforma, status)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'buscando') returning id`,
        [A.id, A.endereco, +A.lat, +A.lng, B.endereco, +B.lat, +B.lng,
          pick(NOMES), `(63) 9${ri(1000, 9999)}-${ri(1000, 9999)}`, pick(DESC), money(ri(40, 600)),
          VEIC, km, dur, total, pe, pp],
      );
      A.saldo_carteira = Number(A.saldo_carteira) - total; // espelha o débito p/ não estourar
      criados++;
      console.log(`#${criados} ${km.toFixed(1)}km R$${total.toFixed(2)} · ${A.razao_social} -> ${B.razao_social}`);
    } catch (e) {
      console.log("pulou:", e.message);
    }
  }

  // quantas ofertas saíram (o 1º já deve ter ido pro entregador online)
  const of = (await c.query(`select count(*) n from ofertas where status='ofertada' and expira_at>now()`)).rows[0].n;
  console.log(`\n=== onda: ${criados} pedidos ${VEIC} buscando | ofertas ativas agora: ${of} ===`);
  await c.end();
}
main().catch((e) => { console.error("ERRO:", e.message); process.exit(1); });
