-- APPDELYVERY — hardening de RLS (FECHA 2 furos provados pela auditoria 02/06).
-- Rodar DEPOIS do 0003. Usa is_admin() (0002).
-- Furos: (1) usuário se auto-promovia a admin; (2) dono setava o próprio pedido p/ 'entregue' sem evidência.

-- (1) Papel privilegiado é blindado: usuário comum não cria nem assume admin/operador,
--     nem troca o próprio papel. Seed de admin só via SQL Editor/service (auth.uid() null) ou por outro admin.
create or replace function guard_profile_role() returns trigger
language plpgsql security definer as $$
begin
  if auth.uid() is null then return new; end if;     -- SQL Editor / service role: permite seed
  if is_admin() then return new; end if;             -- admin pode promover/ajustar
  if tg_op = 'INSERT' and new.role in ('admin','operador') then
    raise exception 'cadastro com papel privilegiado nao permitido';
  end if;
  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    new.role := old.role;                            -- reverte tentativa de escalonamento
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_profile_role on profiles;
create trigger trg_guard_profile_role
  before insert or update on profiles
  for each row execute function guard_profile_role();

-- (2) Estados que exigem evidência (coletado/entregue) só via server-side (service role) ou admin.
--     O dono/entregador não consegue "pular" pra entregue sem foto/assinatura.
create or replace function guard_pedido_status() returns trigger
language plpgsql security definer as $$
begin
  if auth.uid() is null or is_admin() then return new; end if;
  if tg_op = 'UPDATE' and new.status is distinct from old.status
     and new.status in ('coletado','entregue') then
    raise exception 'status % exige evidencia (registrarColeta/registrarEntrega no server)', new.status;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_pedido_status on pedidos;
create trigger trg_guard_pedido_status
  before update on pedidos
  for each row execute function guard_pedido_status();

-- Seed do admin (rode UMA vez, troque pelo id do dono — pega em auth.users):
-- update profiles set role='admin' where id='<uuid-do-dono>';
