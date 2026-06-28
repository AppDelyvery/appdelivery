// AppDelyvery — SEED EM MASSA (direct-SQL, bypassa rate-limit do GoTrue; conta idêntica à do signup).
// Cria auth.users + identities + profiles + estabelecimentos(fundeado) / entregadores(aprovado, online).
// Idempotente: pula email já existente. Uso: EST_N=200 ENT_N=30 node scripts/seed-massa.mjs
import { readFileSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const m = env.DATABASE_URL.match(/^postgres(?:ql)?:\/\/([^:]+):(.*)@([^:\/]+):(\d+)\/(.+)$/);
const client = new pg.Client({ user: m[1], password: m[2], host: m[3], port: +m[4], database: m[5], ssl: { rejectUnauthorized: false } });

const EST_N = +(process.env.EST_N || 200), ENT_N = +(process.env.ENT_N || 30);

// geradores (espelham scripts/sim-operacao.mjs)
const QUADRAS = [["Praça dos Girassóis, Centro", -10.1843, -48.3336], ["Q. 104 Norte, Av. JK", -10.166, -48.3345], ["Q. 108 Norte, Av. NS-2", -10.1605, -48.33], ["Q. 204 Norte, Av. LO-4", -10.17, -48.338], ["Q. 104 Sul, Alameda 5", -10.201, -48.332], ["Q. 204 Sul, Av. LO-5", -10.209, -48.33], ["Q. 304 Sul, Av. NS-2", -10.216, -48.329], ["Q. 404 Sul, Av. LO-9", -10.223, -48.327], ["Q. 1004 Sul, Av. Teotônio", -10.247, -48.327], ["ACSV-SE 12, Av. Joaquim T.", -10.23, -48.334], ["ARSE 32, Av. LO-7", -10.218, -48.336], ["ARSO 41, Conj. 2", -10.225, -48.342], ["Q. 506 Sul, Plano Diretor", -10.233, -48.325], ["Aureny III, Av. A", -10.27, -48.337], ["Taquaralto, Av. Tocantins", -10.301, -48.322], ["Jardim Aureny I, R. 5", -10.264, -48.34], ["Q. 405 Norte, Av. NS-4", -10.156, -48.326], ["Q. 712 Sul, Alameda 13", -10.239, -48.33], ["Setor Bela Vista", -10.195, -48.35], ["Setor Santa Fé, Q. 8", -10.255, -48.346]];
const TIPOS = [["Farmácia", ["Saúde Total", "Bem Estar", "Vida Plena", "Popular"]], ["Ótica", ["Visão Center", "Olhar Certo", "Premium", "do Povo"]], ["Restaurante", ["Sabor da Terra", "Tempero Goiano", "Cantina", "Prato Cheio"]], ["Padaria", ["Pão Quente", "Delícia", "do Trigo", "Estrela"]], ["Autopeças", ["Tocantins", "do Norte", "Veloz", "Central"]], ["Pet Shop", ["Mundo Animal", "Amigo Fiel", "Patas", "Bicho Feliz"]], ["Papelaria", ["Ideia", "Escolar", "do Estudante", "Criativa"]], ["Loja de Roupas", ["Boutique Bella", "Estilo", "Moda Mix", "Trend"]], ["Açaí", ["Tropical", "da Amazônia", "Gelado", "do Norte"]], ["Hamburgueria", ["Brasa", "Smash", "do Chef", "Artesanal"]], ["Mercadinho", ["Bom Preço", "Familiar", "da Esquina", "Econômico"]], ["Distribuidora", ["Tocantins", "Capital", "Norte", "Pop"]], ["Floricultura", ["Jardim", "Flor de Lis", "Girassol", "Primavera"]], ["Eletrônica", ["TechPalmas", "Digital", "Conserta Tudo", "Power"]]];
const NOMES = ["João Silva", "Maria Souza", "Pedro Lima", "Ana Costa", "Carlos Rocha", "Lucas Alves", "Bruno Dias", "Rafael Gomes", "Tiago Melo", "Marcos Reis", "Felipe Nunes", "Diego Pinto", "André Cruz", "Gustavo Sá", "Vitor Ramos", "Paulo Teles", "Rodrigo Maia", "Igor Castro", "Mateus Brito", "Caio Freitas", "Daniel Moraes", "Hugo Barros", "Renan Pires", "Léo Cardoso", "Otávio Luz", "Davi Antunes", "Enzo Faria", "Murilo Aragão", "Nathan Vidal", "Yuri Campos"];
const VEICULOS = ["moto", "moto", "moto", "moto", "moto", "moto", "carro", "carro", "van", "bike"];
const jit = () => (Math.random() - 0.5) * 0.008;
const nomeEstab = (i) => { const [t, s] = TIPOS[i % TIPOS.length]; return `${t} ${s[Math.floor(i / TIPOS.length) % s.length]} ${i + 1}`; };
const cnpj = (i) => { const n = String(10000000 + i * 137).padStart(8, "0"); return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/0001-${String((i * 7) % 90 + 10)}`; };
const fone = (i) => `63 9${String(8000 + i).padStart(4, "0")}-${String(1000 + (i * 3) % 9000)}`;

const META = (role, nome) => JSON.stringify({ role, nome });
const APP = '{"provider":"email","providers":["email"]}';
async function novoUser(email, role, nome) {
  const u = await client.query(
    `insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,confirmation_token,recovery_token,email_change_token_new,email_change)
     values ('00000000-0000-0000-0000-000000000000',gen_random_uuid(),'authenticated','authenticated',$1,crypt('Demo1234',gen_salt('bf')),now(),now(),now(),$2::jsonb,$3::jsonb,'','','','') returning id`,
    [email, APP, META(role, nome)]
  );
  const id = u.rows[0].id;
  await client.query(
    `insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
     values (gen_random_uuid(),$1,$2::uuid,json_build_object('sub',$3::text,'email',$1::text)::jsonb,'email',now(),now(),now())`,
    [email, id, id]
  );
  await client.query(`insert into profiles (id,role,nome) values ($1,$2,$3)`, [id, role, nome]);
  return id;
}

async function main() {
  await client.connect();
  // limpa órfãos (auth.users sim sem estab/entregador — restos de execução parcial)
  const orf = await client.query(`delete from auth.users where email ~ '^sim\\.(est|ent)\\.' and id not in (select profile_id from estabelecimentos union select profile_id from entregadores)`);
  if (orf.rowCount) console.log(`limpou ${orf.rowCount} órfão(s)`);
  let nE = 0, nD = 0;
  for (let i = 0; i < EST_N; i++) {
    const email = `sim.est.${i}@gmail.com`;
    if ((await client.query(`select 1 from auth.users where email=$1`, [email])).rowCount) continue;
    const q = QUADRAS[i % QUADRAS.length], nome = nomeEstab(i);
    const id = await novoUser(email, "estabelecimento", nome);
    await client.query(
      `insert into estabelecimentos (profile_id,razao_social,cnpj,endereco,lat,lng,telefone,saldo_carteira)
       values ($1,$2,$3,$4,$5,$6,$7,2000)`,
      [id, nome, cnpj(i), q[0], q[1] + jit(), q[2] + jit(), fone(i)]
    );
    nE++;
  }
  for (let i = 0; i < ENT_N; i++) {
    const email = `sim.ent.${i}@gmail.com`;
    if ((await client.query(`select 1 from auth.users where email=$1`, [email])).rowCount) continue;
    const nome = NOMES[i % NOMES.length], veh = VEICULOS[i % VEICULOS.length], q = QUADRAS[(i + 3) % QUADRAS.length];
    const id = await novoUser(email, "entregador", nome);
    await client.query(
      `insert into entregadores (profile_id,nome,cpf,vehicle_type,telefone,chave_pix,status,is_online,posicao,ultima_posicao_at)
       values ($1,$2,$3,$4::vehicle_type,$5,$6,'aprovado',true,ST_SetSRID(ST_MakePoint($7,$8),4326)::geography,now())`,
      [id, nome, String(10000000000 + i), veh, fone(i + 500), email, q[2] + jit(), q[1] + jit()]
    );
    nD++;
  }
  console.log(`seed-massa: +${nE} estab, +${nD} entregadores (idempotente — pulou os já existentes)`);
  await client.end();
}
main().catch((e) => { console.error("ERRO:", e.message); process.exit(1); });
