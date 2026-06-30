// Simulação densa pra demo do Tulio: 200 negócios + 30 entregadores + 300 entregas
// + recargas + saques. Cria contas via SQL (auth.users + profiles), e deixa o dinheiro
// fluir DE VERDADE pelos triggers (cobrar_pedido / creditar_entregador / estornar_pedido).
// Guards e dispatch são desligados durante o seed e religados no fim.
// Contas com prefixo sim.est./sim.ent.@gmail.com -> limpáveis por scripts/cleanup-sim.sql.
// Uso: node scripts/sim-tulio.mjs
import { readFileSync } from "node:fs";
import crypto from "node:crypto";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const m = env.DATABASE_URL.match(/^postgres(?:ql)?:\/\/([^:]+):(.*)@([^:/]+):(\d+)\/(.+)$/);
const c = new pg.Client({ user: m[1], password: m[2], host: m[3], port: +m[4], database: m[5], ssl: { rejectUnauthorized: false } });

const q = (t, p) => c.query(t, p);
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const pick = (a) => a[ri(0, a.length - 1)];
const money = (n) => Math.round(n * 100) / 100;
const uuid = () => crypto.randomUUID();
const pastDate = () => new Date(Date.now() - ri(0, 30) * 86400000 - ri(0, 23) * 3600000 - ri(0, 59) * 60000);
const addMin = (d, min) => new Date(d.getTime() + min * 60000);

const TIPOS = ["Ótica", "Farmácia", "Drogaria", "Mercado", "Distribuidora", "Papelaria", "Petshop", "Auto Peças", "Floricultura", "Material de Construção", "Lanchonete", "Restaurante", "Boutique", "Joalheria", "Eletrônicos", "Açaí", "Padaria", "Loja de Roupas", "Perfumaria", "Sorveteria"];
const SOBRENOMES_NEG = ["Center", "Palmas", "do Lago", "Real", "Popular", "Express", "Premium", "da Praça", "Capital", "Sul", "Norte", "Bom Preço", "Cidade", "Encanto", "Aurora", "Girassol", "Primavera", "Vitória", "Esperança", "Ipê"];
const NOMES = ["João", "Maria", "Carlos", "Ana", "Pedro", "Lucas", "Marcos", "Paulo", "Rafael", "Bruno", "Felipe", "Gabriel", "Rodrigo", "Tiago", "Vitor", "Daniel", "Mateus", "Gustavo", "Leandro", "André", "Fernanda", "Juliana", "Camila", "Patrícia", "Renata", "Larissa", "Bianca", "Diego", "Igor", "Hugo"];
const SOBRENOMES = ["Silva", "Souza", "Oliveira", "Santos", "Pereira", "Lima", "Costa", "Rodrigues", "Almeida", "Nascimento", "Carvalho", "Araújo", "Ribeiro", "Gomes", "Martins", "Rocha", "Barbosa", "Cardoso", "Teixeira", "Moreira"];
const DESC = ["Documentos", "Peças automotivas", "Medicamentos", "Encomenda", "Material de escritório", "Óculos de grau", "Roupas", "Eletrônicos", "Amostras", "Presente", "Material de construção", "Peças"];

const digits = (n) => Array.from({ length: n }, () => ri(0, 9)).join("");
const cpf = () => `${digits(3)}.${digits(3)}.${digits(3)}-${digits(2)}`;
const cnpj = () => `${digits(2)}.${digits(3)}.${digits(3)}/0001-${digits(2)}`;
const phone = () => `(63) 9${digits(4)}-${digits(4)}`;
const placa = () => `${pick("ABCDEFGHIJ").repeat(1)}${pick("ABCDEFG")}${pick("HIJKLM")}${ri(0, 9)}${pick("ABCDEFGHIJ")}${ri(0, 9)}${ri(0, 9)}`;
const enderecoPalmas = () => `Quadra ${ri(102, 1212)} ${pick(["Sul", "Norte"])}, Alameda ${ri(1, 40)}, Palmas - TO`;
const coordPalmas = () => ({ lat: money(rnd(-10.30, -10.16)), lng: money(rnd(-48.38, -48.30)) });
const VEH_W = [...Array(60).fill("moto"), ...Array(25).fill("carro"), ...Array(10).fill("van"), ...Array(5).fill("bike")];
const precoFor = (v, km) => {
  const base = { moto: 5, carro: 8, van: 15, bike: 4 }[v];
  const perkm = { moto: 1.8, carro: 2.5, van: 4, bike: 1.2 }[v];
  return money(base + km * perkm);
};
const cnhFor = (v) => (v === "bike" ? null : v === "moto" ? "A" : pick(["B", "AB"]));

async function mkUser(email, role, nome, telefone) {
  const id = uuid();
  await q(
    `insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data)
     values ('00000000-0000-0000-0000-000000000000',$1,'authenticated','authenticated',$2,crypt('Demo1234',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}',$3)`,
    [id, email, JSON.stringify({ nome, role })],
  );
  await q(`insert into profiles (id, role, nome, telefone) values ($1,$2,$3,$4)`, [id, role, nome, telefone]);
  return id;
}

const GUARDS_PEDIDO = ["trg_guard_pedido_status", "trg_pedido_dispatch", "trg_webhook_status", "trg_status_push"];

async function main() {
  await c.connect();
  await q("begin");
  try {
    await q("update config set cobranca_ativa=true where id=1");
    for (const t of GUARDS_PEDIDO) await q(`alter table pedidos disable trigger ${t}`);
    await q("alter table entregadores disable trigger trg_guard_entregador");

    // ENTREGADORES (30) — aprovados
    const ents = [];
    for (let i = 0; i < 30; i++) {
      const nome = `${pick(NOMES)} ${pick(SOBRENOMES)}`;
      const tel = phone();
      const veh = pick(VEH_W);
      const pid = await mkUser(`sim.ent.${i}@gmail.com`, "entregador", nome, tel);
      const r = await q(
        `insert into entregadores (profile_id,nome,cpf,vehicle_type,placa,cnh_categoria,status,is_online,chave_pix,rating,telefone,created_at)
         values ($1,$2,$3,$4,$5,$6,'aprovado',$7,$8,$9,$10,$11) returning id`,
        [pid, nome, cpf(), veh, placa(), cnhFor(veh), Math.random() < 0.4, tel, money(rnd(4.3, 5)), tel, pastDate()],
      );
      ents.push({ id: r.rows[0].id, veh });
    }

    // ESTABELECIMENTOS (200) — com saldo + recarga
    const estabs = [];
    for (let i = 0; i < 200; i++) {
      const nome = `${pick(TIPOS)} ${pick(SOBRENOMES_NEG)}`;
      const tel = phone();
      const co = coordPalmas();
      const endereco = enderecoPalmas();
      const saldo = money(ri(500, 2000));
      const pid = await mkUser(`sim.est.${i}@gmail.com`, "estabelecimento", nome, tel);
      const r = await q(
        `insert into estabelecimentos (profile_id,razao_social,cnpj,endereco,lat,lng,telefone,saldo_carteira,rating,created_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
        [pid, nome, cnpj(), endereco, co.lat, co.lng, tel, saldo, money(rnd(4.4, 5)), pastDate()],
      );
      const estId = r.rows[0].id;
      const dt = pastDate();
      await q(`insert into recargas (estabelecimento_id,valor,status,pago_at,created_at) values ($1,$2,'pago',$3,$3)`, [estId, saldo, dt]);
      estabs.push({ id: estId, co, endereco });
    }

    // PEDIDOS (300) — ciclo real via triggers
    const tally = {};
    for (let i = 0; i < 300; i++) {
      const est = pick(estabs);
      const ent = pick(ents);
      const veh = ent.veh;
      const km = money(rnd(1, 12));
      const dur = Math.round(km * 2.5) + 5;
      const total = precoFor(veh, km);
      const pe = money(total * 0.8);
      const pp = money(total - pe);
      const created = pastDate();
      const dco = coordPalmas();
      // insere como 'buscando' -> cobrar_pedido debita a carteira
      const r = await q(
        `insert into pedidos (estabelecimento_id,coleta_endereco,coleta_lat,coleta_lng,entrega_endereco,entrega_lat,entrega_lng,
           cliente_final_nome,cliente_final_telefone,descricao,valor_declarado,vehicle_type,distancia_km,duracao_min,
           preco_total,preco_entregador,preco_plataforma,status,created_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'buscando',$18) returning id`,
        [est.id, est.endereco, est.co.lat, est.co.lng, enderecoPalmas(), dco.lat, dco.lng,
          `${pick(NOMES)} ${pick(SOBRENOMES)}`, phone(), pick(DESC), money(ri(50, 800)), veh, km, dur,
          total, pe, pp, created],
      );
      const pid = r.rows[0].id;
      const roll = Math.random();
      let status;
      if (roll < 0.72) status = "entregue";
      else if (roll < 0.80) status = "cancelado";
      else if (roll < 0.87) status = "buscando";
      else status = pick(["aceito", "a_caminho_coleta", "coletado", "a_caminho_entrega"]);
      tally[status] = (tally[status] || 0) + 1;

      if (status === "buscando") continue; // já debitado, aguardando entregador

      const aceito = addMin(created, ri(1, 5));
      const coletado = addMin(aceito, ri(8, 20));
      const entregue = addMin(coletado, ri(10, 40));

      if (status === "cancelado") {
        await q(`insert into cancelamentos (pedido_id,por,motivo,created_at) values ($1,$2,'simulação',$3)`, [pid, pick(["estabelecimento", "entregador", "cliente"]), created]);
        await q(`update pedidos set status='cancelado' where id=$1`, [pid]); // estornar devolve
        continue;
      }

      // estados com entregador designado
      const ts = { aceito_at: aceito };
      if (["coletado", "a_caminho_entrega", "entregue"].includes(status)) ts.coletado_at = coletado;
      if (status === "entregue") ts.entregue_at = entregue;
      await q(
        `update pedidos set status=$1, entregador_id=$2, aceito_at=$3, coletado_at=$4, entregue_at=$5 where id=$6`,
        [status, ent.id, ts.aceito_at, ts.coletado_at ?? null, ts.entregue_at ?? null, pid],
      ); // se entregue -> creditar_entregador credita 80% + cria pagamento

      if (status === "entregue") {
        await q(`insert into comprovantes (pedido_id,tipo,foto_url,lat,lng,created_at) values ($1,'coleta','sim://foto-coleta',$2,$3,$4)`, [pid, est.co.lat, est.co.lng, coletado]);
        await q(`insert into comprovantes (pedido_id,tipo,foto_url,assinatura_url,lat,lng,created_at) values ($1,'entrega','sim://foto-entrega','sim://assinatura',$2,$3,$4)`, [pid, dco.lat, dco.lng, entregue]);
        await q(`insert into avaliacoes (pedido_id,nota,de_papel,created_at) values ($1,$2,'cliente',$3)`, [pid, ri(4, 5), entregue]);
      }
    }

    // SAQUES — entregadores com saldo sacam parte
    const sal = await q(`select id, saldo, chave_pix from entregadores where status='aprovado' and saldo > 80`);
    let saques = 0;
    for (const e of sal.rows) {
      if (Math.random() < 0.4) continue;
      const valor = money(Number(e.saldo) * rnd(0.3, 0.8));
      const st = pick(["concluido", "processando", "processando"]);
      await q(`insert into saques (entregador_id,valor,chave_pix,status,created_at) values ($1,$2,$3,$4,$5)`, [e.id, valor, e.chave_pix || phone(), st, pastDate()]);
      if (st === "concluido") await q(`update entregadores set saldo = saldo - $1 where id=$2`, [valor, e.id]);
      saques++;
    }

    for (const t of GUARDS_PEDIDO) await q(`alter table pedidos enable trigger ${t}`);
    await q("alter table entregadores enable trigger trg_guard_entregador");
    await q("commit");
    console.log("=== SIMULAÇÃO OK ===");
    console.log("entregadores:", ents.length, "| estabelecimentos:", estabs.length);
    console.log("pedidos por status:", JSON.stringify(tally));
    console.log("saques:", saques);
  } catch (e) {
    await q("rollback");
    console.error("ERRO -> rollback:", e.message);
    process.exitCode = 1;
  } finally {
    await c.end();
  }
}
main();
