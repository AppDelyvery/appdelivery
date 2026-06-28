-- 0058 — Controle operacional #5: taxa de cancelamento + compensação do entregador.
-- Quando o LOJISTA cancela com entregador já designado, retém taxa_cancelamento do estorno e
-- repassa como compensação pro entregador deslocado. Default 0 = estorno cheio (comportamento atual).
-- Admin/entregador/sistema cancelando NÃO cobram taxa (estorno cheio).

alter table config add column if not exists taxa_cancelamento numeric default 0; -- R$ retido qdo lojista cancela c/ entregador
alter type pag_metodo add value if not exists 'compensacao'; -- compensação de cancelamento pro entregador

create or replace function estornar_pedido() returns trigger
language plpgsql security definer as $$
declare v_ativa boolean; v_liq numeric; v_por text; v_fee numeric := 0; v_taxa numeric;
begin
  select cobranca_ativa into v_ativa from config where id = 1;
  if v_ativa is not true then return new; end if;

  if new.status = 'cancelado' and old.status is distinct from 'cancelado' then
    select coalesce(sum(case when tipo = 'debito' then valor else -valor end), 0) into v_liq
      from carteira_transacoes where pedido_id = new.id;

    if v_liq > 0 then
      -- taxa só quando QUEM cancelou foi o lojista e havia entregador designado
      select por into v_por from cancelamentos where pedido_id = new.id order by created_at desc limit 1;
      if v_por = 'estabelecimento' and old.entregador_id is not null
         and old.status in ('aceito', 'a_caminho_coleta', 'coletado', 'a_caminho_entrega') then
        select coalesce(taxa_cancelamento, 0) into v_taxa from config where id = 1;
        v_fee := least(greatest(v_taxa, 0), v_liq);
      end if;

      -- estorna o lojista (líquido menos a taxa)
      if v_liq - v_fee > 0 then
        update estabelecimentos set saldo_carteira = saldo_carteira + (v_liq - v_fee) where id = new.estabelecimento_id;
        insert into carteira_transacoes (estabelecimento_id, tipo, valor, pedido_id)
          values (new.estabelecimento_id, 'credito', v_liq - v_fee, new.id);
      end if;

      -- compensa o entregador deslocado
      if v_fee > 0 then
        update entregadores set saldo = coalesce(saldo, 0) + v_fee where id = old.entregador_id;
        insert into pagamentos (pedido_id, metodo, valor, taxa, status, pago_at)
          values (new.id, 'compensacao', v_fee, 0, 'pago', now());
      end if;
    end if;
  end if;
  return new;
end; $$;
