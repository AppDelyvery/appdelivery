-- APPDELYVERY — trava anti-auto-aprovação do entregador (FECHA FURO real, provado 02/06).
-- Sem isto, o entregador seta o próprio status='aprovado' via API e pega corrida sem verificação.
-- Rodar DEPOIS do 0002. Usa is_admin() do 0002.

create or replace function guard_entregador_update() returns trigger
language plpgsql security definer as $$
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
  new.asaas_subconta_id := old.asaas_subconta_id;
  return new;
end;
$$;

drop trigger if exists trg_guard_entregador on entregadores;
create trigger trg_guard_entregador
  before update on entregadores
  for each row execute function guard_entregador_update();
