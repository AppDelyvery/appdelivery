-- APPDELYVERY — chat por pedido (3 pontas: lojista, entregador, cliente final). Rodar no SQL Editor.
-- Lojista/entregador conversam autenticados (RLS); cliente final escreve/lê pelo TOKEN do rastreio (sem login).

create table mensagens (
  id          uuid primary key default gen_random_uuid(),
  pedido_id   uuid not null references pedidos(id) on delete cascade,
  autor_papel text not null check (autor_papel in ('estabelecimento','entregador','cliente_final')),
  autor_id    uuid references profiles(id),   -- null p/ cliente_final (sem conta)
  texto       text not null check (length(texto) between 1 and 1000),
  created_at  timestamptz default now()
);
create index mensagens_pedido_ix on mensagens (pedido_id, created_at);

alter table mensagens enable row level security;

-- Leitura: partes do pedido (lojista dono, entregador designado) ou admin.
create policy msg_party_sel on mensagens for select using (
  is_admin()
  or exists (select 1 from pedidos p join estabelecimentos e on e.id = p.estabelecimento_id
             where p.id = pedido_id and e.profile_id = auth.uid())
  or exists (select 1 from pedidos p join entregadores en on en.id = p.entregador_id
             where p.id = pedido_id and en.profile_id = auth.uid())
);

-- Escrita: o papel declarado TEM que bater com a pessoa (sem spoofing). cliente_final só via função pública.
create policy msg_party_ins on mensagens for insert with check (
  is_admin()
  or (autor_papel = 'estabelecimento' and exists (
        select 1 from pedidos p join estabelecimentos e on e.id = p.estabelecimento_id
        where p.id = pedido_id and e.profile_id = auth.uid()))
  or (autor_papel = 'entregador' and exists (
        select 1 from pedidos p join entregadores en on en.id = p.entregador_id
        where p.id = pedido_id and en.profile_id = auth.uid()))
);

-- Cliente final lê pelo token (sem login)
create or replace function ler_mensagens_rastreio(p_token uuid)
returns table(autor_papel text, texto text, created_at timestamptz)
language sql security definer stable as $$
  select m.autor_papel, m.texto, m.created_at
  from mensagens m join pedidos p on p.id = m.pedido_id
  where p.tracking_token = p_token
  order by m.created_at;
$$;

-- Cliente final escreve pelo token (sem login) — papel fixado em 'cliente_final'
create or replace function enviar_mensagem_rastreio(p_token uuid, p_texto text)
returns void language plpgsql security definer as $$
declare pid uuid;
begin
  select id into pid from pedidos where tracking_token = p_token;
  if pid is null then raise exception 'token invalido'; end if;
  if p_texto is null or length(p_texto) < 1 or length(p_texto) > 1000 then raise exception 'texto invalido'; end if;
  insert into mensagens (pedido_id, autor_papel, texto) values (pid, 'cliente_final', p_texto);
end;
$$;

grant execute on function ler_mensagens_rastreio(uuid) to anon, authenticated;
grant execute on function enviar_mensagem_rastreio(uuid, text) to anon, authenticated;
