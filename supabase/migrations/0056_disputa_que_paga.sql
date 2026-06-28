-- 0056 — Controle operacional #3: disputa que PAGA. Resolver disputa deixa de ser só texto:
-- o admin pode devolver frete (total/parcial) pra carteira do lojista, com trilha em carteira_transacoes.

alter table disputas add column if not exists valor_reembolso numeric not null default 0;

create or replace function resolver_disputa(p_disputa_id uuid, p_resolucao text, p_reembolso numeric default 0)
returns text language plpgsql security definer set search_path = public as $$
declare v_status text; v_pedido uuid; v_estab uuid; v_frete numeric;
begin
  if not is_admin() then return 'nao-autorizado'; end if;

  select d.status::text, d.pedido_id into v_status, v_pedido from disputas d where d.id = p_disputa_id;
  if v_pedido is null then return 'nao-encontrada'; end if;
  if v_status = 'resolvida' then return 'ja-resolvida'; end if;

  select p.estabelecimento_id, coalesce(p.preco_total, 0) into v_estab, v_frete from pedidos p where p.id = v_pedido;

  p_reembolso := coalesce(p_reembolso, 0);
  if p_reembolso < 0 then return 'reembolso-invalido'; end if;
  if p_reembolso > v_frete then return 'reembolso-acima-do-frete'; end if;

  if p_reembolso > 0 then
    update estabelecimentos set saldo_carteira = coalesce(saldo_carteira, 0) + p_reembolso where id = v_estab;
    insert into carteira_transacoes (estabelecimento_id, tipo, valor, pedido_id)
      values (v_estab, 'reembolso', p_reembolso, v_pedido);
  end if;

  update disputas set status = 'resolvida',
    resolucao = coalesce(nullif(trim(p_resolucao), ''), 'Resolvido pela operação.'),
    resolvida_at = now(), valor_reembolso = p_reembolso
  where id = p_disputa_id;

  return 'ok';
end; $$;

grant execute on function resolver_disputa(uuid, text, numeric) to authenticated;
