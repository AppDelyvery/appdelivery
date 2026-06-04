-- 0015 — listar_corridas_disponiveis devolve coords da coleta.
-- O card de aceite (padrão 99) mostra "distância até a coleta", calculada da
-- posição GPS do entregador até coleta_lat/lng. Conteúdo/valor da encomenda
-- NÃO entram aqui (decisão: só aparecem depois de aceitar).
-- Muda a assinatura → drop + recreate.

drop function if exists listar_corridas_disponiveis();

create or replace function listar_corridas_disponiveis()
returns table(
  id uuid, coleta_endereco text, entrega_endereco text,
  coleta_lat double precision, coleta_lng double precision,
  distancia_km numeric, duracao_min int, preco_entregador numeric,
  vehicle_type vehicle_type, created_at timestamptz
)
language sql security definer stable as $$
  select p.id, p.coleta_endereco, p.entrega_endereco,
         p.coleta_lat, p.coleta_lng,
         p.distancia_km, p.duracao_min, p.preco_entregador,
         p.vehicle_type, p.created_at
  from pedidos p
  where p.status = 'buscando' and p.entregador_id is null
    and exists (select 1 from entregadores e where e.profile_id = auth.uid() and e.status = 'aprovado')
  order by p.created_at desc;
$$;

grant execute on function listar_corridas_disponiveis() to authenticated;
