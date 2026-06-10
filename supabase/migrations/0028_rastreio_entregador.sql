-- APPDELYVERY — rastreio público com dados do entregador (veículo/placa/nota). Rodar após 0027.
-- Tira os dados fake da tela do cliente: passa a mostrar o entregador REAL designado.
-- Veículo/placa/nota são dados PÚBLICOS (igual app de corrida) — antecedentes seguem só-admin.

drop function if exists get_rastreio_publico(uuid);
create or replace function get_rastreio_publico(p_token uuid)
returns table(
  status pedido_status,
  entregador_nome text,
  entregador_veiculo vehicle_type,
  entregador_placa text,
  entregador_rating numeric,
  lat double precision,
  lng double precision,
  atualizado timestamptz,
  codigo_entrega text
)
language sql security definer stable as $$
  select p.status, e.nome, e.vehicle_type, e.placa, e.rating, r.lat, r.lng, r.created_at, p.codigo_entrega
  from pedidos p
  left join entregadores e on e.id = p.entregador_id
  left join lateral (
    select lat, lng, created_at from rastreios where pedido_id = p.id order by created_at desc limit 1
  ) r on true
  where p.tracking_token = p_token;
$$;
grant execute on function get_rastreio_publico(uuid) to anon, authenticated;
