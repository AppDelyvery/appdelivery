-- APPDELYVERY — o entregador vê as próprias avaliações. Rodar após 0033.
-- RLS de avaliacoes é admin-only; esta RPC SECURITY DEFINER devolve só as do entregador logado.

create or replace function minhas_avaliacoes()
returns table(nota int, comentario text, created_at timestamptz)
language sql security definer stable as $$
  select a.nota, a.comentario, a.created_at
  from avaliacoes a
  join pedidos p on p.id = a.pedido_id
  join entregadores e on e.id = p.entregador_id
  where e.profile_id = auth.uid()
  order by a.created_at desc;
$$;
grant execute on function minhas_avaliacoes() to authenticated;
