-- 0046 — Índices de performance (lição do AgendaPRO v90: query de tenant sem índice = seq scan ~6s).
-- Os índices de COLUNA ÚNICA em pedidos já existiam (0001). Aqui entram os COMPOSTOS (a query real
-- filtra por dono/entregador + status E ordena por data) e as tabelas quentes do motor/financeiro
-- que estavam só com PK. Postgres NÃO cria índice de FK automaticamente.
-- Tudo `if not exists` (idempotente) + ANALYZE no fim pra o planner reavaliar na hora.

-- PEDIDOS — histórico/dashboard do lojista: WHERE estabelecimento_id=X [AND status] ORDER BY created_at DESC
create index if not exists pedidos_estab_created_ix on pedidos (estabelecimento_id, created_at desc);
-- corridas do entregador: WHERE entregador_id=X AND status=... ORDER BY created_at
create index if not exists pedidos_entregador_status_ix on pedidos (entregador_id, status, created_at desc);
-- admin (despacho/corridas): WHERE status IN (...) ORDER BY created_at DESC
create index if not exists pedidos_status_created_ix on pedidos (status, created_at desc);

-- OFERTAS — o motor de despacho varre essa tabela e ela estava SÓ com PK.
-- cron processar_ofertas: WHERE status='ofertada' [expirar por ofertada_at]
create index if not exists ofertas_status_ofertada_ix on ofertas (status, ofertada_at);
-- minha_oferta_atual / aceitar: WHERE entregador_id=X AND status=...
create index if not exists ofertas_entregador_status_ix on ofertas (entregador_id, status);
-- join por pedido (re-oferta em cascata)
create index if not exists ofertas_pedido_ix on ofertas (pedido_id);

-- CARTEIRA — extrato do lojista (minhas_transacoes_carteira: por estab, ordem decrescente, limit 100)
create index if not exists carteira_estab_created_ix on carteira_transacoes (estabelecimento_id, created_at desc);

-- RASTREIOS — get_rastreio_publico lê o último ponto do pedido
create index if not exists rastreios_pedido_created_ix on rastreios (pedido_id, created_at desc);

-- COMPROVANTES — drawer do admin lê o comprovante por pedido
create index if not exists comprovantes_pedido_ix on comprovantes (pedido_id);

-- SAQUES — histórico do entregador (recargas.asaas_payment_id já tem índice implícito pelo UNIQUE)
create index if not exists saques_entregador_created_ix on saques (entregador_id, created_at desc);

-- RECARGAS — histórico do lojista
create index if not exists recargas_estab_created_ix on recargas (estabelecimento_id, created_at desc);

-- VERIFICACOES — drawer do admin lê verificações por entregador
create index if not exists verificacoes_entregador_ix on verificacoes (entregador_id);

analyze pedidos;
analyze ofertas;
analyze carteira_transacoes;
analyze rastreios;
analyze comprovantes;
analyze saques;
analyze recargas;
analyze verificacoes;
