// AppDelyvery — MOTOR DE SIMULAÇÃO (operação densa em Palmas-TO).
// Dirige a plataforma pelos FLUXOS REAIS: /auth/v1/signup + PostgREST + RPCs, autenticado como
// cada usuário (RLS valendo, triggers disparando — cobrar_pedido, creditar_entregador 80/20, estorno).
// NÃO faz raw-insert de regra de negócio. Tudo com prefixo `sim.` → limpeza por scripts/cleanup-sim.sql.
//
// Uso:
//   PHASE=accounts EST_N=2 ENT_N=2 node scripts/sim-operacao.mjs
//   PHASE=operacao EST_N=2 ENT_N=2 PED_N=4 node scripts/sim-operacao.mjs
//   PHASE=all      EST_N=2 ENT_N=2 PED_N=4 node scripts/sim-operacao.mjs   (accounts→fund→operacao)
//
// Idempotente: signup que já existe cai pra login. Indexado por sim.est.<i> / sim.ent.<i>.
import { readFileSync } from "node:fs";

// ---------- env (.env.local) ----------
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const U = env.NEXT_PUBLIC_SUPABASE_URL;
const K = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!U || !K) { console.error("FALTA NEXT_PUBLIC_SUPABASE_URL / ANON_KEY no .env.local"); process.exit(1); }

const PHASE = process.env.PHASE || "all";
const EST_N = +(process.env.EST_N || 2);
const ENT_N = +(process.env.ENT_N || 2);
const PED_N = +(process.env.PED_N || 4);
const EST_OFF = +(process.env.EST_OFF || 0); // offset p/ fatias disjuntas entre agentes
const ENT_OFF = +(process.env.ENT_OFF || 0);
const POOL = +(process.env.POOL || 12); // concorrência do loop de pedidos
const SENHA = "Demo1234";
const ADMIN = { email: "demo.admin@gmail.com", senha: "Demo1234" };

// ---------- http ----------
const h = (tok) => ({ apikey: K, Authorization: `Bearer ${tok || K}`, "Content-Type": "application/json" });
const rep = (tok) => ({ ...h(tok), Prefer: "return=representation" });
const j = (r) => r.json();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function signup(email, role, nome) {
  for (let a = 0; a < 4; a++) {
    const s = await fetch(`${U}/auth/v1/signup`, { method: "POST", headers: h(), body: JSON.stringify({ email, password: SENHA, data: { role, nome } }) }).then(j);
    if (s.access_token) return { tok: s.access_token, uid: s.user.id, novo: true };
    const msg = String(s.msg || s.error_description || s.error_code || s.code || "").toLowerCase();
    if (msg.includes("registered") || msg.includes("already")) return null; // já existe → caller faz login
    await sleep(800 * (a + 1)); // rate-limit / transitório → backoff
  }
  return null;
}
async function login(email, senha = SENHA) {
  const s = await fetch(`${U}/auth/v1/token?grant_type=password`, { method: "POST", headers: h(), body: JSON.stringify({ email, password: senha }) }).then(j);
  return s.access_token ? { tok: s.access_token, uid: s.user.id } : null;
}
const post = (path, tok, body) => fetch(`${U}/rest/v1/${path}`, { method: "POST", headers: rep(tok), body: JSON.stringify(body) }).then(j);
const patch = (path, tok, body) => fetch(`${U}/rest/v1/${path}`, { method: "PATCH", headers: rep(tok), body: JSON.stringify(body) }).then(j);
const get = (path, tok) => fetch(`${U}/rest/v1/${path}`, { headers: h(tok) }).then(j);
const rpc = (fn, tok, args) => fetch(`${U}/rest/v1/rpc/${fn}`, { method: "POST", headers: h(tok), body: JSON.stringify(args || {}) }).then(j);

// pool de concorrência
async function pool(items, limit, fn) {
  const out = []; let i = 0;
  const work = async () => { while (i < items.length) { const k = i++; try { out[k] = await fn(items[k], k); } catch (e) { out[k] = { erro: e.message }; } } };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, work));
  return out;
}

// ---------- dados reais de Palmas-TO (quadras + coords âncora) ----------
const QUADRAS = [
  ["Praça dos Girassóis, Centro", -10.1843, -48.3336], ["Q. 104 Norte, Av. JK", -10.1660, -48.3345],
  ["Q. 108 Norte, Av. NS-2", -10.1605, -48.3300], ["Q. 204 Norte, Av. LO-4", -10.1700, -48.3380],
  ["Q. 104 Sul, Alameda 5", -10.2010, -48.3320], ["Q. 204 Sul, Av. LO-5", -10.2090, -48.3300],
  ["Q. 304 Sul, Av. NS-2", -10.2160, -48.3290], ["Q. 404 Sul, Av. LO-9", -10.2230, -48.3270],
  ["Q. 1004 Sul, Av. Teotônio", -10.2470, -48.3270], ["ACSV-SE 12, Av. Joaquim T.", -10.2300, -48.3340],
  ["ARSE 32, Av. LO-7", -10.2180, -48.3360], ["ARSO 41, Conj. 2", -10.2250, -48.3420],
  ["Plano Diretor Sul, Q. 506 Sul", -10.2330, -48.3250], ["Aureny III, Av. A", -10.2700, -48.3370],
  ["Taquaralto, Av. Tocantins", -10.3010, -48.3220], ["Jardim Aureny I, R. 5", -10.2640, -48.3400],
  ["Q. 405 Norte, Av. NS-4", -10.1560, -48.3260], ["Q. 712 Sul, Alameda 13", -10.2390, -48.3300],
  ["Setor Bela Vista, R. das Mangueiras", -10.1950, -48.3500], ["Setor Santa Fé, Q. 8", -10.2550, -48.3460],
];
const TIPOS = [
  ["Farmácia", ["Saúde Total", "Bem Estar", "Vida Plena", "Drogal", "Popular"]],
  ["Ótica", ["Visão Center", "Olhar Certo", "Premium", "do Povo"]],
  ["Restaurante", ["Sabor da Terra", "Tempero Goiano", "Cantina", "Prato Cheio"]],
  ["Padaria", ["Pão Quente", "Delícia", "do Trigo", "Estrela"]],
  ["Autopeças", ["Tocantins", "do Norte", "Veloz", "Central"]],
  ["Pet Shop", ["Mundo Animal", "Amigo Fiel", "Patas", "Bicho Feliz"]],
  ["Papelaria", ["Ideia", "Escolar", "do Estudante", "Criativa"]],
  ["Loja de Roupas", ["Boutique Bella", "Estilo", "Moda Mix", "Trend"]],
  ["Açaí", ["Tropical", "da Amazônia", "Gelado", "do Norte"]],
  ["Hamburgueria", ["Brasa", "Smash", "do Chef", "Artesanal"]],
  ["Mercadinho", ["Bom Preço", "Familiar", "da Esquina", "Econômico"]],
  ["Distribuidora", ["Tocantins", "Capital", "Norte", "Pop"]],
  ["Floricultura", ["Jardim", "Flor de Lis", "Girassol", "Primavera"]],
  ["Eletrônica", ["TechPalmas", "Digital", "Conserta Tudo", "Power"]],
];
const NOMES = ["João Silva", "Maria Souza", "Pedro Lima", "Ana Costa", "Carlos Rocha", "Lucas Alves", "Bruno Dias", "Rafael Gomes", "Tiago Melo", "Marcos Reis", "Felipe Nunes", "Diego Pinto", "André Cruz", "Gustavo Sá", "Vitor Ramos", "Paulo Teles", "Rodrigo Maia", "Igor Castro", "Mateus Brito", "Caio Freitas", "Daniel Moraes", "Hugo Barros", "Renan Pires", "Léo Cardoso", "Otávio Luz", "Davi Antunes", "Enzo Faria", "Murilo Aragão", "Nathan Vidal", "Yuri Campos"];
const VEICULOS = ["moto", "moto", "moto", "moto", "moto", "moto", "carro", "carro", "van", "bike"]; // distribuição realista

const jitter = () => (Math.random() - 0.5) * 0.008;
function endereco(i) { const q = QUADRAS[i % QUADRAS.length]; return { end: q[0], lat: q[1] + jitter(), lng: q[2] + jitter() }; }
function nomeEstab(i) { const [tipo, sufs] = TIPOS[i % TIPOS.length]; return `${tipo} ${sufs[(Math.floor(i / TIPOS.length)) % sufs.length]} ${i + 1}`; }
function cnpj(i) { const n = String(10000000 + i * 137).padStart(8, "0"); return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/0001-${String((i * 7) % 90 + 10)}`; }
const fone = (i) => `63 9${String(8000 + i).padStart(4, "0")}-${String(1000 + (i * 3) % 9000)}`;
const haversine = (a, b, c, d) => { const R = 6371, t = (x) => x * Math.PI / 180; const dLat = t(c - a), dLng = t(d - b); const h = Math.sin(dLat / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dLng / 2) ** 2; return R * 2 * Math.asin(Math.sqrt(h)); };
const PRECO = { moto: [6.5, 1.7], bike: [5, 1.3], carro: [9, 2.4], van: [16, 3.4] };
function preco(veh, km) { const [b, pk] = PRECO[veh]; const total = Math.round((b + pk * km) * 100) / 100; return { total, ent: Math.round(total * 80) / 100, plat: Math.round(total * 20) / 100 }; }

// ---------- contas ----------
async function criarEstab(i) {
  const email = `sim.est.${i}@gmail.com`, nome = nomeEstab(i);
  let a = await signup(email, "estabelecimento", nome);
  if (!a) { a = await login(email); if (!a) return { erro: "login falhou " + email }; }
  if (a.novo) {
    await post("profiles", a.tok, { id: a.uid, role: "estabelecimento", nome });
    const e = endereco(i);
    await post("estabelecimentos", a.tok, { profile_id: a.uid, razao_social: nome, cnpj: cnpj(i), endereco: e.end, lat: e.lat, lng: e.lng, telefone: fone(i) });
  }
  return { i, email, tok: a.tok, uid: a.uid };
}
async function criarEnt(i, admTok) {
  const email = `sim.ent.${i}@gmail.com`, nome = NOMES[i % NOMES.length], veh = VEICULOS[i % VEICULOS.length];
  let a = await signup(email, "entregador", nome);
  if (!a) { a = await login(email); if (!a) return { erro: "login falhou " + email }; }
  let entId;
  if (a.novo) {
    await post("profiles", a.tok, { id: a.uid, role: "entregador", nome });
    const e = endereco(i + 3);
    const r = await post("entregadores", a.tok, { profile_id: a.uid, nome, cpf: String(10000000000 + i), vehicle_type: veh, telefone: fone(i + 500), chave_pix: email });
    entId = r[0]?.id;
    if (entId) await patch(`entregadores?id=eq.${entId}`, admTok, { status: "aprovado" }); // admin aprova (fluxo real)
  } else {
    const r = await get(`entregadores?profile_id=eq.${a.uid}&select=id`, admTok);
    entId = r[0]?.id;
  }
  return { i, email, tok: a.tok, uid: a.uid, entId, veh };
}

// ---------- interações (chat 3-pontas, avaliação D+1, disputa resolvida) ----------
const FALAS_EST = ["Pode coletar na recepção, por favor.", "Pedido pronto pra retirada.", "Obrigado pela agilidade!"];
const FALAS_ENT = ["A caminho da coleta.", "Cheguei no local da coleta.", "Entrega concluída, valeu!"];
async function chatPedido(ped, estTok, entTok, k) {
  await post("mensagens", estTok, { pedido_id: ped.id, autor_papel: "estabelecimento", texto: FALAS_EST[k % 3] });
  await post("mensagens", entTok, { pedido_id: ped.id, autor_papel: "entregador", texto: FALAS_ENT[k % 3] });
}
async function avaliar(ped, estTok, entTok, k) {
  await rpc("registrar_avaliacao", estTok, { p_pedido_id: ped.id, p_nota: 4 + (k % 2), p_comentario: "Entregador atencioso.", p_de_papel: "estabelecimento" });
  await rpc("registrar_avaliacao", entTok, { p_pedido_id: ped.id, p_nota: 5, p_comentario: "Loja organizada.", p_de_papel: "entregador" });
}
async function disputaResolvida(ped, estTok, uidEst, admTok) {
  const d = await post("disputas", estTok, { pedido_id: ped.id, aberta_por: uidEst, papel: "estabelecimento", tipo: "Atraso na coleta", descricao: "Entregador demorou pra chegar; cliente reclamou." });
  const did = Array.isArray(d) ? d[0]?.id : null;
  if (did) await patch(`disputas?id=eq.${did}`, admTok, { status: "resolvida", resolucao: "Orientado o entregador; caso encerrado com cortesia ao lojista." });
  return !!did;
}

// ---------- main ----------
async function main() {
  console.log(`\n== SIM Palmas == phase=${PHASE} est=${EST_N}(+${EST_OFF}) ent=${ENT_N}(+${ENT_OFF}) ped=${PED_N}`);
  const adm = await login(ADMIN.email, ADMIN.senha);
  if (!adm) return console.error("admin login falhou — confere demo.admin@gmail.com");

  const estIdx = Array.from({ length: EST_N }, (_, k) => k + EST_OFF);
  const entIdx = Array.from({ length: ENT_N }, (_, k) => k + ENT_OFF);

  if (PHASE === "accounts" || PHASE === "all") {
    const ests = await pool(estIdx, 10, (i) => criarEstab(i));
    const ents = await pool(entIdx, 8, (i) => criarEnt(i, adm.tok));
    const okE = ests.filter((x) => x?.tok).length, okD = ents.filter((x) => x?.entId).length;
    console.log(`contas: ${okE}/${EST_N} estab, ${okD}/${ENT_N} entregadores aprovados`);
    const erros = [...ests, ...ents].filter((x) => x?.erro);
    if (erros.length) console.log("erros:", erros.slice(0, 3).map((e) => e.erro));
    if (PHASE === "accounts") return;
  }

  // operacao: carrega contas (login por índice), cria pedidos e roda o ciclo
  const ests = (await pool(estIdx, 10, async (i) => { const a = await login(`sim.est.${i}@gmail.com`); if (!a) return null; const e = await get(`estabelecimentos?profile_id=eq.${a.uid}&select=id`, a.tok); return e[0] ? { tok: a.tok, estId: e[0].id, uid: a.uid, i } : null; })).filter(Boolean);
  const ents = (await pool(entIdx, 8, async (i) => { const a = await login(`sim.ent.${i}@gmail.com`); if (!a) return null; const e = await get(`entregadores?profile_id=eq.${a.uid}&select=id,vehicle_type,status`, adm.tok); return e[0] ? { tok: a.tok, entId: e[0].id, veh: e[0].vehicle_type, status: e[0].status, i } : null; })).filter(Boolean);
  console.log(`operação: ${ests.length} lojas, ${ents.length} entregadores ativos`);
  if (!ests.length || !ents.length) return console.error("sem contas — rode PHASE=accounts primeiro");

  // estado-alvo por pedido (distribuição realista)
  const alvo = (k) => { const r = (k * 37) % 100; if (r < 62) return "entregue"; if (r < 72) return "coletado"; if (r < 80) return "aceito"; if (r < 92) return "buscando"; return "cancelado"; };
  const stats = { criado: 0, entregue: 0, coletado: 0, aceito: 0, buscando: 0, cancelado: 0, falha: 0, chat: 0, avaliacao: 0, disputa: 0 };

  await pool(Array.from({ length: PED_N }, (_, k) => k), POOL, async (k) => {
    const est = ests[k % ests.length];
    const A = endereco(k), B = endereco(k + 7);
    const veh = VEICULOS[k % VEICULOS.length];
    const km = Math.round(haversine(A.lat, A.lng, B.lat, B.lng) * 100) / 100 || 1.5;
    const p = preco(veh, km);
    const body = { estabelecimento_id: est.estId, coleta_endereco: A.end, coleta_lat: A.lat, coleta_lng: A.lng, entrega_endereco: B.end, entrega_lat: B.lat, entrega_lng: B.lng, vehicle_type: veh, status: "buscando", distancia_km: km, preco_total: p.total, preco_entregador: p.ent, preco_plataforma: p.plat, cliente_final_nome: `Cliente ${k}`, cliente_final_telefone: fone(k + 9000) };
    // criação com retry (race de débito concorrente na mesma loja é transitória)
    let ped = null, last = null;
    for (let a = 0; a < 3 && !ped; a++) { const r = await post("pedidos", est.tok, body); ped = Array.isArray(r) ? r[0] : null; if (!ped) { last = r; await sleep(200 + a * 250); } }
    if (!ped?.id) { stats.falha++; if (stats.falha <= 2) console.log("  FALHA criar pedido:", JSON.stringify(last).slice(0, 220)); return; }
    stats.criado++;
    const meta = alvo(k);
    if (meta === "buscando") { stats.buscando++; return; }
    // entregador do mesmo veículo aceita (fluxo real: aceitar_corrida atômico)
    const cand = ents.filter((e) => e.veh === veh); const ent = (cand.length ? cand : ents)[k % (cand.length || ents.length)];
    const ac = await rpc("aceitar_corrida", ent.tok, { p_pedido_id: ped.id });
    if (ac !== "ok") { stats.buscando++; return; }
    await chatPedido(ped, est.tok, ent.tok, k); stats.chat++; // conversa 3-pontas
    if (meta === "aceito") { stats.aceito++; return; }
    const col = await rpc("registrar_coleta", ent.tok, { p_pedido_id: ped.id, p_foto_url: "https://sim/coleta.jpg" });
    if (col !== "ok") { stats.aceito++; return; }
    if (meta === "cancelado") { await rpc("cancelar_corrida_entregador", ent.tok, { p_pedido_id: ped.id, p_motivo: "Cliente ausente no endereço." }); stats.cancelado++; return; }
    if (meta === "coletado") { stats.coletado++; return; }
    const cod = (await get(`pedidos?id=eq.${ped.id}&select=codigo_entrega`, ent.tok))[0]?.codigo_entrega;
    const en = await rpc("registrar_entrega", ent.tok, { p_pedido_id: ped.id, p_foto_url: "https://sim/entrega.jpg", p_assinatura_url: "https://sim/ass.png", p_codigo: cod });
    if (en !== "ok") { stats.coletado++; return; }
    stats.entregue++;
    await avaliar(ped, est.tok, ent.tok, k); stats.avaliacao++; // avaliação D+1 nos 2 sentidos
    if (k % 9 === 0) { if (await disputaResolvida(ped, est.tok, est.uid, adm.tok)) stats.disputa++; } // disputa aberta e resolvida pelo admin
  });
  console.log("pedidos:", JSON.stringify(stats));

  // saques: ~metade dos entregadores com saldo saca (fluxo real reservar_saque)
  let saques = 0;
  for (const ent of ents.filter((_, n) => n % 2 === 0)) {
    const e = (await get(`entregadores?id=eq.${ent.entId}&select=saldo`, adm.tok))[0];
    const saldo = +(e?.saldo || 0);
    if (saldo >= 35) { const r = await rpc("reservar_saque", ent.tok, { p_valor: Math.min(saldo, 50), p_chave_pix: ent.email || `sim.ent.${ent.i}@gmail.com` }); if (r && !["minimo", "saldo-insuficiente", "nao-e-entregador"].includes(String(r))) saques++; }
  }
  console.log(`saques: ${saques} reservados`);
  console.log("== fim ==\n");
}
main().catch((e) => console.error("ERRO FATAL:", e.message));
