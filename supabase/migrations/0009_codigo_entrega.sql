-- APPDELYVERY — código de entrega (cliente passa ao entregador pra confirmar). Rodar após 0008.
-- 2ª prova além de foto+assinatura: garante que o entregador chegou no destinatário certo (anti-fraude).

-- código de 4 dígitos por pedido (gerado automático)
alter table pedidos add column if not exists codigo_entrega text;
update pedidos set codigo_entrega = lpad(floor(random() * 10000)::text, 4, '0') where codigo_entrega is null;
alter table pedidos alter column codigo_entrega set default lpad(floor(random() * 10000)::text, 4, '0');

-- registrar_entrega agora EXIGE o código (além de foto+assinatura)
drop function if exists registrar_entrega(uuid, text, text);
create or replace function registrar_entrega(p_pedido_id uuid, p_foto_url text, p_assinatura_url text, p_codigo text)
returns text language plpgsql security definer as $$
declare v_ent uuid; v_cod text;
begin
  select e.id, p.codigo_entrega into v_ent, v_cod
    from entregadores e join pedidos p on p.entregador_id = e.id
   where p.id = p_pedido_id and e.profile_id = auth.uid();
  if v_ent is null then return 'nao-e-sua-corrida'; end if;
  if v_cod is not null and p_codigo is distinct from v_cod then return 'codigo-invalido'; end if;
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

-- o cliente final vê o próprio código no rastreio (tem o token = tem direito)
drop function if exists get_rastreio_publico(uuid);
create or replace function get_rastreio_publico(p_token uuid)
returns table(status pedido_status, entregador_nome text, lat double precision, lng double precision, atualizado timestamptz, codigo_entrega text)
language sql security definer stable as $$
  select p.status, e.nome, r.lat, r.lng, r.created_at, p.codigo_entrega
  from pedidos p
  left join entregadores e on e.id = p.entregador_id
  left join lateral (
    select lat, lng, created_at from rastreios where pedido_id = p.id order by created_at desc limit 1
  ) r on true
  where p.tracking_token = p_token;
$$;
grant execute on function get_rastreio_publico(uuid) to anon, authenticated;
