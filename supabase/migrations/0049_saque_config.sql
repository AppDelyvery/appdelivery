-- 0049 — Política de saque configurável (decisão do Tulio, sem mexer no código).
-- Modelo: CPF paga taxa fixa por saque; MEI (com subconta Asaas) saca grátis → incentivo a formalizar.
-- A taxa de saque cobre o custo do Asaas (R$0 até 100 transferências/mês, R$2 depois) e empurra o
-- entregador frequente (que é quem mais consome a franquia) pra MEI. Mínimo alto segura a franquia.
-- Tudo no-op até a ASAAS_API_KEY entrar (o saque inteiro já curto-circuita sem hasAsaas()).

alter table config add column if not exists saque_minimo    numeric(10,2) not null default 35;    -- mínimo por saque (Uber usa R$35)
alter table config add column if not exists saque_taxa_cpf  numeric(10,2) not null default 3.50;  -- taxa cobrada do entregador CPF (sem subconta)
alter table config add column if not exists saque_mei_gratis boolean      not null default true;  -- MEI (com subconta) saca sem taxa

-- reservar_saque passa a ler o mínimo da config (era hardcoded 20). Mantém a trava de saldo/atomicidade.
create or replace function reservar_saque(p_valor numeric, p_chave_pix text) returns text
language plpgsql security definer set search_path = public as $$
declare v_ent uuid; v_saldo numeric; v_id uuid; v_min numeric;
begin
  select id, coalesce(saldo, 0) into v_ent, v_saldo from entregadores where profile_id = auth.uid() for update;
  if v_ent is null then return 'nao-e-entregador'; end if;
  select coalesce(saque_minimo, 20) into v_min from config where id = 1;
  if p_valor < v_min then return 'minimo'; end if;
  if v_saldo < p_valor then return 'saldo-insuficiente'; end if;
  update entregadores set saldo = saldo - p_valor where id = v_ent;
  insert into saques (entregador_id, valor, chave_pix) values (v_ent, p_valor, p_chave_pix) returning id into v_id;
  return v_id::text;
end; $$;
