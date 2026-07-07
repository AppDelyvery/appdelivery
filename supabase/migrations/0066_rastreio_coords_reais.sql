-- Rastreio público mostrava a rota/endereço FIXOS de demo porque a RPC não devolvia as
-- coordenadas do pedido. Adiciona coleta/entrega reais pra o mapa desenhar a rota certa.
drop function if exists public.get_rastreio_publico(uuid);
create or replace function public.get_rastreio_publico(p_token uuid)
 returns table(
   status pedido_status, entregador_nome text, entregador_veiculo vehicle_type,
   entregador_placa text, entregador_rating numeric, entregador_verificado boolean,
   lat double precision, lng double precision, atualizado timestamp with time zone,
   codigo_entrega text, entregue_at timestamp with time zone,
   comprovante_foto text, comprovante_assinatura text,
   coleta_lat double precision, coleta_lng double precision,
   entrega_lat double precision, entrega_lng double precision)
 language sql
 stable
 security definer
as $function$
  select p.status, e.nome, e.vehicle_type, e.placa, e.rating,
         (e.status = 'aprovado') as entregador_verificado,
         r.lat, r.lng, r.created_at, p.codigo_entrega, p.entregue_at,
         c.foto_url, c.assinatura_url,
         p.coleta_lat, p.coleta_lng, p.entrega_lat, p.entrega_lng
  from pedidos p
  left join entregadores e on e.id = p.entregador_id
  left join lateral (
    select lat, lng, created_at from rastreios where pedido_id = p.id order by created_at desc limit 1
  ) r on true
  left join lateral (
    select foto_url, assinatura_url from comprovantes where pedido_id = p.id and tipo = 'entrega' order by created_at desc limit 1
  ) c on true
  where p.tracking_token = p_token;
$function$;
grant execute on function public.get_rastreio_publico(uuid) to anon, authenticated;
