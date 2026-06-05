-- 0027 — Proteção de carga (paridade Bee). A plataforma ressarce até um TETO
-- configurável (default R$300, igual a Bee). Cobertura por pedido = menor entre
-- o teto e o valor declarado. Acionamento = abrir um chamado/disputa (já existe);
-- admin resolve e ressarce. Sem tabela nova — o teto vive na config.
alter table config add column if not exists protecao_teto numeric(10,2) not null default 300;
