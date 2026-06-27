-- 0047 — Máquina de mensalidade (assinatura SaaS do estabelecimento). FUNDAÇÃO.
-- Porte do modelo AgendaPRO (gate por STATUS, nunca por pago_ate direto; trial; cortesia).
--
-- IMPORTANTE — fluxo de dinheiro SEPARADO da carteira pré-paga:
--   * subscriptions  = mensalidade que o LOJISTA paga à Impulso (receita recorrente do SaaS)
--   * carteira/recargas = lojista paga as ENTREGAS (dinheiro que circula pro entregador)
-- NÃO misturar as duas. Esta tabela é só a primeira.
--
-- Esqueleto: a cobrança real (Asaas) e o cron de expiração entram em migrations/slices seguintes.
-- valor_mensal fica NULL até o Eduardo cravar o preço (contrato diz "a acertar").

create table if not exists subscriptions (
  estabelecimento_id  uuid primary key references estabelecimentos(id) on delete cascade,
  status              text not null default 'trial',  -- trial | active | past_due | cancelled | pending_payment
  plano               text not null default 'mensal',
  plan_modalidade     text,                            -- mensal_pix | mensal_cartao | semestral_pix | anual_pix
  valor_mensal        numeric(10,2),                   -- preço da mensalidade (a acertar; configurável)
  provider            text not null default 'asaas',   -- asaas | cortesia
  pago_ate            timestamptz,                     -- vigência paga (referência; o GATE olha o status)
  trial_ends_at       timestamptz,
  grace_ends_at       timestamptz,                     -- carência após vencer (modelo AgendaPRO: +3d)
  permanent_courtesy  boolean not null default false,  -- isenta do cron de billing (parceiro/demo/grandfather)
  setup_paid_at       timestamptz,                     -- pagamento do setup (R$15k)
  refund_deadline_at  timestamptz,                     -- setup + 7d (CDC art.49)
  asaas_customer_id     text,
  asaas_subscription_id text,
  asaas_payment_id_atual text,
  pix_link_atual        text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- RLS: o dono/membro LÊ a própria assinatura; ninguém escreve pelo client (billing nunca confia no client → só service_role/trigger).
alter table subscriptions enable row level security;

drop policy if exists "estab le propria assinatura" on subscriptions;
create policy "estab le propria assinatura" on subscriptions for select
  using (
    is_admin()
    or estab_membro_de(estabelecimento_id)
    or estabelecimento_id in (select id from estabelecimentos where profile_id = auth.uid())
  );
-- (sem policy de INSERT/UPDATE/DELETE → RLS bloqueia escrita por anon/authenticated)

-- updated_at automático
create or replace function set_subscription_updated() returns trigger
language plpgsql security definer set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_subscription_updated on subscriptions;
create trigger trg_subscription_updated before update on subscriptions
  for each row execute function set_subscription_updated();

-- Auto-cria a assinatura (trial 14d) quando um estabelecimento nasce. SECURITY DEFINER (tabela tem RLS forte).
create or replace function criar_assinatura_trial() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into subscriptions (estabelecimento_id, status, trial_ends_at)
  values (new.id, 'trial', now() + interval '14 days')
  on conflict (estabelecimento_id) do nothing;
  return new;
end; $$;
drop trigger if exists trg_criar_assinatura on estabelecimentos;
create trigger trg_criar_assinatura after insert on estabelecimentos
  for each row execute function criar_assinatura_trial();

-- Backfill: estabelecimentos que JÁ existem (predam a mensalidade) entram como cortesia permanente
-- (grandfather — não bloquear quem já opera). Só os NOVOS caem no trial → cobrança.
insert into subscriptions (estabelecimento_id, status, provider, permanent_courtesy)
select e.id, 'active', 'cortesia', true
from estabelecimentos e
left join subscriptions s on s.estabelecimento_id = e.id
where s.estabelecimento_id is null
on conflict (estabelecimento_id) do nothing;

-- RPC: o lojista lê a própria assinatura (pro painel/paywall). SECURITY DEFINER.
create or replace function minha_assinatura() returns subscriptions
language sql security definer set search_path = public as $$
  select s.* from subscriptions s
  join estabelecimentos e on e.id = s.estabelecimento_id
  where e.profile_id = auth.uid()
  limit 1;
$$;

analyze subscriptions;
