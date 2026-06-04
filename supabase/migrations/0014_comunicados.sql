-- 0014 — Comunicados (broadcast do admin pra entregadores/negócios).
-- Admin compõe; entregador/lojista lê os destinados ao seu papel. Sem push
-- externo ainda (entra com Zenvia/FCM depois) — por ora é mural in-app.

create table if not exists comunicados (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null,
  corpo       text not null,
  alvo        text not null default 'todos' check (alvo in ('todos','entregadores','negocios')),
  criado_por  uuid references profiles(id),
  created_at  timestamptz default now()
);
create index if not exists comunicados_alvo_ix on comunicados (alvo, created_at desc);

alter table comunicados enable row level security;

drop policy if exists comunicados_admin on comunicados;
create policy comunicados_admin on comunicados for all using (is_admin()) with check (is_admin());

-- leitura por papel: 'todos', ou o alvo bate com o papel do usuário
drop policy if exists comunicados_leitura on comunicados;
create policy comunicados_leitura on comunicados for select using (
  alvo = 'todos'
  or (alvo = 'entregadores' and auth_role() = 'entregador')
  or (alvo = 'negocios' and auth_role() = 'estabelecimento')
);

-- envio: só admin. SECURITY DEFINER pra carimbar criado_por sem depender de RLS de insert.
create or replace function enviar_comunicado(p_titulo text, p_corpo text, p_alvo text default 'todos')
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not is_admin() then
    raise exception 'apenas admin';
  end if;
  if p_alvo not in ('todos','entregadores','negocios') then
    raise exception 'alvo invalido';
  end if;
  if coalesce(btrim(p_titulo), '') = '' or coalesce(btrim(p_corpo), '') = '' then
    raise exception 'titulo e corpo obrigatorios';
  end if;
  insert into comunicados (titulo, corpo, alvo, criado_por)
    values (btrim(p_titulo), btrim(p_corpo), p_alvo, auth.uid())
    returning id into v_id;
  return v_id;
end;
$$;

revoke all on function enviar_comunicado(text, text, text) from public, anon;
grant execute on function enviar_comunicado(text, text, text) to authenticated;
