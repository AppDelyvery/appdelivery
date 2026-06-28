-- 0053 — Financeiro honesto: separa de quem é o dinheiro (custódia) e mostra caixa LÍQUIDO
-- (take − taxas Asaas), não o take bruto. Resolve "olhar a conta e achar que tudo é do app".

-- taxas do Asaas (oficiais; ajustáveis na conta do Tulio) — base pra calcular a margem real
alter table config add column if not exists taxa_recarga_asaas numeric default 1.99; -- R$/recarga (Pix in)
alter table config add column if not exists taxa_saque_asaas   numeric default 2.00; -- R$/saque fora da franquia
alter table config add column if not exists saques_gratis_mes  integer default 100;  -- franquia PJ de transferências/mês

-- RPC admin: composição completa do saldo (custódia + caixa líquido + fluxo)
create or replace function composicao_financeira() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_passivo_loja numeric; v_passivo_ent numeric; v_take numeric; v_fretes numeric; v_n_entregue int;
  v_n_recargas int; v_recargas_total numeric; v_n_saques int; v_saques_total numeric; v_saques_proc numeric;
  v_taxa_recarga numeric; v_taxa_rec_total numeric;
begin
  if not is_admin() then return null; end if;
  select coalesce(taxa_recarga_asaas, 1.99) into v_taxa_recarga from config where id = 1;

  select coalesce(sum(saldo_carteira), 0) into v_passivo_loja from estabelecimentos;          -- dívida c/ lojistas
  select coalesce(sum(saldo), 0)          into v_passivo_ent  from entregadores;              -- dívida c/ entregadores
  select coalesce(sum(preco_plataforma), 0), coalesce(sum(preco_total), 0), count(*)
    into v_take, v_fretes, v_n_entregue from pedidos where status = 'entregue';               -- take bruto + movimentação
  select count(*), coalesce(sum(valor), 0) into v_n_recargas, v_recargas_total from recargas where status = 'pago';
  select count(*), coalesce(sum(valor), 0) into v_n_saques, v_saques_total from saques;
  select coalesce(sum(valor), 0) into v_saques_proc from saques where status = 'processando';
  v_taxa_rec_total := v_n_recargas * v_taxa_recarga;                                          -- taxa Asaas absorvida

  return jsonb_build_object(
    -- custódia: de quem é o dinheiro na conta
    'passivo_lojistas',     v_passivo_loja,
    'passivo_entregadores', v_passivo_ent,
    'caixa_liquido',        round((v_take - v_taxa_rec_total)::numeric, 2),
    'total_em_conta',       round((v_passivo_loja + v_passivo_ent + (v_take - v_taxa_rec_total))::numeric, 2),
    -- margem
    'take_bruto',           round(v_take::numeric, 2),
    'taxa_recargas',        round(v_taxa_rec_total::numeric, 2),
    'margem_pct',           case when v_fretes > 0 then round(((v_take - v_taxa_rec_total) / v_fretes * 100)::numeric, 1) else 0 end,
    -- fluxo
    'fretes_entregues',     round(v_fretes::numeric, 2),
    'n_entregues',          v_n_entregue,
    'recargas_total',       round(v_recargas_total::numeric, 2),
    'n_recargas',           v_n_recargas,
    'saques_total',         round(v_saques_total::numeric, 2),
    'n_saques',             v_n_saques,
    'saques_processando',   round(v_saques_proc::numeric, 2),
    'taxa_recarga_unit',    v_taxa_recarga
  );
end; $$;

grant execute on function composicao_financeira() to authenticated;
