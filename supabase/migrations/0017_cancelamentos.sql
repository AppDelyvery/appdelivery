-- 0017 — Cancelamento de entrega com motivo (padrão 99 T29).
-- Todo cancelamento é logado com motivo categorizado (alimenta admin/disputa).
-- Entregador desiste ANTES de coletar → entrega volta pro pool ('buscando'),
-- pra loja não ficar na mão. Depois de coletar → vira 'cancelado' (admin resolve).

create table if not exists cancelamentos (
  id            uuid primary key default gen_random_uuid(),
  pedido_id     uuid not null references pedidos(id) on delete cascade,
  entregador_id uuid references entregadores(id),
  por           text not null check (por in ('entregador','estabelecimento','cliente','admin')),
  motivo        text not null,
  status_antes  text,
  created_at    timestamptz default now()
);
create index if not exists cancelamentos_pedido_ix on cancelamentos (pedido_id);

alter table cancelamentos enable row level security;
drop policy if exists cancelamentos_admin on cancelamentos;
create policy cancelamentos_admin on cancelamentos for all using (is_admin()) with check (is_admin());

-- Entregador cancela a própria corrida em andamento, com motivo.
-- Retorna 'pool' (voltou a buscar) | 'cancelado' | erro.
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
    -- ainda não coletou → devolve pro pool
    update pedidos set status = 'buscando', entregador_id = null, aceito_at = null where id = p_pedido_id;
    return 'pool';
  else
    -- já coletou → cancela e marca pra admin resolver (carga está com o entregador)
    update pedidos set status = 'cancelado' where id = p_pedido_id;
    return 'cancelado';
  end if;
end;
$$;

revoke all on function cancelar_corrida_entregador(uuid, text) from public, anon;
grant execute on function cancelar_corrida_entregador(uuid, text) to authenticated;
