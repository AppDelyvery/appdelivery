-- 0060 — Consentimentos (LGPD): aceite DEMONSTRÁVEL no cadastro.
-- O controlador precisa provar o aceite (versão + data + IP + dispositivo).
-- Append-only por desenho (valor probatório): cliente não atualiza/apaga; revogação
-- = nova linha aceito=false. Escrita só via RPC SECURITY DEFINER (captura o IP do
-- header do PostgREST). Leitura: o próprio titular + admin.

create table if not exists consentimentos (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references profiles(id) on delete cascade,
  tipo             text not null check (tipo in (
                     'termos_negocio','termos_entregador','privacidade',
                     'verificacao_sensivel','marketing'
                   )),
  documento_versao text not null,
  aceito           boolean not null,
  ip               text,
  user_agent       text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_consent_profile
  on consentimentos(profile_id, tipo, created_at desc);

alter table consentimentos enable row level security;

-- Leitura: titular + admin. SEM policy de insert/update/delete pro cliente →
-- append-only, gravação apenas pela RPC abaixo (SECURITY DEFINER bypassa RLS).
drop policy if exists consent_owner_sel on consentimentos;
create policy consent_owner_sel on consentimentos for select
  using (profile_id = auth.uid() or is_admin());

-- RPC de gravação. profile_id travado em auth.uid() (não confia no client).
-- IP vem do x-forwarded-for que o PostgREST expõe em request.headers; no runner
-- local esse GUC não existe → current_setting(...,true) devolve NULL e segue.
create or replace function registrar_consentimento(
  p_tipo             text,
  p_documento_versao text,
  p_aceito           boolean,
  p_user_agent       text default null
) returns uuid
language plpgsql security definer
set search_path = public as $$
declare
  v_id uuid;
  v_ip text;
begin
  if auth.uid() is null then
    raise exception 'sem sessão para registrar consentimento';
  end if;
  -- x-forwarded-for pode vir "ip_cliente, proxy1, ..." → pega o primeiro
  v_ip := nullif(btrim(split_part(
    coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''),
    ',', 1)), '');
  insert into consentimentos(profile_id, tipo, documento_versao, aceito, ip, user_agent)
  values (auth.uid(), p_tipo, p_documento_versao, p_aceito, v_ip, p_user_agent)
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function registrar_consentimento(text, text, boolean, text) to authenticated;
