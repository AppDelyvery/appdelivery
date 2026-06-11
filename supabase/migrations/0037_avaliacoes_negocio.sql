-- APPDELYVERY — o negócio vê as avaliações que recebeu dos entregadores. Após 0036.
-- Espelho de minhas_avaliacoes (entregador). RLS de avaliacoes é admin-only; RPC devolve só as do negócio.

create or replace function minhas_avaliacoes_negocio()
returns table(nota int, comentario text, created_at timestamptz)
language sql security definer stable as $$
  select a.nota, a.comentario, a.created_at
  from avaliacoes a
  join pedidos p on p.id = a.pedido_id
  join estabelecimentos e on e.id = p.estabelecimento_id
  where e.profile_id = auth.uid() and a.de_papel = 'entregador'
  order by a.created_at desc;
$$;
grant execute on function minhas_avaliacoes_negocio() to authenticated;
