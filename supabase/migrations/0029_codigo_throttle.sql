-- APPDELYVERY — throttle do código de entrega (anti brute-force). Rodar após 0028.
-- O código tem 4 dígitos; sem limite, o entregador da corrida poderia chutar até acertar.
-- Bloqueia após 5 tentativas erradas (precisa o cliente informar o código certo).

alter table pedidos add column if not exists codigo_tentativas smallint not null default 0;

drop function if exists registrar_entrega(uuid, text, text, text);
create or replace function registrar_entrega(p_pedido_id uuid, p_foto_url text, p_assinatura_url text, p_codigo text)
returns text language plpgsql security definer as $$
declare v_ent uuid; v_cod text; v_tent smallint;
begin
  select e.id, p.codigo_entrega, p.codigo_tentativas into v_ent, v_cod, v_tent
    from entregadores e join pedidos p on p.entregador_id = e.id
   where p.id = p_pedido_id and e.profile_id = auth.uid();
  if v_ent is null then return 'nao-e-sua-corrida'; end if;
  if v_tent >= 5 then return 'bloqueado-tentativas'; end if;
  if v_cod is not null and p_codigo is distinct from v_cod then
    update pedidos set codigo_tentativas = codigo_tentativas + 1 where id = p_pedido_id;
    return 'codigo-invalido';
  end if;
  perform set_config('app.via_registrar', 'on', true);
  update pedidos set status = 'entregue', entregue_at = now()
   where id = p_pedido_id and status in ('coletado','a_caminho_entrega');
  if not found then return 'status-invalido'; end if;
  insert into comprovantes (pedido_id, tipo, foto_url, assinatura_url)
    values (p_pedido_id, 'entrega', p_foto_url, p_assinatura_url);
  return 'ok';
end;
$$;
grant execute on function registrar_entrega(uuid, text, text, text) to authenticated;
