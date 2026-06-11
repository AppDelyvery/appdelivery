-- APPDELYVERY — cliente final avalia o entregador pelo link de rastreio (SEM login). Após 0035.
-- Por token (SECURITY DEFINER): de_papel='cliente'. Recalcula o rating do entregador.

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
    select round(avg(a.nota)::numeric, 1) into v_media
      from avaliacoes a join pedidos p on p.id = a.pedido_id
      where p.entregador_id = v_ent and a.de_papel in ('estabelecimento', 'cliente');
    update entregadores set rating = coalesce(v_media, 5.0) where id = v_ent;
  end if;
  return 'ok';
end; $$;
grant execute on function avaliar_por_token(uuid, int, text) to anon, authenticated;
