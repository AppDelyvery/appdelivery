-- Fallback de distância no despacho: se NÃO houver entregador elegível dentro do raio,
-- oferta pro mais próximo disponível mesmo longe (mantém veículo/online/aprovado/GPS).
-- Antes, sem ninguém no raio, o pedido ficava sem oferta indefinidamente.
create or replace function public.ofertar_proximo(p_pedido_id uuid)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_lat double precision; v_lng double precision; v_veic vehicle_type; v_status text;
  v_raio int; v_ent uuid; v_oferta uuid;
begin
  select coleta_lat, coleta_lng, vehicle_type, status
    into v_lat, v_lng, v_veic, v_status
    from pedidos where id = p_pedido_id;
  if v_status <> 'buscando' then return null; end if;

  select coalesce(raio_m, 5000) into v_raio from config where id = 1;

  -- 1) preferência: o melhor ranqueado DENTRO do raio (distância × nota × confiabilidade)
  select e.id into v_ent
  from entregadores e
  where e.is_online = true
    and e.status = 'aprovado'
    and e.vehicle_type = v_veic
    and e.posicao is not null
    and st_dwithin(e.posicao, st_setsrid(st_makepoint(v_lng, v_lat), 4326)::geography, coalesce(v_raio, 5000))
    and not exists (select 1 from ofertas o where o.pedido_id = p_pedido_id and o.entregador_id = e.id)
    and not exists (select 1 from ofertas o where o.entregador_id = e.id and o.status = 'ofertada' and o.expira_at > now())
    and not exists (select 1 from pedidos p2 where p2.entregador_id = e.id and p2.status in ('aceito','a_caminho_coleta','coletado','a_caminho_entrega'))
  order by st_distance(e.posicao, st_setsrid(st_makepoint(v_lng, v_lat), 4326)::geography)
           * (1 - 0.04 * coalesce(e.rating, 4))
           * (1 + 0.12 * (coalesce(e.abandonos, 0) + coalesce(e.cancel_pos_aceite, 0))) asc
  limit 1;

  -- 2) FALLBACK: ninguém no raio → o mais próximo disponível, sem limite de distância
  if v_ent is null then
    select e.id into v_ent
    from entregadores e
    where e.is_online = true
      and e.status = 'aprovado'
      and e.vehicle_type = v_veic
      and e.posicao is not null
      and not exists (select 1 from ofertas o where o.pedido_id = p_pedido_id and o.entregador_id = e.id)
      and not exists (select 1 from ofertas o where o.entregador_id = e.id and o.status = 'ofertada' and o.expira_at > now())
      and not exists (select 1 from pedidos p2 where p2.entregador_id = e.id and p2.status in ('aceito','a_caminho_coleta','coletado','a_caminho_entrega'))
    order by st_distance(e.posicao, st_setsrid(st_makepoint(v_lng, v_lat), 4326)::geography) asc
    limit 1;
  end if;

  if v_ent is null then return null; end if;

  insert into ofertas (pedido_id, entregador_id, status, ofertada_at, expira_at)
    values (p_pedido_id, v_ent, 'ofertada', now(), now() + interval '30 seconds')
    returning id into v_oferta;
  return v_oferta;
end;
$function$;
