-- 0044 — Precificar ESPERA e PARADA EXTRA (modelo Borzo/TôNoLucro). Rodar após 0043.
-- Encomenda B2B real tem espera na coleta e paradas a mais; sem cobrar, o entregador
-- recusa e o split fica errado. Extras entram POR CIMA do mínimo. Entregador leva 80% do total.

-- ───────── config: valores editáveis pelo dono ─────────
alter table config add column if not exists valor_parada_extra numeric(10,2) not null default 3;
alter table config add column if not exists valor_espera_bloco numeric(10,2) not null default 4;
alter table config add column if not exists espera_bloco_min    int           not null default 10;

-- ───────── pedidos: quantidades pedidas ─────────
alter table pedidos add column if not exists paradas_extras int not null default 0;
alter table pedidos add column if not exists minutos_espera int not null default 0;

-- ───────── preço no banco (API): agora soma paradas + espera (args novos com default → 2-arg segue válido) ─────────
create or replace function preco_por_config(p_veh vehicle_type, p_dist numeric, p_paradas int default 0, p_espera_min int default 0)
returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  v_base numeric; v_perkm numeric; v_min numeric; v_take numeric; v_total numeric;
  v_parada numeric; v_espera_bloco numeric; v_bloco_min int; v_extras numeric;
begin
  select case p_veh when 'moto' then base_moto when 'carro' then base_carro else base_van end,
         case p_veh when 'moto' then per_km_moto when 'carro' then per_km_carro else per_km_van end,
         case p_veh when 'moto' then min_moto when 'carro' then min_carro else min_van end,
         coalesce(take_rate, 0.2),
         coalesce(valor_parada_extra, 3), coalesce(valor_espera_bloco, 4), coalesce(espera_bloco_min, 10)
    into v_base, v_perkm, v_min, v_take, v_parada, v_espera_bloco, v_bloco_min
    from config where id = 1;
  v_total := round((v_base + coalesce(p_dist,0) * v_perkm)::numeric, 2);
  if v_total < v_min then v_total := v_min; end if;
  v_extras := coalesce(p_paradas,0) * v_parada
            + ceil(coalesce(p_espera_min,0)::numeric / nullif(v_bloco_min,0)) * v_espera_bloco;
  v_total := round((v_total + coalesce(v_extras,0))::numeric, 2);
  return jsonb_build_object(
    'total', v_total,
    'entregador', round(v_total * (1 - v_take), 2),
    'plataforma', round(v_total * v_take, 2)
  );
end;
$$;

-- ───────── criar pedido via API: lê paradas_extras/minutos_espera do payload e grava ─────────
create or replace function criar_pedido_via_api(p_key text, p_dados jsonb)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare v_est uuid; v_id uuid; v_tok uuid; v_ativo boolean; v_veh vehicle_type; v_dist numeric;
        v_preco jsonb; v_paradas int; v_espera int;
begin
  select c.estabelecimento_id into v_est from chaves_api c
   where c.key_hash = hash_chave(p_key) and c.ativa = true;
  if v_est is null then raise exception 'chave invalida'; end if;

  select ativo into v_ativo from estabelecimentos where id = v_est;
  if v_ativo is false then raise exception 'estabelecimento suspenso'; end if;

  update chaves_api set last_used_at = now() where key_hash = hash_chave(p_key);

  v_veh := coalesce((p_dados->>'vehicle_type')::vehicle_type, 'moto');
  v_dist := nullif(p_dados->>'distancia_km','')::numeric;
  v_paradas := coalesce(nullif(p_dados->>'paradas_extras','')::int, 0);
  v_espera := coalesce(nullif(p_dados->>'minutos_espera','')::int, 0);
  v_preco := preco_por_config(v_veh, v_dist, v_paradas, v_espera);

  insert into pedidos (
    estabelecimento_id, coleta_endereco, coleta_lat, coleta_lng,
    entrega_endereco, entrega_lat, entrega_lng,
    cliente_final_nome, cliente_final_telefone, descricao, valor_declarado,
    vehicle_type, distancia_km, duracao_min, paradas_extras, minutos_espera,
    preco_total, preco_entregador, preco_plataforma, status
  ) values (
    v_est,
    p_dados->>'coleta_endereco', (p_dados->>'coleta_lat')::float8, (p_dados->>'coleta_lng')::float8,
    p_dados->>'entrega_endereco', (p_dados->>'entrega_lat')::float8, (p_dados->>'entrega_lng')::float8,
    p_dados->>'cliente_final_nome', p_dados->>'cliente_final_telefone', p_dados->>'descricao',
    nullif(p_dados->>'valor_declarado','')::numeric,
    v_veh, v_dist, nullif(p_dados->>'duracao_min','')::int, v_paradas, v_espera,
    (v_preco->>'total')::numeric, (v_preco->>'entregador')::numeric, (v_preco->>'plataforma')::numeric,
    'buscando'
  ) returning id, tracking_token into v_id, v_tok;

  return jsonb_build_object('pedido_id', v_id, 'tracking_token', v_tok,
    'preco_total', (v_preco->>'total')::numeric, 'vehicle_type', v_veh);
end;
$$;
