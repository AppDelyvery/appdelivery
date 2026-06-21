-- 0043 — Quick wins de operação (pesquisa de mercado jun/2026). Rodar após 0042.
-- (1) Heartbeat anti corrida-fantasma: quem aceita e some (GPS parado) é re-ofertado.
-- (2) Score de confiabilidade: NÃO pune recusa; pune cancelamento-pós-aceite e abandono.
-- (3) Rastreio público: selo "verificado" data-driven + comprovante de entrega (foto/assinatura).

-- ───────── colunas de confiabilidade do entregador ─────────
alter table entregadores add column if not exists abandonos          int not null default 0;
alter table entregadores add column if not exists cancel_pos_aceite  int not null default 0;

-- ───────── (1) Heartbeat: aceitou + GPS parado por 120s = abandono → devolve pro pool ─────────
-- Seguro: quem está DIRIGINDO pra coleta pinga GPS continuamente (atualizar_minha_posicao),
-- então não é pego. Só cai aqui quem aceitou e fechou o app / ficou parado.
create or replace function liberar_aceites_travados()
returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in
    select p.id, p.entregador_id
    from pedidos p
    join entregadores e on e.id = p.entregador_id
    where p.status = 'aceito'
      and p.aceito_at < now() - interval '120 seconds'
      and (e.ultima_posicao_at is null or e.ultima_posicao_at < now() - interval '120 seconds')
  loop
    insert into cancelamentos (pedido_id, entregador_id, por, motivo, status_antes)
      values (r.id, r.entregador_id, 'admin', 'abandono automatico: aceitou e o GPS ficou parado', 'aceito');
    update entregadores set abandonos = abandonos + 1 where id = r.entregador_id;
    update pedidos set status = 'buscando', entregador_id = null, aceito_at = null where id = r.id;
    perform ofertar_proximo(r.id);
    n := n + 1;
  end loop;
  return n;
end; $$;
revoke all on function liberar_aceites_travados() from public, anon;

-- agenda o heartbeat a cada minuto (idempotente)
do $$ begin perform cron.unschedule('liberar-aceites-travados'); exception when others then null; end $$;
select cron.schedule('liberar-aceites-travados', '* * * * *', $$select liberar_aceites_travados()$$);

-- ───────── (2) Ranking com confiabilidade (recusa NÃO penaliza; abandono/cancelamento sim) ─────────
-- Recriação de ofertar_proximo (0021) só mudando o ORDER BY: soma um fator que "afasta"
-- quem abandona/cancela. Nota alta ainda encurta a distância; recusar continua de graça.
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

  if v_ent is null then return null; end if;

  insert into ofertas (pedido_id, entregador_id, status, ofertada_at, expira_at)
    values (p_pedido_id, v_ent, 'ofertada', now(), now() + interval '30 seconds')
    returning id into v_oferta;
  return v_oferta;
end;
$$;

-- cancelar_corrida_entregador (0017): conta o cancelamento-pós-aceite (antes de coletar = fura o cliente)
create or replace function cancelar_corrida_entregador(p_pedido_id uuid, p_motivo text)
returns text
language plpgsql security definer
set search_path = public
as $$
declare v_ent uuid; v_status text;
begin
  select id into v_ent from entregadores where profile_id = auth.uid() and status = 'aprovado';
  if v_ent is null then raise exception 'nao aprovado'; end if;
  if coalesce(btrim(p_motivo),'') = '' then raise exception 'motivo obrigatorio'; end if;

  select status into v_status from pedidos where id = p_pedido_id and entregador_id = v_ent;
  if v_status is null then raise exception 'corrida nao e sua'; end if;
  if v_status not in ('aceito','a_caminho_coleta','coletado','a_caminho_entrega') then
    raise exception 'corrida nao esta em andamento';
  end if;

  insert into cancelamentos (pedido_id, entregador_id, por, motivo, status_antes)
    values (p_pedido_id, v_ent, 'entregador', btrim(p_motivo), v_status);

  if v_status in ('aceito','a_caminho_coleta') then
    -- ainda não coletou → devolve pro pool E conta contra a confiabilidade
    update entregadores set cancel_pos_aceite = cancel_pos_aceite + 1 where id = v_ent;
    update pedidos set status = 'buscando', entregador_id = null, aceito_at = null where id = p_pedido_id;
    return 'pool';
  else
    update pedidos set status = 'cancelado' where id = p_pedido_id;
    return 'cancelado';
  end if;
end;
$$;

-- ───────── (3) Rastreio público: selo verificado + comprovante de entrega ─────────
drop function if exists get_rastreio_publico(uuid);
create or replace function get_rastreio_publico(p_token uuid)
returns table(
  status pedido_status,
  entregador_nome text,
  entregador_veiculo vehicle_type,
  entregador_placa text,
  entregador_rating numeric,
  entregador_verificado boolean,
  lat double precision,
  lng double precision,
  atualizado timestamptz,
  codigo_entrega text,
  entregue_at timestamptz,
  comprovante_foto text,
  comprovante_assinatura text
)
language sql security definer stable as $$
  select p.status, e.nome, e.vehicle_type, e.placa, e.rating,
         (e.status = 'aprovado') as entregador_verificado,
         r.lat, r.lng, r.created_at, p.codigo_entrega, p.entregue_at,
         c.foto_url, c.assinatura_url
  from pedidos p
  left join entregadores e on e.id = p.entregador_id
  left join lateral (
    select lat, lng, created_at from rastreios where pedido_id = p.id order by created_at desc limit 1
  ) r on true
  left join lateral (
    select foto_url, assinatura_url from comprovantes where pedido_id = p.id and tipo = 'entrega' order by created_at desc limit 1
  ) c on true
  where p.tracking_token = p_token;
$$;
grant execute on function get_rastreio_publico(uuid) to anon, authenticated;
