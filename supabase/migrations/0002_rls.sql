-- APPDELYVERY — RLS v1 (baseline). Rodar DEPOIS do 0001.
-- Regra: nada de subquery na PRÓPRIA tabela dentro de policy → usar auth_role() SECURITY DEFINER.
-- Iterar quando o auth real (cadastro/login) entrar.

-- Helpers (bypassam RLS por serem SECURITY DEFINER → sem recursão)
create or replace function auth_role() returns user_role
language sql security definer stable as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_admin() returns boolean
language sql security definer stable as $$
  select coalesce(auth_role() in ('admin','operador'), false);
$$;

-- Ativar RLS em todas as tabelas
alter table profiles            enable row level security;
alter table estabelecimentos    enable row level security;
alter table entregadores        enable row level security;
alter table entregador_documentos enable row level security;
alter table verificacoes        enable row level security;
alter table pedidos             enable row level security;
alter table ofertas             enable row level security;
alter table rastreios           enable row level security;
alter table comprovantes        enable row level security;
alter table pagamentos          enable row level security;
alter table avaliacoes          enable row level security;
alter table carteira_transacoes enable row level security;

-- profiles: cada um vê/edita o seu; admin vê tudo
create policy profiles_self_sel on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_self_ins on profiles for insert with check (id = auth.uid());
create policy profiles_self_upd on profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- estabelecimentos: dono (profile_id) + admin
create policy estab_owner_all on estabelecimentos for all
  using (profile_id = auth.uid() or is_admin())
  with check (profile_id = auth.uid() or is_admin());

-- entregadores: o próprio + admin
create policy entreg_owner_all on entregadores for all
  using (profile_id = auth.uid() or is_admin())
  with check (profile_id = auth.uid() or is_admin());

-- documentos do entregador: dono (join em entregadores — outra tabela, ok) + admin
create policy entdoc_owner_all on entregador_documentos for all
  using (is_admin() or exists (select 1 from entregadores e where e.id = entregador_id and e.profile_id = auth.uid()))
  with check (is_admin() or exists (select 1 from entregadores e where e.id = entregador_id and e.profile_id = auth.uid()));

-- verificações: dado sensível LGPD → SÓ admin
create policy verif_admin_only on verificacoes for all using (is_admin()) with check (is_admin());

-- pedidos: estabelecimento dono OU entregador designado OU admin
create policy pedidos_party_sel on pedidos for select using (
  is_admin()
  or exists (select 1 from estabelecimentos est where est.id = estabelecimento_id and est.profile_id = auth.uid())
  or exists (select 1 from entregadores e where e.id = pedidos.entregador_id and e.profile_id = auth.uid())
);
create policy pedidos_estab_ins on pedidos for insert with check (
  is_admin()
  or exists (select 1 from estabelecimentos est where est.id = estabelecimento_id and est.profile_id = auth.uid())
);
create policy pedidos_party_upd on pedidos for update using (
  is_admin()
  or exists (select 1 from estabelecimentos est where est.id = estabelecimento_id and est.profile_id = auth.uid())
  or exists (select 1 from entregadores e where e.id = pedidos.entregador_id and e.profile_id = auth.uid())
);

-- ofertas/rastreios/comprovantes/pagamentos/avaliacoes/carteira:
-- baseline v1 = admin total (party-level refina junto com o auth real)
create policy ofertas_admin    on ofertas            for all using (is_admin()) with check (is_admin());
create policy rastreios_admin  on rastreios          for all using (is_admin()) with check (is_admin());
create policy comprov_admin    on comprovantes       for all using (is_admin()) with check (is_admin());
create policy pagamentos_admin on pagamentos         for all using (is_admin()) with check (is_admin());
create policy avaliacoes_admin on avaliacoes         for all using (is_admin()) with check (is_admin());
create policy carteira_admin   on carteira_transacoes for all using (is_admin()) with check (is_admin());

-- Rastreio público (cliente final): SEM login. SECURITY DEFINER devolve só o mínimo.
create or replace function get_rastreio_publico(p_token uuid)
returns table(status pedido_status, entregador_nome text, lat double precision, lng double precision, atualizado timestamptz)
language sql security definer stable as $$
  select p.status,
         e.nome,
         r.lat, r.lng, r.created_at
  from pedidos p
  left join entregadores e on e.id = p.entregador_id
  left join lateral (
    select lat, lng, created_at from rastreios where pedido_id = p.id order by created_at desc limit 1
  ) r on true
  where p.tracking_token = p_token;
$$;
grant execute on function get_rastreio_publico(uuid) to anon, authenticated;
