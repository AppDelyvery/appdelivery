-- 0048 — Reverte a 0047. Modelo errado: AppDelyvery é TRANSACIONAL (take 20% por entrega +
-- carteira pré-paga), NÃO cobra mensalidade do lojista. A "mensalidade" do contrato é a Impulso
-- cobrando do DONO que comprou a plataforma (1 relação B2B, fora do app) — não billing por-lojista.
-- A 0047 portou o AgendaPRO sem validar o modelo de receita (λ.lógica-primeiro). Desfeito.

drop trigger if exists trg_criar_assinatura on estabelecimentos;
drop function if exists minha_assinatura();
drop function if exists criar_assinatura_trial();
drop function if exists set_subscription_updated() cascade;
drop table if exists subscriptions cascade;
