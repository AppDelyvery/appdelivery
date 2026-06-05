-- 0023 — API DE INTEGRAÇÃO (modelo Bee→Drogasil / Uber Direct).
-- Sistema do lojista grande faz POST do pedido na nossa API com a chave dele →
-- cria o pedido → o motor de oferta dirigida (0021) dispara sozinho.
-- Chave gerada/validada no banco (hash SHA-256; o texto puro só aparece 1 vez).

create extension if not exists pgcrypto;

create table if not exists chaves_api (
  id                 uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references estabelecimentos(id) on delete cascade,
  key_hash           text not null unique,
  prefixo            text not null,           -- primeiros chars, pra identificar na lista
  nome               text,                    -- apelido da chave (ex.: "Integração loja virtual")
  ativa              boolean not null default true,
  created_at         timestamptz default now(),
  last_used_at       timestamptz
);
create index if not exists chaves_api_estab_ix on chaves_api (estabelecimento_id);

alter table chaves_api enable row level security;
-- lojista enxerga/gerencia as chaves do próprio estabelecimento (metadados); admin tudo
drop policy if exists chaves_api_owner on chaves_api;
create policy chaves_api_owner on chaves_api for all
  using (is_admin() or exists (select 1 from estabelecimentos e where e.id = estabelecimento_id and e.profile_id = auth.uid()))
  with check (is_admin() or exists (select 1 from estabelecimentos e where e.id = estabelecimento_id and e.profile_id = auth.uid()));

-- hash padrão (sha-256 hex) — usado na criação e na validação
create or replace function hash_chave(p_key text) returns text
language sql immutable as $$ select encode(digest(p_key, 'sha256'), 'hex') $$;

-- ===== Lojista gera uma chave (texto puro retornado SÓ aqui) =====
create or replace function criar_chave_api(p_nome text default null)
returns text
language plpgsql security definer
set search_path = public, extensions
as $$
declare v_est uuid; v_key text;
begin
  select id into v_est from estabelecimentos where profile_id = auth.uid();
  if v_est is null then raise exception 'sem estabelecimento'; end if;
  v_key := 'appdly_live_' || encode(gen_random_bytes(24), 'hex');
  insert into chaves_api (estabelecimento_id, key_hash, prefixo, nome)
    values (v_est, hash_chave(v_key), substring(v_key, 1, 18) || '…', p_nome);
  return v_key;
end;
$$;

-- preço calculado no BANCO a partir da config (não confia em preço externo)
create or replace function preco_por_config(p_veh vehicle_type, p_dist numeric)
returns jsonb
language plpgsql stable
set search_path = public
as $$
declare v_base numeric; v_perkm numeric; v_min numeric; v_take numeric; v_total numeric;
begin
  select case p_veh when 'moto' then base_moto when 'carro' then base_carro else base_van end,
         case p_veh when 'moto' then per_km_moto when 'carro' then per_km_carro else per_km_van end,
         case p_veh when 'moto' then min_moto when 'carro' then min_carro else min_van end,
         coalesce(take_rate, 0.2)
    into v_base, v_perkm, v_min, v_take
    from config where id = 1;
  v_total := round((v_base + coalesce(p_dist,0) * v_perkm)::numeric, 2);
  if v_total < v_min then v_total := v_min; end if;
  return jsonb_build_object(
    'total', v_total,
    'entregador', round(v_total * (1 - v_take), 2),
    'plataforma', round(v_total * v_take, 2)
  );
end;
$$;

-- ===== Criar pedido via API (chamado pelo nosso endpoint com a chave do lojista) =====
-- Distância vem do endpoint (Mapbox); PREÇO é calculado aqui pela config. Retorna id + token.
create or replace function criar_pedido_via_api(p_key text, p_dados jsonb)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare v_est uuid; v_id uuid; v_tok uuid; v_ativo boolean; v_veh vehicle_type; v_dist numeric; v_preco jsonb;
begin
  select c.estabelecimento_id into v_est from chaves_api c
   where c.key_hash = hash_chave(p_key) and c.ativa = true;
  if v_est is null then raise exception 'chave invalida'; end if;

  select ativo into v_ativo from estabelecimentos where id = v_est;
  if v_ativo is false then raise exception 'estabelecimento suspenso'; end if;

  update chaves_api set last_used_at = now() where key_hash = hash_chave(p_key);

  v_veh := coalesce((p_dados->>'vehicle_type')::vehicle_type, 'moto');
  v_dist := nullif(p_dados->>'distancia_km','')::numeric;
  v_preco := preco_por_config(v_veh, v_dist);

  insert into pedidos (
    estabelecimento_id, coleta_endereco, coleta_lat, coleta_lng,
    entrega_endereco, entrega_lat, entrega_lng,
    cliente_final_nome, cliente_final_telefone, descricao, valor_declarado,
    vehicle_type, distancia_km, duracao_min,
    preco_total, preco_entregador, preco_plataforma, status
  ) values (
    v_est,
    p_dados->>'coleta_endereco', (p_dados->>'coleta_lat')::float8, (p_dados->>'coleta_lng')::float8,
    p_dados->>'entrega_endereco', (p_dados->>'entrega_lat')::float8, (p_dados->>'entrega_lng')::float8,
    p_dados->>'cliente_final_nome', p_dados->>'cliente_final_telefone', p_dados->>'descricao',
    nullif(p_dados->>'valor_declarado','')::numeric,
    v_veh, v_dist, nullif(p_dados->>'duracao_min','')::int,
    (v_preco->>'total')::numeric, (v_preco->>'entregador')::numeric, (v_preco->>'plataforma')::numeric,
    'buscando'
  ) returning id, tracking_token into v_id, v_tok;

  return jsonb_build_object('pedido_id', v_id, 'tracking_token', v_tok,
    'preco_total', (v_preco->>'total')::numeric, 'vehicle_type', v_veh);
end;
$$;

-- ===== Consultar status via API (o lojista grande poda/poll) =====
create or replace function status_via_api(p_key text, p_pedido_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare v_est uuid; v_res jsonb;
begin
  select c.estabelecimento_id into v_est from chaves_api c
   where c.key_hash = hash_chave(p_key) and c.ativa = true;
  if v_est is null then raise exception 'chave invalida'; end if;

  select jsonb_build_object(
           'pedido_id', p.id, 'status', p.status, 'tracking_token', p.tracking_token,
           'aceito_at', p.aceito_at, 'coletado_at', p.coletado_at, 'entregue_at', p.entregue_at,
           'entregador', case when en.id is null then null else jsonb_build_object(
             'nome', en.nome, 'vehicle_type', en.vehicle_type, 'placa', en.placa) end
         ) into v_res
  from pedidos p left join entregadores en on en.id = p.entregador_id
  where p.id = p_pedido_id and p.estabelecimento_id = v_est;
  if v_res is null then raise exception 'pedido nao encontrado'; end if;
  return v_res;
end;
$$;

-- grants: criar_chave_api é do lojista logado; as via_api são chamadas pelo nosso
-- endpoint usando a anon key + a chave do lojista como parâmetro.
revoke all on function criar_chave_api(text), criar_pedido_via_api(text, jsonb), status_via_api(text, uuid) from public;
grant execute on function criar_chave_api(text) to authenticated;
grant execute on function criar_pedido_via_api(text, jsonb) to anon, authenticated;
grant execute on function status_via_api(text, uuid) to anon, authenticated;
