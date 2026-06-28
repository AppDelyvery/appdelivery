-- 0055 — Controle operacional #2 (backend): intervenção manual do admin num pedido ao vivo.
-- O guard_pedido_status já bypassa is_admin(), então essas RPCs só precisam checar is_admin().
-- Toda ação registra em `cancelamentos` (trilha de auditoria) e limpa o em_risco.

-- reatribuir: devolve pro pool (buscando) e reoferta. Uso típico: pré-coleta / coleta atrasada.
create or replace function admin_reatribuir_pedido(p_pedido_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v_status text; v_ent uuid;
begin
  if not is_admin() then return 'nao-autorizado'; end if;
  select status, entregador_id into v_status, v_ent from pedidos where id = p_pedido_id;
  if v_status is null then return 'nao-encontrado'; end if;
  if v_status in ('entregue', 'cancelado') then return 'finalizado'; end if;
  insert into cancelamentos (pedido_id, entregador_id, por, motivo, status_antes)
    values (p_pedido_id, v_ent, 'admin', 'reatribuido pela operacao', v_status);
  update pedidos set status = 'buscando', entregador_id = null, aceito_at = null, coletado_at = null,
    em_risco = false, risco_at = null, risco_motivo = null where id = p_pedido_id;
  perform ofertar_proximo(p_pedido_id);
  return 'ok';
end; $$;

-- cancelar + estornar: o trg_estornar_pedido devolve o frete pra carteira do lojista.
create or replace function admin_cancelar_pedido(p_pedido_id uuid, p_motivo text default null) returns text
language plpgsql security definer set search_path = public as $$
declare v_status text; v_ent uuid;
begin
  if not is_admin() then return 'nao-autorizado'; end if;
  select status, entregador_id into v_status, v_ent from pedidos where id = p_pedido_id;
  if v_status is null then return 'nao-encontrado'; end if;
  if v_status in ('entregue', 'cancelado') then return 'finalizado'; end if;
  insert into cancelamentos (pedido_id, entregador_id, por, motivo, status_antes)
    values (p_pedido_id, v_ent, 'admin', coalesce(nullif(trim(p_motivo), ''), 'cancelado pela operacao'), v_status);
  update pedidos set status = 'cancelado', em_risco = false, risco_at = null, risco_motivo = null where id = p_pedido_id;
  return 'ok';
end; $$;

-- forçar conclusão: marca entregue (credita o entregador via trg_creditar_entregador).
-- Uso: entrega confirmada por fora (foto/cliente) mas o entregador não registrou.
create or replace function admin_forcar_conclusao(p_pedido_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v_status text; v_ent uuid;
begin
  if not is_admin() then return 'nao-autorizado'; end if;
  select status, entregador_id into v_status, v_ent from pedidos where id = p_pedido_id;
  if v_status is null then return 'nao-encontrado'; end if;
  if v_ent is null then return 'sem-entregador'; end if;
  if v_status in ('entregue', 'cancelado') then return 'finalizado'; end if;
  update pedidos set status = 'entregue', entregue_at = now(),
    em_risco = false, risco_at = null, risco_motivo = null where id = p_pedido_id;
  return 'ok';
end; $$;

grant execute on function admin_reatribuir_pedido(uuid) to authenticated;
grant execute on function admin_cancelar_pedido(uuid, text) to authenticated;
grant execute on function admin_forcar_conclusao(uuid) to authenticated;

-- mapa_despacho: expor em_risco/risco_motivo/preco_total pra UI de despacho agir
create or replace function mapa_despacho() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare v_entregadores jsonb; v_corridas jsonb;
begin
  if not is_admin() then raise exception 'apenas admin'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', e.id, 'nome', e.nome, 'vehicle_type', e.vehicle_type, 'status', e.status,
           'lng', st_x(e.posicao::geometry), 'lat', st_y(e.posicao::geometry),
           'ultima_posicao_at', e.ultima_posicao_at,
           'em_corrida', exists (select 1 from pedidos p where p.entregador_id = e.id
             and p.status in ('aceito','a_caminho_coleta','coletado','a_caminho_entrega'))
         )), '[]'::jsonb) into v_entregadores
  from entregadores e where e.is_online = true and e.posicao is not null;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'status', p.status, 'preco_total', p.preco_total,
           'coleta_endereco', p.coleta_endereco, 'coleta_lat', p.coleta_lat, 'coleta_lng', p.coleta_lng,
           'entrega_endereco', p.entrega_endereco, 'entrega_lat', p.entrega_lat, 'entrega_lng', p.entrega_lng,
           'entregador_nome', en.nome, 'negocio', es.razao_social,
           'em_risco', p.em_risco, 'risco_motivo', p.risco_motivo
         ) order by p.em_risco desc, p.created_at desc), '[]'::jsonb) into v_corridas
  from pedidos p
  left join entregadores en on en.id = p.entregador_id
  left join estabelecimentos es on es.id = p.estabelecimento_id
  where p.status in ('buscando','aceito','a_caminho_coleta','coletado','a_caminho_entrega');

  return jsonb_build_object('entregadores', v_entregadores, 'corridas', v_corridas);
end; $$;
