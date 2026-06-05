-- 0021 — MOTOR DE OFERTA DIRIGIDA (modelo B, tipo 99).
-- Pedido em 'buscando' → sistema OFERTA pro melhor entregador (ranking adaptativo
-- por distância + nota), com timer de 30s. Recusa/expira → passa pro próximo.
-- Peças: ofertar_proximo (ranking+oferta), processar_ofertas (cron/expira),
-- aceitar_oferta / recusar_oferta, minha_oferta_atual (entregador lê a sua),
-- trigger que dispara ao entrar em 'buscando'.

-- timer da oferta (segundos)
alter table ofertas add column if not exists expira_at timestamptz;

-- ===== 1) Ofertar pro próximo melhor entregador elegível =====
create or replace function ofertar_proximo(p_pedido_id uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_lat double precision; v_lng double precision; v_veic vehicle_type; v_status text;
  v_raio int; v_ent uuid; v_oferta uuid;
begin
  select coleta_lat, coleta_lng, vehicle_type, status
    into v_lat, v_lng, v_veic, v_status
    from pedidos where id = p_pedido_id;
  if v_status <> 'buscando' then return null; end if;

  select coalesce(raio_m, 5000) into v_raio from config where id = 1;

  -- melhor elegível: online + aprovado + veículo exato + no raio +
  -- sem oferta ativa em outro pedido + não está em corrida + ainda não ofertado neste pedido.
  -- ranking ADAPTATIVO: distância ponderada pela nota (nota alta "encurta" a distância).
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
  order by st_distance(e.posicao, st_setsrid(st_makepoint(v_lng, v_lat), 4326)::geography) * (1 - 0.04 * coalesce(e.rating, 4)) asc
  limit 1;

  if v_ent is null then return null; end if; -- ninguém elegível agora

  insert into ofertas (pedido_id, entregador_id, status, ofertada_at, expira_at)
    values (p_pedido_id, v_ent, 'ofertada', now(), now() + interval '30 seconds')
    returning id into v_oferta;
  return v_oferta;
end;
$$;

-- ===== 2) Cron: expira ofertas vencidas e passa pro próximo =====
create or replace function processar_ofertas()
returns int
language plpgsql security definer
set search_path = public
as $$
declare r record; n int := 0;
begin
  -- (a) expira ofertas vencidas e passa pro próximo
  for r in select id, pedido_id from ofertas where status = 'ofertada' and expira_at <= now() loop
    update ofertas set status = 'expirada', respondida_at = now() where id = r.id;
    perform ofertar_proximo(r.pedido_id);
    n := n + 1;
  end loop;

  -- (b) reativa pedidos 'buscando' SEM oferta ativa (ex.: ninguém estava online
  -- quando nasceu, ou todos recusaram e alguém ficou online depois)
  for r in
    select p.id from pedidos p
    where p.status = 'buscando' and p.entregador_id is null
      and not exists (select 1 from ofertas o where o.pedido_id = p.id and o.status = 'ofertada' and o.expira_at > now())
  loop
    perform ofertar_proximo(r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- ===== 3) Entregador aceita a oferta =====
create or replace function aceitar_oferta(p_oferta_id uuid)
returns text
language plpgsql security definer
set search_path = public
as $$
declare v_ent uuid; v_ped uuid;
begin
  select id into v_ent from entregadores where profile_id = auth.uid() and status = 'aprovado';
  if v_ent is null then return 'nao-aprovado'; end if;

  select pedido_id into v_ped from ofertas
   where id = p_oferta_id and entregador_id = v_ent and status = 'ofertada' and expira_at > now();
  if v_ped is null then return 'expirada'; end if;

  update pedidos set entregador_id = v_ent, status = 'aceito', aceito_at = now()
   where id = v_ped and status = 'buscando' and entregador_id is null;
  if not found then return 'indisponivel'; end if;

  update ofertas set status = 'aceita', respondida_at = now() where id = p_oferta_id;
  update ofertas set status = 'expirada', respondida_at = now()
   where pedido_id = v_ped and status = 'ofertada' and id <> p_oferta_id;
  return 'ok';
end;
$$;

-- ===== 4) Entregador recusa → passa pro próximo =====
create or replace function recusar_oferta(p_oferta_id uuid)
returns text
language plpgsql security definer
set search_path = public
as $$
declare v_ent uuid; v_ped uuid;
begin
  select id into v_ent from entregadores where profile_id = auth.uid() and status = 'aprovado';
  if v_ent is null then return 'nao-aprovado'; end if;
  update ofertas set status = 'recusada', respondida_at = now()
   where id = p_oferta_id and entregador_id = v_ent and status = 'ofertada'
   returning pedido_id into v_ped;
  if v_ped is null then return 'invalida'; end if;
  perform ofertar_proximo(v_ped);
  return 'ok';
end;
$$;

-- ===== 5) Entregador lê a oferta ativa dele (com dados do pedido) =====
create or replace function minha_oferta_atual()
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare v_ent uuid; v_res jsonb;
begin
  select id into v_ent from entregadores where profile_id = auth.uid();
  if v_ent is null then return null; end if;

  -- expira lazy: se a minha venceu, marca e re-oferta antes de responder
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
           'distancia_km', p.distancia_km, 'duracao_min', p.duracao_min
         )
    into v_res
  from ofertas o join pedidos p on p.id = o.pedido_id
  where o.entregador_id = v_ent and o.status = 'ofertada' and o.expira_at > now()
  order by o.ofertada_at desc limit 1;
  return v_res;
end;
$$;

-- ===== 6) Trigger: dispara o despacho quando o pedido entra em 'buscando' =====
create or replace function trg_dispatch_pedido() returns trigger
language plpgsql security definer as $$
begin
  if new.status = 'buscando' and new.entregador_id is null then
    perform ofertar_proximo(new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists trg_pedido_dispatch on pedidos;
create trigger trg_pedido_dispatch
  after insert or update of status on pedidos
  for each row execute function trg_dispatch_pedido();

-- grants
revoke all on function ofertar_proximo(uuid), processar_ofertas(), aceitar_oferta(uuid), recusar_oferta(uuid), minha_oferta_atual() from public, anon;
grant execute on function aceitar_oferta(uuid), recusar_oferta(uuid), minha_oferta_atual() to authenticated;

-- backfill: dispara oferta pros pedidos que já estão buscando (testes)
select ofertar_proximo(id) from pedidos where status = 'buscando' and entregador_id is null;

-- agenda o cron (a cada 15s). Se a sintaxe de segundos não rodar no seu projeto,
-- troque por '* * * * *' (1 min) ou rode por Edge Function.
-- select cron.schedule('processar-ofertas', '15 seconds', 'select processar_ofertas()');
