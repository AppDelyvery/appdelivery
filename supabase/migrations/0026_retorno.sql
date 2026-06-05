-- 0026 — Opção de RETORNO (a Bee tem: "o entregador deve retornar?").
-- Ex.: levar a encomenda, e se o cliente não receber, voltar pra loja.
alter table pedidos add column if not exists retornar boolean not null default false;

-- criar_pedido_via_api passa a aceitar 'retornar'
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
    preco_total, preco_entregador, preco_plataforma, retornar, status
  ) values (
    v_est,
    p_dados->>'coleta_endereco', (p_dados->>'coleta_lat')::float8, (p_dados->>'coleta_lng')::float8,
    p_dados->>'entrega_endereco', (p_dados->>'entrega_lat')::float8, (p_dados->>'entrega_lng')::float8,
    p_dados->>'cliente_final_nome', p_dados->>'cliente_final_telefone', p_dados->>'descricao',
    nullif(p_dados->>'valor_declarado','')::numeric,
    v_veh, v_dist, nullif(p_dados->>'duracao_min','')::int,
    (v_preco->>'total')::numeric, (v_preco->>'entregador')::numeric, (v_preco->>'plataforma')::numeric,
    coalesce((p_dados->>'retornar')::boolean, false), 'buscando'
  ) returning id, tracking_token into v_id, v_tok;

  return jsonb_build_object('pedido_id', v_id, 'tracking_token', v_tok,
    'preco_total', (v_preco->>'total')::numeric, 'vehicle_type', v_veh);
end;
$$;
