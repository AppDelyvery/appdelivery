-- APPDELYVERY — débito/bloqueio na criação + estorno no cancelamento. Rodar após 0030.
-- TUDO sob a flag config.cobranca_ativa (default FALSE): só vale quando o Asaas estiver
-- ligado e a recarga creditar de verdade. Com a flag OFF, nada financeiro acontece (demo segue).

alter table config add column if not exists cobranca_ativa boolean not null default false;

-- Ao criar o pedido (status buscando): bloqueia se saldo < preço e debita a carteira do lojista.
create or replace function cobrar_pedido() returns trigger
language plpgsql security definer as $$
declare v_saldo numeric; v_ativa boolean;
begin
  select cobranca_ativa into v_ativa from config where id = 1;
  if v_ativa is not true then return new; end if;
  if new.status <> 'buscando' then return new; end if;
  select coalesce(saldo_carteira, 0) into v_saldo from estabelecimentos where id = new.estabelecimento_id for update;
  if v_saldo < new.preco_total then
    raise exception 'saldo-insuficiente';
  end if;
  update estabelecimentos set saldo_carteira = saldo_carteira - new.preco_total where id = new.estabelecimento_id;
  insert into carteira_transacoes (estabelecimento_id, tipo, valor, pedido_id)
    values (new.estabelecimento_id, 'debito', new.preco_total, new.id);
  return new;
end; $$;

drop trigger if exists trg_cobrar_pedido on pedidos;
create trigger trg_cobrar_pedido after insert on pedidos
  for each row execute function cobrar_pedido();

-- Ao cancelar: estorna o que foi debitado desse pedido (líquido), de forma idempotente.
create or replace function estornar_pedido() returns trigger
language plpgsql security definer as $$
declare v_ativa boolean; v_liq numeric;
begin
  select cobranca_ativa into v_ativa from config where id = 1;
  if v_ativa is not true then return new; end if;
  if new.status = 'cancelado' and old.status is distinct from 'cancelado' then
    select coalesce(sum(case when tipo = 'debito' then valor else -valor end), 0) into v_liq
      from carteira_transacoes where pedido_id = new.id;
    if v_liq > 0 then
      update estabelecimentos set saldo_carteira = saldo_carteira + v_liq where id = new.estabelecimento_id;
      insert into carteira_transacoes (estabelecimento_id, tipo, valor, pedido_id)
        values (new.estabelecimento_id, 'credito', v_liq, new.id);
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_estornar_pedido on pedidos;
create trigger trg_estornar_pedido after update on pedidos
  for each row execute function estornar_pedido();
