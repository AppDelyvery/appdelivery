-- 0013 — Mapa de despacho ao vivo (só admin).
-- Devolve, numa chamada, os entregadores online (com posição) e as corridas
-- em andamento (coleta/entrega). A posição é geography(Point) — exposta como
-- lng/lat via st_x/st_y só aqui, nunca direto pela tabela.

create or replace function mapa_despacho()
returns jsonb
language plpgsql security definer stable
set search_path = public
as $$
declare
  v_entregadores jsonb;
  v_corridas jsonb;
begin
  if not is_admin() then
    raise exception 'apenas admin';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', e.id,
           'nome', e.nome,
           'vehicle_type', e.vehicle_type,
           'status', e.status,
           'lng', st_x(e.posicao::geometry),
           'lat', st_y(e.posicao::geometry),
           'ultima_posicao_at', e.ultima_posicao_at,
           'em_corrida', exists (
             select 1 from pedidos p
             where p.entregador_id = e.id
               and p.status in ('aceito','a_caminho_coleta','coletado','a_caminho_entrega')
           )
         )), '[]'::jsonb)
    into v_entregadores
  from entregadores e
  where e.is_online = true
    and e.posicao is not null;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id,
           'status', p.status,
           'coleta_endereco', p.coleta_endereco,
           'coleta_lat', p.coleta_lat,
           'coleta_lng', p.coleta_lng,
           'entrega_endereco', p.entrega_endereco,
           'entrega_lat', p.entrega_lat,
           'entrega_lng', p.entrega_lng,
           'entregador_nome', en.nome,
           'negocio', es.razao_social
         )), '[]'::jsonb)
    into v_corridas
  from pedidos p
  left join entregadores en on en.id = p.entregador_id
  left join estabelecimentos es on es.id = p.estabelecimento_id
  where p.status in ('buscando','aceito','a_caminho_coleta','coletado','a_caminho_entrega');

  return jsonb_build_object('entregadores', v_entregadores, 'corridas', v_corridas);
end;
$$;

revoke all on function mapa_despacho() from public, anon;
grant execute on function mapa_despacho() to authenticated;
