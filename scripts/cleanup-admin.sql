-- Limpa o transacional de teste (deixa o admin limpo) mantendo as CONTAS e os saldos
-- dos negócios (pra cobrança do novo pedido). NÃO mexe em online/posição do entregador.
begin;
delete from rastreios;
delete from comprovantes;
delete from avaliacoes;
delete from pagamentos;
delete from carteira_transacoes;
delete from ofertas;
delete from cancelamentos;
delete from mensagens;
delete from disputas;
delete from pedidos;
delete from recargas;
delete from saques;
update entregadores set total_entregas = 0, saldo = 0, abandonos = 0, cancel_pos_aceite = 0;
commit;
