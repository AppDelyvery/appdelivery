-- 0045 — NOTIFICAÇÃO via Web Push (grátis, sem Meta/CNPJ). Rodar após 0044.
-- Evento no banco (nova oferta / mudança de status) → trigger chama nossa rota /api/notify/dispatch
-- via pg_net; a rota assina com VAPID e empurra a notificação. Tudo no-op até configurar a URL
-- (config.push_dispatch_url) e as chaves VAPID nas env vars — mesmo padrão do Asaas.

create extension if not exists pg_net;

-- onde a rota de dispatch vive + segredo compartilhado (o dono liga preenchendo isso)
alter table config add column if not exists push_dispatch_url    text;
alter table config add column if not exists push_dispatch_secret text;

-- assinaturas de push por usuário (uma por device/navegador)
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz default now()
);
create index if not exists push_subs_profile_ix on push_subscriptions (profile_id);

alter table push_subscriptions enable row level security;
drop policy if exists push_subs_own on push_subscriptions;
create policy push_subs_own on push_subscriptions for all
  using (profile_id = auth.uid() or is_admin())
  with check (profile_id = auth.uid());

-- cliente registra/atualiza a própria assinatura
create or replace function salvar_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into push_subscriptions (profile_id, endpoint, p256dh, auth)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set profile_id = excluded.profile_id, p256dh = excluded.p256dh, auth = excluded.auth;
end; $$;

create or replace function remover_push_subscription(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from push_subscriptions where endpoint = p_endpoint and profile_id = auth.uid();
$$;

grant execute on function salvar_push_subscription(text, text, text) to authenticated;
grant execute on function remover_push_subscription(text) to authenticated;

-- A rota chama isto (gated pelo segredo) e recebe as assinaturas + o conteúdo da notificação.
-- Sem o segredo certo, retorna vazio — por isso é seguro liberar pra anon (a rota usa anon key).
create or replace function subs_do_evento(p_secret text, p_tipo text, p_id uuid)
returns table(endpoint text, p256dh text, auth text, titulo text, corpo text, url text)
language plpgsql security definer set search_path = public as $$
declare v_secret text; v_status text; v_preco numeric; v_estab uuid; v_ent_profile uuid;
begin
  select push_dispatch_secret into v_secret from config where id = 1;
  if v_secret is null or p_secret is null or p_secret <> v_secret then return; end if;

  if p_tipo = 'oferta' then
    select e.profile_id, p.preco_entregador
      into v_ent_profile, v_preco
      from ofertas o join entregadores e on e.id = o.entregador_id
                     join pedidos p on p.id = o.pedido_id
     where o.id = p_id;
    if v_ent_profile is null then return; end if;
    return query
      select s.endpoint, s.p256dh, s.auth,
             'Nova entrega pra você'::text,
             ('Você recebe R$ ' || to_char(coalesce(v_preco,0), 'FM999990D00') || ' — toque pra aceitar')::text,
             '/entregador'::text
      from push_subscriptions s where s.profile_id = v_ent_profile;

  elsif p_tipo = 'status' then
    select p.status, p.estabelecimento_id into v_status, v_estab from pedidos p where p.id = p_id;
    if v_estab is null then return; end if;
    return query
      select s.endpoint, s.p256dh, s.auth,
             'Atualização da entrega'::text,
             (case v_status
                when 'aceito'    then 'Um entregador aceitou sua entrega'
                when 'coletado'  then 'Encomenda coletada pelo entregador'
                when 'entregue'  then 'Encomenda entregue ao destinatário'
                when 'cancelado' then 'A entrega foi cancelada'
                else 'Status: ' || v_status end)::text,
             '/negocio/historico'::text
      from push_subscriptions s
      where s.profile_id in (
        select profile_id from estabelecimentos where id = v_estab
        union
        select profile_id from estabelecimento_membros where estabelecimento_id = v_estab and ativo
      );
  end if;
end; $$;
grant execute on function subs_do_evento(text, text, uuid) to anon, authenticated;

-- a rota limpa assinaturas mortas (404/410) — gated pelo mesmo segredo
create or replace function limpar_push_mortas(p_secret text, p_endpoints text[])
returns void language plpgsql security definer set search_path = public as $$
declare v_secret text;
begin
  select push_dispatch_secret into v_secret from config where id = 1;
  if v_secret is null or p_secret is null or p_secret <> v_secret then return; end if;
  delete from push_subscriptions where endpoint = any(p_endpoints);
end; $$;
grant execute on function limpar_push_mortas(text, text[]) to anon, authenticated;

-- dispara o POST pra rota (no-op se a URL não estiver configurada)
create or replace function notificar_evento(p_tipo text, p_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_url text; v_secret text;
begin
  select push_dispatch_url, push_dispatch_secret into v_url, v_secret from config where id = 1;
  if v_url is null or v_url = '' then return; end if;
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('tipo', p_tipo, 'id', p_id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', coalesce(v_secret, '')),
    timeout_milliseconds := 4000
  );
end; $$;

-- gatilhos
create or replace function trg_notificar_oferta() returns trigger
language plpgsql security definer as $$
begin
  if new.status = 'ofertada' then perform notificar_evento('oferta', new.id); end if;
  return new;
end; $$;
drop trigger if exists trg_oferta_push on ofertas;
create trigger trg_oferta_push after insert on ofertas for each row execute function trg_notificar_oferta();

create or replace function trg_notificar_status() returns trigger
language plpgsql security definer as $$
begin
  if new.status is distinct from old.status and new.status in ('aceito','coletado','entregue','cancelado') then
    perform notificar_evento('status', new.id);
  end if;
  return new;
end; $$;
drop trigger if exists trg_status_push on pedidos;
create trigger trg_status_push after update of status on pedidos for each row execute function trg_notificar_status();
