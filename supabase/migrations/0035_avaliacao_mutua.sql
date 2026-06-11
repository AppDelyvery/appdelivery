-- APPDELYVERY — avaliação MÚTUA (entregador <-> negócio) ao fim da entrega. Rodar após 0034.
-- A tabela avaliacoes ganha a DIREÇÃO (de_papel: quem deu a nota). O rating do avaliado
-- é recalculado automaticamente. Cada lado só avalia uma vez por pedido.

alter table avaliacoes add column if not exists de_papel text not null default 'cliente';
alter table estabelecimentos add column if not exists rating numeric(2,1) default 5.0;
create unique index if not exists avaliacoes_pedido_papel on avaliacoes (pedido_id, de_papel);

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

  -- recalcula o rating de QUEM FOI AVALIADO
  if p_de_papel = 'estabelecimento' then  -- negócio avaliou o entregador
    select round(avg(a.nota)::numeric, 1) into v_media
      from avaliacoes a join pedidos p on p.id = a.pedido_id
      where p.entregador_id = v_ent and a.de_papel in ('estabelecimento', 'cliente');
    update entregadores set rating = coalesce(v_media, 5.0) where id = v_ent;
  else  -- entregador avaliou o negócio
    select round(avg(a.nota)::numeric, 1) into v_media
      from avaliacoes a join pedidos p on p.id = a.pedido_id
      where p.estabelecimento_id = v_est and a.de_papel = 'entregador';
    update estabelecimentos set rating = coalesce(v_media, 5.0) where id = v_est;
  end if;
  return 'ok';
end; $$;
grant execute on function registrar_avaliacao(uuid, int, text, text) to authenticated;
