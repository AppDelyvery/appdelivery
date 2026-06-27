-- 0050 — Scaffold de subconta Asaas do entregador (modelo marketplace, repasse interno grátis).
-- O guard_entregador_update (0003) reverte asaas_subconta_id pra não-admin. Aqui abrimos uma
-- carve-out controlada por flag de sessão (mesmo padrão do app.via_registrar): só o RPled
-- abaixo liga o flag, então o entregador não consegue setar a subconta por fora.
-- Tudo dorme até a ASAAS_API_KEY existir (quem cria a subconta no Asaas é a action server-side).

-- 1) Guard com carve-out: asaas_subconta_id pode mudar quando app.set_subconta='on' (setado pelo RPC).
create or replace function guard_entregador_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- admin/operador pode tudo (aprova, ajusta rating, etc.)
  if is_admin() then
    return new;
  end if;

  -- não-admin (o próprio entregador): campos sensíveis são imutáveis,
  -- exceto a transição permitida cadastro -> em_verificacao (solicitar verificação).
  if new.status is distinct from old.status then
    if not (old.status = 'cadastro' and new.status = 'em_verificacao') then
      new.status := old.status;  -- reverte silenciosamente qualquer outra mudança de status
    end if;
  end if;
  new.rating := old.rating;
  new.total_entregas := old.total_entregas;
  -- asaas_subconta_id só muda via RPC definir_subconta_entregador (liga o flag); senão, imutável.
  if current_setting('app.set_subconta', true) is distinct from 'on' then
    new.asaas_subconta_id := old.asaas_subconta_id;
  end if;
  return new;
end; $$;

-- 2) RPC que grava o walletId da subconta. SECURITY DEFINER + checagem de dono (não dá pra setar a de outro).
create or replace function definir_subconta_entregador(p_entregador uuid, p_wallet text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if p_wallet is null or length(trim(p_wallet)) = 0 then return 'wallet-vazio'; end if;
  -- só o próprio entregador (ou admin) seta a própria subconta
  if not (is_admin() or exists (select 1 from entregadores where id = p_entregador and profile_id = auth.uid())) then
    return 'nao-autorizado';
  end if;
  perform set_config('app.set_subconta', 'on', true);  -- libera a carve-out do guard, só nesta transação
  update entregadores set asaas_subconta_id = p_wallet
    where id = p_entregador and asaas_subconta_id is null;  -- não sobrescreve uma subconta já existente
  if not found then return 'ja-tem-ou-nao-existe'; end if;
  return 'ok';
end; $$;
