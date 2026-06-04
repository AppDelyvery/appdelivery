-- 0020 — Preço por veículo (tabela completa) + matching exato por veículo.
-- Cada veículo tem bandeirada + por-km + mínimo próprios (já existia só a
-- bandeirada). E o despacho passa a filtrar/travar por veículo: pedido de moto
-- só vai pra moto, etc. (match exato, decisão do dono).

-- 1) Colunas de preço por veículo na config (id=1)
alter table config add column if not exists per_km_moto numeric(10,2);
alter table config add column if not exists per_km_carro numeric(10,2);
alter table config add column if not exists per_km_van numeric(10,2);
alter table config add column if not exists min_moto numeric(10,2);
alter table config add column if not exists min_carro numeric(10,2);
alter table config add column if not exists min_van numeric(10,2);

-- backfill: o per_km/minimo antigos viram os da MOTO; carro/van ganham default
update config set
  per_km_moto  = coalesce(per_km_moto, per_km, 1.5),
  per_km_carro = coalesce(per_km_carro, 2.5),
  per_km_van   = coalesce(per_km_van, 3.0),
  min_moto     = coalesce(min_moto, minimo, 10),
  min_carro    = coalesce(min_carro, 15),
  min_van      = coalesce(min_van, 25)
where id = 1;

-- 2) Listagem só mostra pedidos do veículo do entregador (match exato)
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
  join entregadores e on e.profile_id = auth.uid() and e.status = 'aprovado'
  where p.status = 'buscando' and p.entregador_id is null
    and p.vehicle_type = e.vehicle_type        -- match exato de veículo
  order by p.created_at desc;
$$;
grant execute on function listar_corridas_disponiveis() to authenticated;

-- 3) Aceite trava se o veículo não bater (defesa no servidor)
create or replace function aceitar_corrida(p_pedido_id uuid)
returns text language plpgsql security definer as $$
declare v_ent uuid; v_ent_veic vehicle_type; v_ped_veic vehicle_type;
begin
  select id, vehicle_type into v_ent, v_ent_veic
    from entregadores where profile_id = auth.uid() and status = 'aprovado';
  if v_ent is null then return 'nao-aprovado'; end if;

  select vehicle_type into v_ped_veic from pedidos
   where id = p_pedido_id and status = 'buscando' and entregador_id is null;
  if v_ped_veic is null then return 'indisponivel'; end if;
  if v_ped_veic <> v_ent_veic then return 'veiculo-incompativel'; end if;

  update pedidos
     set entregador_id = v_ent, status = 'aceito', aceito_at = now()
   where id = p_pedido_id and status = 'buscando' and entregador_id is null;

  if not found then return 'indisponivel'; end if;
  return 'ok';
end;
$$;
grant execute on function aceitar_corrida(uuid) to authenticated;
