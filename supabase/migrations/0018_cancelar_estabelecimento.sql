-- 0018 — Lojista cancela o próprio pedido com motivo (espelha 0017 do entregador).
-- Cancelar antes de coletar é terminal ('cancelado') — a loja não quer mais a entrega.
-- Depois de coletado, não deixa cancelar pela loja (a carga já saiu) → vira disputa.

create or replace function cancelar_pedido_estabelecimento(p_pedido_id uuid, p_motivo text)
returns text
language plpgsql security definer
set search_path = public
as $$
declare v_status text;
begin
  if coalesce(btrim(p_motivo),'') = '' then raise exception 'motivo obrigatorio'; end if;

  select p.status into v_status
    from pedidos p
    join estabelecimentos e on e.id = p.estabelecimento_id
   where p.id = p_pedido_id and e.profile_id = auth.uid();
  if v_status is null then raise exception 'pedido nao e seu'; end if;
  if v_status not in ('rascunho','buscando','aceito','a_caminho_coleta') then
    raise exception 'nao da pra cancelar nesta etapa';
  end if;

  insert into cancelamentos (pedido_id, por, motivo, status_antes)
    values (p_pedido_id, 'estabelecimento', btrim(p_motivo), v_status);
  update pedidos set status = 'cancelado', entregador_id = null where id = p_pedido_id;
  return 'cancelado';
end;
$$;

revoke all on function cancelar_pedido_estabelecimento(uuid, text) from public, anon;
grant execute on function cancelar_pedido_estabelecimento(uuid, text) to authenticated;
