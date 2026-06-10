-- APPDELYVERY — split na conclusão: credita 80% ao entregador. Rodar após 0031.
-- Carteira interna do entregador (saldo a sacar). Sob a flag config.cobranca_ativa (OFF hoje).
-- O dinheiro já entrou na criação (débito do lojista); aqui ele é repartido na entrega concluída.

alter table entregadores add column if not exists saldo numeric(10,2) not null default 0;

create or replace function creditar_entregador() returns trigger
language plpgsql security definer as $$
declare v_ativa boolean;
begin
  select cobranca_ativa into v_ativa from config where id = 1;
  if v_ativa is not true then return new; end if;
  if new.status = 'entregue' and old.status is distinct from 'entregue' and new.entregador_id is not null then
    -- 80% pro entregador (carteira interna); 20% fica pra plataforma (taxa)
    update entregadores set saldo = coalesce(saldo, 0) + coalesce(new.preco_entregador, 0)
      where id = new.entregador_id;
    insert into pagamentos (pedido_id, metodo, valor, taxa, status, pago_at)
      values (new.id, 'carteira', coalesce(new.preco_entregador, 0), coalesce(new.preco_plataforma, 0), 'pago', now());
  end if;
  return new;
end; $$;

drop trigger if exists trg_creditar_entregador on pedidos;
create trigger trg_creditar_entregador after update on pedidos
  for each row execute function creditar_entregador();
