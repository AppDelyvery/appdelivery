-- 0024 — WEBHOOK DE STATUS (push pro sistema do lojista, fecha a integração).
-- Quando o status do pedido muda, a gente faz um POST no webhook_url do lojista
-- com assinatura HMAC. Usa pg_net (HTTP assíncrono do Postgres) — fire-and-forget.

create extension if not exists pg_net;

alter table estabelecimentos add column if not exists webhook_url text;
alter table estabelecimentos add column if not exists webhook_secret text;

-- Lojista define/atualiza o webhook. Gera o secret na 1ª vez e o retorna (1x).
create or replace function salvar_webhook(p_url text)
returns text
language plpgsql security definer
set search_path = public, extensions
as $$
declare v_est uuid; v_secret text; v_atual text;
begin
  select id, webhook_secret into v_est, v_atual from estabelecimentos where profile_id = auth.uid();
  if v_est is null then raise exception 'sem estabelecimento'; end if;

  if v_atual is null then
    v_secret := 'whsec_' || encode(gen_random_bytes(24), 'hex');
  else
    v_secret := v_atual;
  end if;

  update estabelecimentos set webhook_url = nullif(btrim(p_url), ''), webhook_secret = v_secret where id = v_est;
  -- só devolve o secret quando acabou de criar
  return case when v_atual is null then v_secret else null end;
end;
$$;

-- Gatilho: dispara o POST quando o status muda
create or replace function disparar_webhook() returns trigger
language plpgsql security definer
set search_path = public, extensions
as $$
declare v_url text; v_secret text; v_occ text; v_sig text; v_body jsonb;
begin
  if new.status is not distinct from old.status then return new; end if;

  select webhook_url, webhook_secret into v_url, v_secret
    from estabelecimentos where id = new.estabelecimento_id;
  if v_url is null or v_url = '' then return new; end if;

  v_occ := now()::text;
  -- assina uma string canônica (independe da serialização do body)
  v_sig := encode(hmac(new.id::text || ':' || new.status::text || ':' || v_occ, coalesce(v_secret, ''), 'sha256'), 'hex');

  v_body := jsonb_build_object(
    'event', 'pedido.status',
    'pedido_id', new.id,
    'status', new.status,
    'tracking_token', new.tracking_token,
    'aceito_at', new.aceito_at,
    'coletado_at', new.coletado_at,
    'entregue_at', new.entregue_at,
    'occurred_at', v_occ
  );

  perform net.http_post(
    url := v_url,
    body := v_body,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Appdly-Event', new.status::text,
      'X-Appdly-Signature', v_sig
    ),
    timeout_milliseconds := 4000
  );
  return new;
end;
$$;

drop trigger if exists trg_webhook_status on pedidos;
create trigger trg_webhook_status
  after update of status on pedidos
  for each row execute function disparar_webhook();

revoke all on function salvar_webhook(text) from public, anon;
grant execute on function salvar_webhook(text) to authenticated;
