-- APPDELYVERY — EQUIPE MULTI-USUÁRIO do lojista. Rodar após 0041.
-- O dono (estabelecimentos.profile_id) convida funcionários com login próprio.
-- Dois papéis: GERENTE (acesso pleno) e OPERADOR (cria/acompanha entregas, SEM carteira/
-- financeiro nem chaves de API). O membro tem profiles.role = 'estabelecimento' (roteia /negocio);
-- o papel fino vive aqui. Tudo o que o membro acessa passa por função SECURITY DEFINER
-- (sem subquery na própria tabela em policy — regra do projeto).

-- ───────────────────────── tabela de membros ─────────────────────────
create table if not exists estabelecimento_membros (
  id                 uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references estabelecimentos(id) on delete cascade,
  profile_id         uuid not null references profiles(id) on delete cascade,
  papel              text not null default 'operador' check (papel in ('gerente','operador')),
  ativo              boolean not null default true,
  created_at         timestamptz default now(),
  unique (estabelecimento_id, profile_id)
);
create index if not exists estab_membros_profile_ix on estabelecimento_membros (profile_id) where ativo;

alter table estabelecimento_membros enable row level security;
-- Acesso do membro é sempre via RPC SECURITY DEFINER abaixo; direto só admin.
drop policy if exists membros_admin on estabelecimento_membros;
create policy membros_admin on estabelecimento_membros for all using (is_admin()) with check (is_admin());

-- ───────────────────────── resolvedores ─────────────────────────
-- estab do usuário logado: dono OU membro ativo (SECURITY DEFINER bypassa RLS → sem recursão)
create or replace function estab_do_usuario() returns uuid
language sql stable security definer set search_path = public as $$
  select id from estabelecimentos where profile_id = auth.uid()
  union all
  select estabelecimento_id from estabelecimento_membros where profile_id = auth.uid() and ativo
  limit 1;
$$;

-- acesso pleno (financeiro/API): dono OU gerente
create or replace function estab_pleno() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from estabelecimentos where profile_id = auth.uid())
      or exists (select 1 from estabelecimento_membros where profile_id = auth.uid() and ativo and papel = 'gerente');
$$;

-- pertence a um estab específico (qualquer papel) — usado em RLS/RPC de pedido
create or replace function estab_membro_de(p_estab uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from estabelecimentos where id = p_estab and profile_id = auth.uid())
      or exists (select 1 from estabelecimento_membros where estabelecimento_id = p_estab and profile_id = auth.uid() and ativo);
$$;

-- papel do usuário no negócio (pra UI esconder financeiro do operador)
create or replace function meu_papel_negocio() returns text
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from estabelecimentos where profile_id = auth.uid()) then 'dono'
    else (select papel from estabelecimento_membros where profile_id = auth.uid() and ativo limit 1)
  end;
$$;

grant execute on function estab_do_usuario() to authenticated;
grant execute on function estab_pleno() to authenticated;
grant execute on function estab_membro_de(uuid) to authenticated;
grant execute on function meu_papel_negocio() to authenticated;

-- ───────────────────────── RLS do lado negócio (inclui membros) ─────────────────────────
-- estabelecimentos: dono faz tudo; membro (gerente/operador) pode LER a row.
drop policy if exists estab_owner_all on estabelecimentos;
drop policy if exists estab_owner_cud on estabelecimentos;
drop policy if exists estab_member_sel on estabelecimentos;
create policy estab_owner_cud on estabelecimentos for all
  using (profile_id = auth.uid() or is_admin())
  with check (profile_id = auth.uid() or is_admin());
create policy estab_member_sel on estabelecimentos for select
  using (estab_membro_de(id) or is_admin());

-- pedidos: membro do estab (qualquer papel) cria/vê/atualiza; entregador designado idem; admin tudo.
drop policy if exists pedidos_party_sel on pedidos;
create policy pedidos_party_sel on pedidos for select using (
  is_admin()
  or estab_membro_de(estabelecimento_id)
  or exists (select 1 from entregadores e where e.id = pedidos.entregador_id and e.profile_id = auth.uid())
);
drop policy if exists pedidos_estab_ins on pedidos;
create policy pedidos_estab_ins on pedidos for insert with check (
  is_admin() or estab_membro_de(estabelecimento_id)
);
drop policy if exists pedidos_party_upd on pedidos;
create policy pedidos_party_upd on pedidos for update using (
  is_admin()
  or estab_membro_de(estabelecimento_id)
  or exists (select 1 from entregadores e where e.id = pedidos.entregador_id and e.profile_id = auth.uid())
);

-- mensagens (chat): membro do estab participa.
drop policy if exists msg_party_sel on mensagens;
create policy msg_party_sel on mensagens for select using (
  is_admin()
  or exists (select 1 from pedidos p where p.id = pedido_id and estab_membro_de(p.estabelecimento_id))
  or exists (select 1 from pedidos p join entregadores en on en.id = p.entregador_id
             where p.id = pedido_id and en.profile_id = auth.uid())
);
drop policy if exists msg_party_ins on mensagens;
create policy msg_party_ins on mensagens for insert with check (
  is_admin()
  or (autor_papel = 'estabelecimento' and exists (
        select 1 from pedidos p where p.id = pedido_id and estab_membro_de(p.estabelecimento_id)))
  or (autor_papel = 'entregador' and exists (
        select 1 from pedidos p join entregadores en on en.id = p.entregador_id
        where p.id = pedido_id and en.profile_id = auth.uid()))
);

-- disputas: membro do estab vê as do próprio negócio.
drop policy if exists disputa_party_sel on disputas;
create policy disputa_party_sel on disputas for select using (
  exists (select 1 from pedidos p where p.id = pedido_id and estab_membro_de(p.estabelecimento_id))
  or exists (select 1 from pedidos p join entregadores en on en.id = p.entregador_id where p.id = pedido_id and en.profile_id = auth.uid())
);

-- chaves_api: SÓ gerente/dono (integração é acesso pleno).
drop policy if exists chaves_api_owner on chaves_api;
create policy chaves_api_owner on chaves_api for all
  using (is_admin() or (estab_pleno() and estabelecimento_id = estab_do_usuario()))
  with check (is_admin() or (estab_pleno() and estabelecimento_id = estab_do_usuario()));

-- recargas (carteira): SÓ gerente/dono (financeiro).
drop policy if exists recargas_own_sel on recargas;
create policy recargas_own_sel on recargas for select
  using ((estab_pleno() and estabelecimento_id = estab_do_usuario()) or is_admin());
drop policy if exists recargas_own_ins on recargas;
create policy recargas_own_ins on recargas for insert
  with check (estab_pleno() and estabelecimento_id = estab_do_usuario());

-- ───────────────────────── RPCs operacionais (qualquer membro) ─────────────────────────
-- cancelar pedido (0018) — operador pode
create or replace function cancelar_pedido_estabelecimento(p_pedido_id uuid, p_motivo text)
returns text language plpgsql security definer set search_path = public as $$
declare v_status text;
begin
  if coalesce(btrim(p_motivo),'') = '' then raise exception 'motivo obrigatorio'; end if;
  select p.status into v_status from pedidos p
   where p.id = p_pedido_id and estab_membro_de(p.estabelecimento_id);
  if v_status is null then raise exception 'pedido nao e seu'; end if;
  if v_status not in ('rascunho','buscando','aceito','a_caminho_coleta') then
    raise exception 'nao da pra cancelar nesta etapa';
  end if;
  insert into cancelamentos (pedido_id, por, motivo, status_antes)
    values (p_pedido_id, 'estabelecimento', btrim(p_motivo), v_status);
  update pedidos set status = 'cancelado', entregador_id = null where id = p_pedido_id;
  return 'cancelado';
end; $$;

-- ver status do pedido (0022) — operador pode
create or replace function status_pedido_negocio(p_pedido_id uuid)
returns jsonb language plpgsql security definer stable set search_path = public as $$
declare v_ok boolean; v_res jsonb;
begin
  select exists (
    select 1 from pedidos p where p.id = p_pedido_id and (estab_membro_de(p.estabelecimento_id) or is_admin())
  ) into v_ok;
  if not v_ok then raise exception 'pedido nao e seu'; end if;
  select jsonb_build_object(
           'status', p.status, 'tracking_token', p.tracking_token,
           'aceito_at', p.aceito_at, 'coletado_at', p.coletado_at, 'entregue_at', p.entregue_at,
           'entregador', case when en.id is null then null else jsonb_build_object(
             'nome', en.nome, 'vehicle_type', en.vehicle_type, 'placa', en.placa, 'rating', en.rating) end
         ) into v_res
  from pedidos p left join entregadores en on en.id = p.entregador_id
  where p.id = p_pedido_id;
  return v_res;
end; $$;

-- avaliações do negócio: ver (operador pode ver reputação)
create or replace function minhas_avaliacoes_negocio()
returns table(nota int, comentario text, created_at timestamptz)
language sql security definer stable set search_path = public as $$
  select a.nota, a.comentario, a.created_at
  from avaliacoes a join pedidos p on p.id = a.pedido_id
  where p.estabelecimento_id = estab_do_usuario() and a.de_papel = 'entregador' and a.created_at < current_date
  order by a.created_at desc;
$$;

-- registrar avaliação: branch do estabelecimento agora aceita membro
create or replace function registrar_avaliacao(p_pedido_id uuid, p_nota int, p_comentario text, p_de_papel text)
returns text language plpgsql security definer set search_path = public as $$
declare v_ent uuid; v_est uuid; v_media numeric;
begin
  if p_nota < 1 or p_nota > 5 then return 'nota-invalida'; end if;
  select entregador_id, estabelecimento_id into v_ent, v_est from pedidos where id = p_pedido_id;
  if p_de_papel = 'entregador' then
    if not exists (select 1 from entregadores where id = v_ent and profile_id = auth.uid()) then return 'nao-autorizado'; end if;
  elsif p_de_papel = 'estabelecimento' then
    if not estab_membro_de(v_est) then return 'nao-autorizado'; end if;
  else
    return 'papel-invalido';
  end if;
  insert into avaliacoes (pedido_id, nota, comentario, de_papel)
    values (p_pedido_id, p_nota, nullif(trim(p_comentario), ''), p_de_papel)
    on conflict (pedido_id, de_papel) do update set nota = excluded.nota, comentario = excluded.comentario;
  if p_de_papel = 'estabelecimento' then
    select round(avg(a.nota)::numeric, 1) into v_media from avaliacoes a join pedidos p on p.id = a.pedido_id
      where p.entregador_id = v_ent and a.de_papel in ('estabelecimento', 'cliente') and a.created_at < current_date;
    update entregadores set rating = coalesce(v_media, 5.0) where id = v_ent;
  else
    select round(avg(a.nota)::numeric, 1) into v_media from avaliacoes a join pedidos p on p.id = a.pedido_id
      where p.estabelecimento_id = v_est and a.de_papel = 'entregador' and a.created_at < current_date;
    update estabelecimentos set rating = coalesce(v_media, 5.0) where id = v_est;
  end if;
  return 'ok';
end; $$;

-- ───────────────────────── RPCs financeiros/gestão (SÓ gerente/dono) ─────────────────────────
-- editar negócio (0040)
create or replace function atualizar_meu_negocio(p_razao_social text, p_endereco text, p_telefone text)
returns void language plpgsql security definer set search_path = public as $$
declare v_est uuid;
begin
  if not estab_pleno() then raise exception 'sem permissao'; end if;
  v_est := estab_do_usuario();
  if v_est is null then raise exception 'sem estabelecimento'; end if;
  update estabelecimentos set
    razao_social = coalesce(nullif(btrim(p_razao_social), ''), razao_social),
    endereco     = nullif(btrim(p_endereco), ''),
    telefone     = nullif(btrim(p_telefone), '')
  where id = v_est;
end; $$;

-- extrato da carteira (0039)
create or replace function minhas_transacoes_carteira()
returns table(tipo text, valor numeric, pedido_id uuid, created_at timestamptz)
language sql security definer stable set search_path = public as $$
  select t.tipo, t.valor, t.pedido_id, t.created_at
  from carteira_transacoes t
  where estab_pleno() and t.estabelecimento_id = estab_do_usuario()
  order by t.created_at desc
  limit 100;
$$;

-- gerar chave de API (0023)
create or replace function criar_chave_api(p_nome text default null)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare v_est uuid; v_key text;
begin
  if not estab_pleno() then raise exception 'sem permissao'; end if;
  v_est := estab_do_usuario();
  if v_est is null then raise exception 'sem estabelecimento'; end if;
  v_key := 'appdly_live_' || encode(gen_random_bytes(24), 'hex');
  insert into chaves_api (estabelecimento_id, key_hash, prefixo, nome)
    values (v_est, hash_chave(v_key), substring(v_key, 1, 18) || '…', p_nome);
  return v_key;
end; $$;

-- salvar webhook (0024)
create or replace function salvar_webhook(p_url text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare v_est uuid; v_secret text; v_atual text;
begin
  if not estab_pleno() then raise exception 'sem permissao'; end if;
  select id, webhook_secret into v_est, v_atual from estabelecimentos where id = estab_do_usuario();
  if v_est is null then raise exception 'sem estabelecimento'; end if;
  if v_atual is null then
    v_secret := 'whsec_' || encode(gen_random_bytes(24), 'hex');
  else
    v_secret := v_atual;
  end if;
  update estabelecimentos set webhook_url = nullif(btrim(p_url), ''), webhook_secret = v_secret where id = v_est;
  return case when v_atual is null then v_secret else null end;
end; $$;

-- ───────────────────────── gestão da equipe (gerente/dono) ─────────────────────────
-- listar membros (com nome e e-mail) — só gerente/dono
create or replace function listar_membros()
returns table(profile_id uuid, nome text, email text, papel text, ativo boolean, created_at timestamptz)
language sql security definer stable set search_path = public as $$
  select m.profile_id, pr.nome, u.email::text, m.papel, m.ativo, m.created_at
  from estabelecimento_membros m
  join profiles pr on pr.id = m.profile_id
  left join auth.users u on u.id = m.profile_id
  where estab_pleno() and m.estabelecimento_id = estab_do_usuario()
  order by m.created_at;
$$;

-- ativar/desativar ou trocar papel de um membro — só gerente/dono, só no próprio negócio
create or replace function definir_membro(p_profile_id uuid, p_ativo boolean, p_papel text)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not estab_pleno() then return 'sem-permissao'; end if;
  if p_papel is not null and p_papel not in ('gerente','operador') then return 'papel-invalido'; end if;
  update estabelecimento_membros
     set ativo = coalesce(p_ativo, ativo),
         papel = coalesce(nullif(p_papel, ''), papel)
   where profile_id = p_profile_id and estabelecimento_id = estab_do_usuario();
  if not found then return 'nao-encontrado'; end if;
  return 'ok';
end; $$;

grant execute on function listar_membros() to authenticated;
grant execute on function definir_membro(uuid, boolean, text) to authenticated;
