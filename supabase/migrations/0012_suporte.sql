-- APPDELYVERY — Suporte / Disputas. Negócio, entregador e cliente abrem chamado; admin resolve. Após 0011.

-- admin pode falar no chat como "suporte"
alter table mensagens drop constraint if exists mensagens_autor_papel_check;
alter table mensagens add constraint mensagens_autor_papel_check
  check (autor_papel in ('estabelecimento','entregador','cliente_final','suporte'));

-- disputas
do $$ begin
  create type disputa_status as enum ('aberta','em_analise','resolvida');
exception when duplicate_object then null; end $$;

create table if not exists disputas (
  id          uuid primary key default gen_random_uuid(),
  pedido_id   uuid references pedidos(id) on delete cascade,
  aberta_por  uuid references profiles(id),
  papel       text,
  tipo        text,
  descricao   text not null,
  status      disputa_status default 'aberta',
  resolucao   text,
  created_at  timestamptz default now(),
  resolvida_at timestamptz
);
create index if not exists disputas_status_ix on disputas (status, created_at);

alter table disputas enable row level security;
drop policy if exists disputa_admin on disputas;
drop policy if exists disputa_party_sel on disputas;
drop policy if exists disputa_party_ins on disputas;
create policy disputa_admin on disputas for all using (is_admin()) with check (is_admin());
create policy disputa_party_sel on disputas for select using (
  exists (select 1 from pedidos p join estabelecimentos e on e.id = p.estabelecimento_id where p.id = pedido_id and e.profile_id = auth.uid())
  or exists (select 1 from pedidos p join entregadores en on en.id = p.entregador_id where p.id = pedido_id and en.profile_id = auth.uid())
);
create policy disputa_party_ins on disputas for insert with check (aberta_por = auth.uid());

-- cliente final abre disputa pelo token (sem login)
create or replace function abrir_disputa_rastreio(p_token uuid, p_tipo text, p_descricao text)
returns text language plpgsql security definer as $$
declare pid uuid;
begin
  select id into pid from pedidos where tracking_token = p_token;
  if pid is null then return 'token-invalido'; end if;
  if length(coalesce(p_descricao,'')) < 1 then return 'descricao-vazia'; end if;
  insert into disputas (pedido_id, papel, tipo, descricao) values (pid, 'cliente_final', p_tipo, p_descricao);
  return 'ok';
end;
$$;
grant execute on function abrir_disputa_rastreio(uuid, text, text) to anon, authenticated;
