-- 0052 — O guard_entregador_update revertia total_entregas E rating até para as funções de
-- SISTEMA (creditar_entregador, registrar_avaliacao rodam no contexto do entregador, não-admin),
-- desfazendo silenciosamente o incremento e o recálculo. Causa raiz do "total_entregas=0" e do
-- "rating travado". Fix: guard libera quando a flag de sessão app.sys_entregador está ligada;
-- só as funções de sistema (SECURITY DEFINER) ligam a flag — o entregador segue sem auto-editar.

-- 1) guard com carve-out por flag de sistema
create or replace function guard_entregador_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if is_admin() or current_setting('app.sys_entregador', true) = 'on' then
    return new;  -- admin ou função de sistema: pode tudo
  end if;
  if new.status is distinct from old.status then
    if not (old.status = 'cadastro' and new.status = 'em_verificacao') then
      new.status := old.status;
    end if;
  end if;
  new.rating := old.rating;
  new.total_entregas := old.total_entregas;
  if current_setting('app.set_subconta', true) is distinct from 'on' then
    new.asaas_subconta_id := old.asaas_subconta_id;
  end if;
  return new;
end; $$;

-- 2) creditar_entregador liga a flag antes de tocar entregadores (total_entregas + saldo)
create or replace function creditar_entregador() returns trigger
language plpgsql security definer as $$
declare v_ativa boolean;
begin
  if new.status = 'entregue' and old.status is distinct from 'entregue' and new.entregador_id is not null then
    perform set_config('app.sys_entregador', 'on', true);
    update entregadores set total_entregas = coalesce(total_entregas, 0) + 1 where id = new.entregador_id;
    select cobranca_ativa into v_ativa from config where id = 1;
    if v_ativa is true then
      update entregadores set saldo = coalesce(saldo, 0) + coalesce(new.preco_entregador, 0) where id = new.entregador_id;
      insert into pagamentos (pedido_id, metodo, valor, taxa, status, pago_at)
        values (new.id, 'carteira', coalesce(new.preco_entregador, 0), coalesce(new.preco_plataforma, 0), 'pago', now());
    end if;
  end if;
  return new;
end; $$;

-- 3) registrar_avaliacao liga a flag antes de recalcular o rating do entregador
create or replace function registrar_avaliacao(p_pedido_id uuid, p_nota integer, p_comentario text, p_de_papel text) returns text
language plpgsql security definer set search_path to 'public' as $$
declare v_ent uuid; v_est uuid; v_media numeric;
begin
  if p_nota < 1 or p_nota > 5 then return 'nota-invalida'; end if;
  select entregador_id, estabelecimento_id into v_ent, v_est from pedidos where id = p_pedido_id;
  if p_de_papel = 'entregador' then
    if not exists (select 1 from entregadores where id = v_ent and profile_id = auth.uid()) then return 'nao-autorizado'; end if;
  elsif p_de_papel = 'estabelecimento' then
    if not estab_membro_de(v_est) then return 'nao-autorizado'; end if;
  else
    return 'papel-invalido';
  end if;
  insert into avaliacoes (pedido_id, nota, comentario, de_papel)
    values (p_pedido_id, p_nota, nullif(trim(p_comentario), ''), p_de_papel)
    on conflict (pedido_id, de_papel) do update set nota = excluded.nota, comentario = excluded.comentario;
  perform set_config('app.sys_entregador', 'on', true);  -- libera o guard p/ o recálculo de rating
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

-- 4) backfill com a flag ligada (total_entregas + rating real, ignorando D+1 só no backfill histórico)
select set_config('app.sys_entregador', 'on', false);
update entregadores e set total_entregas = (select count(*) from pedidos p where p.entregador_id = e.id and p.status = 'entregue');
update entregadores e set rating = coalesce((select round(avg(a.nota)::numeric, 1) from avaliacoes a join pedidos p on p.id = a.pedido_id where p.entregador_id = e.id and a.de_papel in ('estabelecimento','cliente')), 5.0);
update estabelecimentos e set rating = coalesce((select round(avg(a.nota)::numeric, 1) from avaliacoes a join pedidos p on p.id = a.pedido_id where p.estabelecimento_id = e.id and a.de_papel = 'entregador'), 5.0);
select set_config('app.sys_entregador', 'off', false);
