-- AppDelyvery — LIMPA tudo da simulação densa (prefixo sim.est. / sim.ent. @gmail.com).
-- Remove na ordem certa (pedidos não têm cascade a partir de estabelecimentos).
-- Rodar: node scripts/db.mjs scripts/cleanup-sim.sql

-- ids dos pedidos sim (de estabelecimentos sim)
create temp table _sim_ped on commit drop as
  select p.id from pedidos p
  join estabelecimentos e on e.id = p.estabelecimento_id
  join auth.users u on u.id = e.profile_id
  where u.email ~ '^sim\.(est|ent)\.' and u.email like '%@gmail.com';

delete from mensagens   where pedido_id in (select id from _sim_ped);
delete from avaliacoes  where pedido_id in (select id from _sim_ped);
delete from disputas    where pedido_id in (select id from _sim_ped);
delete from comprovantes where pedido_id in (select id from _sim_ped);
delete from rastreios   where pedido_id in (select id from _sim_ped);
delete from pagamentos  where pedido_id in (select id from _sim_ped);
delete from ofertas     where pedido_id in (select id from _sim_ped);
delete from saques      where entregador_id in (
  select e.id from entregadores e join auth.users u on u.id=e.profile_id where u.email ~ '^sim\.ent\.');
delete from carteira_transacoes where estabelecimento_id in (
  select e.id from estabelecimentos e join auth.users u on u.id=e.profile_id where u.email ~ '^sim\.est\.');
delete from pedidos where id in (select id from _sim_ped);

-- usuários sim — cascade limpa profiles/estabelecimentos/entregadores/verificacoes/documentos
delete from auth.users where email ~ '^sim\.(est|ent)\.' and email like '%@gmail.com';
