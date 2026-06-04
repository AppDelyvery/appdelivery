-- APPDELYVERY — limpa os usuários/dados de TESTE criados nas verificações (02/06).
-- Rodar no SQL Editor (precisa de privilégio de service). Opcional, mas mantém o banco limpo.
-- Emails de teste: loja.* / entregador.* / audit.* / aa.* / appdelyvery.* @gmail.com

-- 1) pedidos dos estabelecimentos de teste (pedidos não têm cascade a partir de estabelecimentos)
delete from pedidos where estabelecimento_id in (
  select e.id from estabelecimentos e
  join profiles p on p.id = e.profile_id
  join auth.users u on u.id = p.id
  where u.email ~ '^(loja|entregador|audit|aa|appdelyvery|corr|chat)\.' and u.email like '%@gmail.com'
);

-- 2) usuários de teste — cascade limpa profiles/estabelecimentos/entregadores/verificacoes/documentos
delete from auth.users
where email ~ '^(loja|entregador|audit|aa|appdelyvery|corr|chat)\.' and email like '%@gmail.com';
