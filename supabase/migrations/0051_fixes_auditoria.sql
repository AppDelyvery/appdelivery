-- 0051 — Correções dos bugs reais achados na auditoria da operação densa (Palmas, 27/06).
-- NÃO mexe em dinheiro (split/estorno/saque já provados corretos). Corrige contadores, ciclo de
-- oferta, invariante de despacho, accountability de chat e timestamp de disputa.

-- ============================================================================
-- 1) total_entregas nunca incrementava (creditar_entregador só mexia em saldo).
--    Conta a entrega FORA do gate cobranca_ativa (é métrica, não dinheiro).
-- ============================================================================
create or replace function creditar_entregador() returns trigger
language plpgsql security definer as $$
declare v_ativa boolean;
begin
  if new.status = 'entregue' and old.status is distinct from 'entregue' and new.entregador_id is not null then
    update entregadores set total_entregas = coalesce(total_entregas, 0) + 1 where id = new.entregador_id;
    select cobranca_ativa into v_ativa from config where id = 1;
    if v_ativa is true then
      update entregadores set saldo = coalesce(saldo, 0) + coalesce(new.preco_entregador, 0) where id = new.entregador_id;
      insert into pagamentos (pedido_id, metodo, valor, taxa, status, pago_at)
        values (new.id, 'carteira', coalesce(new.preco_entregador, 0), coalesce(new.preco_plataforma, 0), 'pago', now());
    end if;
  end if;
  return new;
end; $$;
-- backfill histórico
update entregadores e set total_entregas = (select count(*) from pedidos p where p.entregador_id = e.id and p.status = 'entregue');

-- ============================================================================
-- 2) aceitar_corrida: marcar a oferta como 'aceita' (ciclo morria em 'expirada')
--    + 3) invariante "um pedido ativo por entregador" (existia só no ofertar_proximo)
-- ============================================================================
create or replace function aceitar_corrida(p_pedido_id uuid) returns text
language plpgsql security definer as $$
declare v_ent uuid; v_ent_veic vehicle_type; v_ped_veic vehicle_type;
begin
  select id, vehicle_type into v_ent, v_ent_veic
    from entregadores where profile_id = auth.uid() and status = 'aprovado';
  if v_ent is null then return 'nao-aprovado'; end if;

  -- um pedido ativo por vez (mesma exclusão do ofertar_proximo)
  if exists (select 1 from pedidos where entregador_id = v_ent
             and status in ('aceito','a_caminho_coleta','coletado','a_caminho_entrega')) then
    return 'ocupado';
  end if;

  select vehicle_type into v_ped_veic from pedidos
   where id = p_pedido_id and status = 'buscando' and entregador_id is null;
  if v_ped_veic is null then return 'indisponivel'; end if;
  if v_ped_veic <> v_ent_veic then return 'veiculo-incompativel'; end if;

  update pedidos set entregador_id = v_ent, status = 'aceito', aceito_at = now()
   where id = p_pedido_id and status = 'buscando' and entregador_id is null;
  if not found then return 'indisponivel'; end if;

  -- fecha o ciclo da oferta: a do aceitante vira 'aceita', as demais do pedido expiram
  update ofertas set status = 'aceita', respondida_at = now()
    where pedido_id = p_pedido_id and entregador_id = v_ent and status = 'ofertada';
  update ofertas set status = 'expirada'
    where pedido_id = p_pedido_id and status = 'ofertada';
  return 'ok';
end; $$;

-- ============================================================================
-- 4) Chat: autor_id nunca era gravado (forjável / não-rastreável). Pin = auth.uid()
--    para inserts autenticados; anônimo (cliente via tracking_token) segue NULL.
-- ============================================================================
create or replace function pin_autor_mensagem() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null then new.autor_id := auth.uid(); end if;
  return new;
end; $$;
drop trigger if exists trg_pin_autor_mensagem on mensagens;
create trigger trg_pin_autor_mensagem before insert on mensagens
  for each row execute function pin_autor_mensagem();

-- ============================================================================
-- 5) Disputas: resolvida_at não era setado ao resolver (inviabiliza SLA).
-- ============================================================================
create or replace function set_disputa_resolvida_at() returns trigger
language plpgsql as $$
begin
  if new.status = 'resolvida' and old.status is distinct from 'resolvida' and new.resolvida_at is null then
    new.resolvida_at := now();
  end if;
  return new;
end; $$;
drop trigger if exists trg_disputa_resolvida_at on disputas;
create trigger trg_disputa_resolvida_at before update on disputas
  for each row execute function set_disputa_resolvida_at();
-- backfill: usa created_at como proxy do histórico já resolvido sem timestamp
update disputas set resolvida_at = created_at where status = 'resolvida' and resolvida_at is null;
