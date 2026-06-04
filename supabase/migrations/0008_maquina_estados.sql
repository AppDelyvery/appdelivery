-- APPDELYVERY — máquina de estados com evidência. Rodar após 0007.
-- coletado/entregue SÓ avançam pela função de evidência (foto/assinatura), nunca por PATCH solto.
-- O guard 0004 bloqueia PATCH direto; aqui ele libera quando o sinal 'app.via_registrar' está ligado.

-- guard atualizado: permite coletado/entregue quando vem das funções de evidência
create or replace function guard_pedido_status() returns trigger
language plpgsql security definer as $$
begin
  if auth.uid() is null or is_admin() or coalesce(current_setting('app.via_registrar', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.status is distinct from old.status and new.status in ('coletado','entregue') then
    raise exception 'status % exige evidencia (registrar_coleta/registrar_entrega)', new.status;
  end if;
  return new;
end;
$$;

-- COLETA: entregador designado + foto → status coletado + comprovante
create or replace function registrar_coleta(p_pedido_id uuid, p_foto_url text)
returns text language plpgsql security definer as $$
declare v_ent uuid;
begin
  select e.id into v_ent from entregadores e join pedidos p on p.entregador_id = e.id
   where p.id = p_pedido_id and e.profile_id = auth.uid();
  if v_ent is null then return 'nao-e-sua-corrida'; end if;
  perform set_config('app.via_registrar', 'on', true);
  update pedidos set status = 'coletado', coletado_at = now()
   where id = p_pedido_id and status in ('aceito','a_caminho_coleta');
  if not found then return 'status-invalido'; end if;
  insert into comprovantes (pedido_id, tipo, foto_url) values (p_pedido_id, 'coleta', p_foto_url);
  return 'ok';
end;
$$;
grant execute on function registrar_coleta(uuid, text) to authenticated;

-- ENTREGA: entregador designado + foto + assinatura → status entregue + comprovante
create or replace function registrar_entrega(p_pedido_id uuid, p_foto_url text, p_assinatura_url text)
returns text language plpgsql security definer as $$
declare v_ent uuid;
begin
  select e.id into v_ent from entregadores e join pedidos p on p.entregador_id = e.id
   where p.id = p_pedido_id and e.profile_id = auth.uid();
  if v_ent is null then return 'nao-e-sua-corrida'; end if;
  perform set_config('app.via_registrar', 'on', true);
  update pedidos set status = 'entregue', entregue_at = now()
   where id = p_pedido_id and status in ('coletado','a_caminho_entrega');
  if not found then return 'status-invalido'; end if;
  insert into comprovantes (pedido_id, tipo, foto_url, assinatura_url)
    values (p_pedido_id, 'entrega', p_foto_url, p_assinatura_url);
  return 'ok';
end;
$$;
grant execute on function registrar_entrega(uuid, text, text) to authenticated;

-- Storage: bucket de comprovantes (público p/ o admin exibir as fotos; paths com uuid são inadivinháveis)
insert into storage.buckets (id, name, public) values ('comprovantes', 'comprovantes', true)
  on conflict (id) do nothing;

-- entregador autenticado sobe comprovante; leitura é pública (bucket público)
drop policy if exists "comprovante_insert_auth" on storage.objects;
create policy "comprovante_insert_auth" on storage.objects
  for insert to authenticated with check (bucket_id = 'comprovantes');
