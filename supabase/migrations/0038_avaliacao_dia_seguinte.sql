-- APPDELYVERY — avaliação só aparece NO DIA SEGUINTE (anti-retaliação). Após 0037.
-- Quem foi avaliado não vê a nota de hoje: lista e rating só contam avaliações de dias
-- anteriores (created_at < current_date). Um cron diário incorpora as de ontem.

-- Ver: entregador só vê avaliações já "reveladas"
create or replace function minhas_avaliacoes()
returns table(nota int, comentario text, created_at timestamptz)
language sql security definer stable as $$
  select a.nota, a.comentario, a.created_at
  from avaliacoes a
  join pedidos p on p.id = a.pedido_id
  join entregadores e on e.id = p.entregador_id
  where e.profile_id = auth.uid() and a.de_papel in ('estabelecimento', 'cliente') and a.created_at < current_date
  order by a.created_at desc;
$$;

-- Ver: negócio idem
create or replace function minhas_avaliacoes_negocio()
returns table(nota int, comentario text, created_at timestamptz)
language sql security definer stable as $$
  select a.nota, a.comentario, a.created_at
  from avaliacoes a
  join pedidos p on p.id = a.pedido_id
  join estabelecimentos e on e.id = p.estabelecimento_id
  where e.profile_id = auth.uid() and a.de_papel = 'entregador' and a.created_at < current_date
  order by a.created_at desc;
$$;

-- Registrar (entregador<->negócio): recálculo do rating só com avaliações reveladas (< hoje)
create or replace function registrar_avaliacao(p_pedido_id uuid, p_nota int, p_comentario text, p_de_papel text)
returns text language plpgsql security definer as $$
declare v_ent uuid; v_est uuid; v_media numeric;
begin
  if p_nota < 1 or p_nota > 5 then return 'nota-invalida'; end if;
  select entregador_id, estabelecimento_id into v_ent, v_est from pedidos where id = p_pedido_id;
  if p_de_papel = 'entregador' then
    if not exists (select 1 from entregadores where id = v_ent and profile_id = auth.uid()) then return 'nao-autorizado'; end if;
  elsif p_de_papel = 'estabelecimento' then
    if not exists (select 1 from estabelecimentos where id = v_est and profile_id = auth.uid()) then return 'nao-autorizado'; end if;
  else
    return 'papel-invalido';
  end if;
  insert into avaliacoes (pedido_id, nota, comentario, de_papel)
    values (p_pedido_id, p_nota, nullif(trim(p_comentario), ''), p_de_papel)
    on conflict (pedido_id, de_papel) do update set nota = excluded.nota, comentario = excluded.comentario;
  if p_de_papel = 'estabelecimento' then
    select round(avg(a.nota)::numeric, 1) into v_media from avaliacoes a join pedidos p on p.id = a.pedido_id
      where p.entregador_id = v_ent and a.de_papel in ('estabelecimento', 'cliente') and a.created_at < current_date;
    update entregadores set rating = coalesce(v_media, 5.0) where id = v_ent;
  else
    select round(avg(a.nota)::numeric, 1) into v_media from avaliacoes a join pedidos p on p.id = a.pedido_id
      where p.estabelecimento_id = v_est and a.de_papel = 'entregador' and a.created_at < current_date;
    update estabelecimentos set rating = coalesce(v_media, 5.0) where id = v_est;
  end if;
  return 'ok';
end; $$;

-- Registrar (cliente por token): idem
create or replace function avaliar_por_token(p_token uuid, p_nota int, p_comentario text)
returns text language plpgsql security definer as $$
declare v_ped uuid; v_ent uuid; v_media numeric;
begin
  if p_nota < 1 or p_nota > 5 then return 'nota-invalida'; end if;
  select id, entregador_id into v_ped, v_ent from pedidos where tracking_token = p_token;
  if v_ped is null then return 'pedido-nao-encontrado'; end if;
  insert into avaliacoes (pedido_id, nota, comentario, de_papel)
    values (v_ped, p_nota, nullif(trim(p_comentario), ''), 'cliente')
    on conflict (pedido_id, de_papel) do update set nota = excluded.nota, comentario = excluded.comentario;
  if v_ent is not null then
    select round(avg(a.nota)::numeric, 1) into v_media from avaliacoes a join pedidos p on p.id = a.pedido_id
      where p.entregador_id = v_ent and a.de_papel in ('estabelecimento', 'cliente') and a.created_at < current_date;
    update entregadores set rating = coalesce(v_media, 5.0) where id = v_ent;
  end if;
  return 'ok';
end; $$;

-- Cron diário: incorpora as avaliações de ontem ao rating (revela no dia seguinte)
create or replace function recalcular_ratings() returns void language plpgsql security definer as $$
begin
  update entregadores e set rating = coalesce((
    select round(avg(a.nota)::numeric, 1) from avaliacoes a join pedidos p on p.id = a.pedido_id
    where p.entregador_id = e.id and a.de_papel in ('estabelecimento', 'cliente') and a.created_at < current_date), 5.0);
  update estabelecimentos est set rating = coalesce((
    select round(avg(a.nota)::numeric, 1) from avaliacoes a join pedidos p on p.id = a.pedido_id
    where p.estabelecimento_id = est.id and a.de_papel = 'entregador' and a.created_at < current_date), 5.0);
end; $$;

select cron.schedule('recalcular-ratings-diario', '5 0 * * *', $$select recalcular_ratings()$$);
