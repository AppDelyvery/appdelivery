// AppDelyvery — DRIVER da operação densa (contorna rate-limit: ≤31 logins cacheados).
// Pedidos via SQL (triggers cobrar/dispatch disparam no INSERT). Ciclo de vida via tokens de
// entregador (RPCs reais). Chat/disputa do cliente via tracking_token (anônimo). Admin resolve.
// RESUMÍVEL: PHASE=advance só empurra os pedidos em voo (não cria). Uso: PED_N=500 POOL=12 node scripts/sim-driver.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const U = env.NEXT_PUBLIC_SUPABASE_URL, K = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const m = env.DATABASE_URL.match(/^postgres(?:ql)?:\/\/([^:]+):(.*)@([^:\/]+):(\d+)\/(.+)$/);
const db = new pg.Client({ user: m[1], password: m[2], host: m[3], port: +m[4], database: m[5], ssl: { rejectUnauthorized: false } });

const PHASE = process.env.PHASE || "full";
const PED_N = +(process.env.PED_N || 500), POOL = +(process.env.POOL || 12);
const CACHE = new URL("../.tokens-sim.json", import.meta.url);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- REST (parse tolerante: void/204 -> null, texto -> string, json -> obj) ----------
const h = (tok) => ({ apikey: K, Authorization: `Bearer ${tok || K}`, "Content-Type": "application/json" });
const safe = async (r) => { const t = await r.text(); if (!t) return null; try { return JSON.parse(t); } catch { return t; } };
const rpc = (fn, tok, args) => fetch(`${U}/rest/v1/rpc/${fn}`, { method: "POST", headers: h(tok), body: JSON.stringify(args || {}) }).then(safe);
const post = (path, tok, body) => fetch(`${U}/rest/v1/${path}`, { method: "POST", headers: { ...h(tok), Prefer: "return=representation" }, body: JSON.stringify(body) }).then(safe);
const patch = (path, tok, body) => fetch(`${U}/rest/v1/${path}`, { method: "PATCH", headers: h(tok), body: JSON.stringify(body) }).then(safe);
const getRest = (path, tok) => fetch(`${U}/rest/v1/${path}`, { headers: h(tok) }).then(safe);
async function login(email, retries = 6) {
  for (let a = 0; a < retries; a++) {
    const r = await fetch(`${U}/auth/v1/token?grant_type=password`, { method: "POST", headers: h(), body: JSON.stringify({ email, password: "Demo1234" }) }).then(safe);
    if (r && r.access_token) return r.access_token;
    if (String(r?.error_code || r?.code || "").includes("rate")) { await sleep(60000); continue; }
    await sleep(1000);
  }
  return null;
}
async function pool(items, limit, fn) { const out = []; let i = 0; const w = async () => { while (i < items.length) { const k = i++; try { out[k] = await fn(items[k], k); } catch (e) { out[k] = { erro: e.message }; } } }; await Promise.all(Array.from({ length: Math.min(limit, items.length) }, w)); return out; }

const PRECO = { moto: [6.5, 1.7], bike: [5, 1.3], carro: [9, 2.4], van: [16, 3.4] };
const haversine = (a, b, c, d) => { const R = 6371, t = (x) => x * Math.PI / 180; const dLat = t(c - a), dLng = t(d - b); const hh = Math.sin(dLat / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dLng / 2) ** 2; return R * 2 * Math.asin(Math.sqrt(hh)); };
const VEHs = ["moto", "moto", "moto", "carro", "van", "bike"];
const FALAS = ["A caminho da coleta.", "Cheguei no local.", "Tudo certo, finalizando!"];

async function main() {
  await db.connect();
  console.log(`\n== DRIVER == phase=${PHASE} ped=${PED_N} pool=${POOL}`);

  // tokens (cache): admin + entregadores
  let cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
  async function tok(email) { if (cache[email]) return cache[email]; const t = await login(email); if (t) { cache[email] = t; writeFileSync(CACHE, JSON.stringify(cache)); } return t; }
  const admTok = await tok("demo.admin@gmail.com");
  if (!admTok) return console.error("admin login falhou");
  const entRows = (await db.query(`select e.id, e.vehicle_type, u.email from entregadores e join auth.users u on u.id=e.profile_id where u.email ~ '^sim\\.ent\\.' and e.status='aprovado' order by u.email`)).rows;
  const entById = {}; const entByVeh = {};
  for (const r of entRows) { const t = await tok(r.email); if (!t) continue; const o = { id: r.id, veh: r.vehicle_type, tok: t }; entById[r.id] = o; (entByVeh[r.vehicle_type] ||= []).push(o); }
  const allEnts = Object.values(entById);
  console.log(`tokens: admin + ${allEnts.length}/${entRows.length} entregadores`);
  if (!allEnts.length) return console.error("sem tokens — rate-limit; rode de novo em ~5min (cache acumula)");

  const stats = { criado: 0, falha: 0, entregue: 0, coletado: 0, aceito: 0, buscando: 0, cancelado: 0, chat: 0, avaliacao: 0, disputa: 0, saque: 0 };

  // criação (pula em PHASE=advance)
  if (PHASE !== "advance") {
    const estabs = (await db.query(`select e.id, e.lat, e.lng, e.endereco from estabelecimentos e join auth.users u on u.id=e.profile_id where u.email ~ '^sim\\.est\\.'`)).rows;
    for (let k = 0; k < PED_N; k++) {
      const est = estabs[k % estabs.length], veh = VEHs[k % VEHs.length], jr = () => (Math.random() - 0.5) * 0.03;
      const A = { lat: +est.lat, lng: +est.lng, end: est.endereco || "Coleta" }, B = { lat: +est.lat + jr(), lng: +est.lng + jr(), end: "Entrega Q. " + (100 + k % 900) };
      const km = Math.round(haversine(A.lat, A.lng, B.lat, B.lng) * 100) / 100 || 1.2, [b, pk] = PRECO[veh], total = Math.round((b + pk * km) * 100) / 100;
      try {
        await db.query(`insert into pedidos (estabelecimento_id,coleta_endereco,coleta_lat,coleta_lng,entrega_endereco,entrega_lat,entrega_lng,vehicle_type,status,distancia_km,preco_total,preco_entregador,preco_plataforma,cliente_final_nome,cliente_final_telefone) values ($1,$2,$3,$4,$5,$6,$7,$8::vehicle_type,'buscando',$9,$10,$11,$12,$13,$14)`,
          [est.id, A.end, A.lat, A.lng, B.end, B.lat, B.lng, veh, km, total, Math.round(total * 80) / 100, Math.round(total * 20) / 100, `Cliente ${k}`, `63 9${1000 + k % 8999}-0000`]);
        stats.criado++;
      } catch (e) { stats.falha++; if (stats.falha <= 2) console.log("  FALHA insert:", e.message.slice(0, 120)); }
    }
    console.log(`pedidos criados: ${stats.criado} (falha ${stats.falha})`);
  }

  // avança TODO pedido sim em voo (buscando/aceito/coletado) — resumível
  const inflight = (await db.query(`select p.id, p.status, p.entregador_id, p.tracking_token, p.vehicle_type from pedidos p join estabelecimentos e on e.id=p.estabelecimento_id join auth.users u on u.id=e.profile_id where u.email ~ '^sim\\.est\\.' and p.status in ('buscando','aceito','coletado') order by p.created_at`)).rows;
  console.log(`em voo p/ avançar: ${inflight.length}`);

  await pool(inflight, POOL, async (ped, k) => {
    const tgt = (k * 37) % 100; // distribuição-alvo
    let ent = ped.entregador_id ? entById[ped.entregador_id] : null;
    // 1) buscando -> aceito (se alvo não for ficar buscando)
    if (ped.status === "buscando") {
      if (tgt >= 92) { stats.buscando++; return; } // ~8% fica buscando
      const cand = entByVeh[ped.vehicle_type]?.length ? entByVeh[ped.vehicle_type] : allEnts;
      ent = cand[k % cand.length];
      const ac = await rpc("aceitar_corrida", ent.tok, { p_pedido_id: ped.id });
      if (ac !== "ok") { stats.buscando++; return; }
      ped.status = "aceito";
    }
    if (!ent) { stats.aceito++; return; }
    // chat 3-pontas (entregador token + cliente via tracking_token anônimo)
    await post("mensagens", ent.tok, { pedido_id: ped.id, autor_papel: "entregador", texto: FALAS[k % 3] });
    await rpc("enviar_mensagem_rastreio", null, { p_token: ped.tracking_token, p_texto: "Beleza, aguardando!" });
    stats.chat++;
    // 2) aceito -> coletado
    if (ped.status === "aceito") {
      if (tgt >= 82) { stats.aceito++; return; } // ~10% fica aceito
      const col = await rpc("registrar_coleta", ent.tok, { p_pedido_id: ped.id, p_foto_url: "https://sim/coleta.jpg" });
      if (col !== "ok") { stats.aceito++; return; }
      ped.status = "coletado";
    }
    // 3) coletado -> cancelado (fração) / entregue
    if (tgt >= 90) { await rpc("cancelar_corrida_entregador", ent.tok, { p_pedido_id: ped.id, p_motivo: "Cliente ausente." }); stats.cancelado++; return; }
    if (tgt >= 74) { stats.coletado++; return; } // ~16% fica coletado
    const cod = (await getRest(`pedidos?id=eq.${ped.id}&select=codigo_entrega`, ent.tok))[0]?.codigo_entrega;
    const en = await rpc("registrar_entrega", ent.tok, { p_pedido_id: ped.id, p_foto_url: "https://sim/entrega.jpg", p_assinatura_url: "https://sim/ass.png", p_codigo: cod });
    if (en !== "ok") { stats.coletado++; return; }
    stats.entregue++;
    await rpc("registrar_avaliacao", ent.tok, { p_pedido_id: ped.id, p_nota: 4 + (k % 2), p_comentario: "Loja organizada.", p_de_papel: "entregador" });
    stats.avaliacao++;
    if (k % 11 === 0) {
      const d = await rpc("abrir_disputa_rastreio", null, { p_token: ped.tracking_token, p_tipo: "Produto danificado", p_descricao: "Avaria na embalagem." });
      const dd = (await getRest(`disputas?pedido_id=eq.${ped.id}&select=id&limit=1`, admTok))[0];
      if (dd) { await patch(`disputas?id=eq.${dd.id}`, admTok, { status: "resolvida", resolucao: "Reembolso parcial; lojista orientado." }); stats.disputa++; }
    }
  });
  console.log("ciclo:", JSON.stringify(stats));

  // saques
  for (const ent of allEnts) {
    const saldo = +(await db.query(`select saldo from entregadores where id=$1`, [ent.id])).rows[0].saldo;
    if (saldo >= 35) { const r = await rpc("reservar_saque", ent.tok, { p_valor: Math.min(saldo, 60), p_chave_pix: "pix@sim" }); if (r && !["minimo", "saldo-insuficiente", "nao-e-entregador"].includes(String(r))) stats.saque++; }
  }
  console.log(`saques: ${stats.saque} reservados`);
  console.log("== fim ==\n");
  await db.end();
}
main().catch((e) => { console.error("ERRO FATAL:", e.message); process.exit(1); });
