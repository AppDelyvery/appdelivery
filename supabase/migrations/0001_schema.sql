-- APPDELYVERY — schema base (v1). Rodar no SQL Editor do Supabase.
-- Fonte: build-spec/02-BANCO-DADOS.md. Postgres + PostGIS + RLS.

-- 0. Extensões
create extension if not exists postgis;   -- geoespacial (matching por proximidade)
create extension if not exists pgcrypto;  -- uuid + PIN supervisor

-- 1. Enums
create type user_role        as enum ('estabelecimento','entregador','admin','operador');
create type vehicle_type     as enum ('moto','carro','bike');
create type entregador_status as enum ('cadastro','em_verificacao','aprovado','recusado','suspenso');
create type pedido_status    as enum ('rascunho','buscando','aceito','a_caminho_coleta','coletado','a_caminho_entrega','entregue','cancelado');
create type oferta_status    as enum ('ofertada','aceita','recusada','expirada');
create type verif_tipo       as enum ('antecedentes','cnh','crlv','identidade');
create type verif_resultado  as enum ('pendente','aprovado','reprovado');
create type pag_metodo       as enum ('pix','cartao','carteira','fatura');
create type pag_status       as enum ('pendente','pago','repassado','estornado');

-- 2. Tabelas
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null,
  nome        text not null,
  telefone    text,
  created_at  timestamptz default now()
);

create table estabelecimentos (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  razao_social  text not null,
  cnpj          text,
  endereco      text,
  lat           double precision,
  lng           double precision,
  telefone      text,
  saldo_carteira numeric(10,2) default 0,
  plano         text default 'prepago',
  created_at    timestamptz default now()
);

create table entregadores (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references profiles(id) on delete cascade,
  nome            text not null,
  cpf             text not null,
  vehicle_type    vehicle_type not null,
  placa           text,
  cnh_categoria   text,
  status          entregador_status default 'cadastro',
  is_online       boolean default false,
  posicao         geography(Point,4326),
  ultima_posicao_at timestamptz,
  asaas_subconta_id text,
  rating          numeric(2,1) default 5.0,
  total_entregas  int default 0,
  created_at      timestamptz default now()
);
create index entregadores_posicao_gix on entregadores using gist (posicao);
create index entregadores_online_ix on entregadores (is_online) where is_online = true;

create table entregador_documentos (
  id            uuid primary key default gen_random_uuid(),
  entregador_id uuid not null references entregadores(id) on delete cascade,
  tipo          text not null,
  url           text not null,
  enviado_at    timestamptz default now()
);

create table verificacoes (
  id            uuid primary key default gen_random_uuid(),
  entregador_id uuid not null references entregadores(id) on delete cascade,
  tipo          verif_tipo not null,
  resultado     verif_resultado default 'pendente',
  provedor      text,
  payload       jsonb,                    -- LGPD: acesso só admin
  criado_at     timestamptz default now(),
  aprovado_por  uuid references profiles(id)
);

create table pedidos (
  id                 uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references estabelecimentos(id),
  entregador_id      uuid references entregadores(id),
  coleta_endereco    text not null,
  coleta_lat         double precision not null,
  coleta_lng         double precision not null,
  entrega_endereco   text not null,
  entrega_lat        double precision not null,
  entrega_lng        double precision not null,
  cliente_final_nome     text,
  cliente_final_telefone text,
  descricao          text,
  valor_declarado    numeric(10,2),
  vehicle_type       vehicle_type not null default 'moto',
  distancia_km       numeric(6,2),
  duracao_min        int,
  preco_total        numeric(10,2),
  preco_entregador   numeric(10,2),
  preco_plataforma   numeric(10,2),
  rota_geojson       jsonb,
  status             pedido_status default 'rascunho',
  tracking_token     uuid default gen_random_uuid() unique,
  created_at         timestamptz default now(),
  aceito_at          timestamptz,
  coletado_at        timestamptz,
  entregue_at        timestamptz
);
create index pedidos_estab_ix on pedidos (estabelecimento_id);
create index pedidos_entregador_ix on pedidos (entregador_id);
create index pedidos_status_ix on pedidos (status);

create table ofertas (
  id            uuid primary key default gen_random_uuid(),
  pedido_id     uuid not null references pedidos(id) on delete cascade,
  entregador_id uuid not null references entregadores(id),
  status        oferta_status default 'ofertada',
  ofertada_at   timestamptz default now(),
  respondida_at timestamptz
);

create table rastreios (
  id            uuid primary key default gen_random_uuid(),
  pedido_id     uuid not null references pedidos(id) on delete cascade,
  lat           double precision not null,
  lng           double precision not null,
  created_at    timestamptz default now()
);

create table comprovantes (
  id          uuid primary key default gen_random_uuid(),
  pedido_id   uuid not null references pedidos(id) on delete cascade,
  tipo        text not null,              -- coleta | entrega
  foto_url    text,
  assinatura_url text,
  lat         double precision,
  lng         double precision,
  created_at  timestamptz default now()
);

create table pagamentos (
  id              uuid primary key default gen_random_uuid(),
  pedido_id       uuid not null references pedidos(id),
  metodo          pag_metodo not null,
  valor           numeric(10,2) not null,
  taxa            numeric(10,2) default 0,
  status          pag_status default 'pendente',
  asaas_payment_id text,
  split_payload   jsonb,
  pago_at         timestamptz,
  repassado_at    timestamptz
);

create table avaliacoes (
  id          uuid primary key default gen_random_uuid(),
  pedido_id   uuid not null references pedidos(id),
  nota        int check (nota between 1 and 5),
  comentario  text,
  created_at  timestamptz default now()
);

create table carteira_transacoes (
  id                 uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references estabelecimentos(id),
  tipo               text not null,        -- credito | debito
  valor              numeric(10,2) not null,
  pedido_id          uuid references pedidos(id),
  created_at         timestamptz default now()
);

-- 3. Matching (PostGIS) — SECURITY DEFINER (não esbarra em RLS)
create or replace function find_entregadores_proximos(p_lng float8, p_lat float8, p_raio_m int default 5000)
returns table(id uuid, nome text, metros float8)
language sql security definer as $$
  select e.id, e.nome,
         st_distance(e.posicao, st_setsrid(st_makepoint(p_lng,p_lat),4326)::geography) as metros
  from entregadores e
  where e.is_online = true
    and e.status = 'aprovado'
    and e.posicao is not null
    and st_dwithin(e.posicao, st_setsrid(st_makepoint(p_lng,p_lat),4326)::geography, p_raio_m)
  order by metros asc;
$$;
