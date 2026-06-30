-- AppDelyvery — RESET de dados de teste pré-lançamento (30/06/2026).
-- Mantém SÓ: appdelyvery@outlook.com (admin), demo.admin@gmail.com (admin),
-- edubchaves5@gmail.com (Eduardo). Apaga todo o resto + todo o transacional.
-- Tudo é dado de teste (zero cliente real). Rodar: node scripts/db.mjs scripts/cleanup-fresh-start.sql

begin;

-- 1) Transacional (100% teste). Ordem respeita os FKs NO ACTION; o resto cai por CASCADE.
delete from avaliacoes;
delete from pagamentos;
delete from carteira_transacoes;
delete from recargas;
delete from saques;
delete from cancelamentos;
delete from ofertas;
delete from verificacoes;
delete from comunicados;
delete from pedidos;   -- cascata: comprovantes, rastreios, mensagens, disputas

-- 2) Usuários de teste — cascade limpa profiles/estabelecimentos/entregadores/
--    entregador_documentos/estabelecimento_membros/push_subscriptions/chaves_api/consentimentos.
delete from auth.users
where email not in (
  'appdelyvery@outlook.com',
  'demo.admin@gmail.com',
  'edubchaves5@gmail.com'
);

commit;
