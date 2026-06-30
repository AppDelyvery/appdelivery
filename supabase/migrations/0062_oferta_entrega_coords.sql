-- Adiciona as coordenadas de ENTREGA na oferta, pra o app do entregador desenhar
-- a rota no mapa (coleta -> entrega) quando a oferta chega.
create or replace function public.minha_oferta_atual()
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_ent uuid; v_res jsonb;
begin
  select id into v_ent from entregadores where profile_id = auth.uid();
  if v_ent is null then return null; end if;

  update ofertas set status = 'expirada', respondida_at = now()
   where entregador_id = v_ent and status = 'ofertada' and expira_at <= now();

  select jsonb_build_object(
           'oferta_id', o.id,
           'pedido_id', p.id,
           'expira_at', o.expira_at,
           'segundos', greatest(0, round(extract(epoch from (o.expira_at - now())))),
           'preco_entregador', p.preco_entregador,
           'vehicle_type', p.vehicle_type,
           'coleta_endereco', p.coleta_endereco,
           'coleta_lat', p.coleta_lat, 'coleta_lng', p.coleta_lng,
           'entrega_endereco', p.entrega_endereco,
           'entrega_lat', p.entrega_lat, 'entrega_lng', p.entrega_lng,
           'distancia_km', p.distancia_km, 'duracao_min', p.duracao_min
         )
    into v_res
  from ofertas o join pedidos p on p.id = o.pedido_id
  where o.entregador_id = v_ent and o.status = 'ofertada' and o.expira_at > now()
  order by o.ofertada_at desc limit 1;
  return v_res;
end;
$function$;
