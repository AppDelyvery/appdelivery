-- APPDELYVERY — o lojista vê o extrato da própria carteira. Rodar após 0038.
-- carteira_transacoes é admin-only por RLS; esta RPC SECURITY DEFINER devolve só as do lojista logado.

create or replace function minhas_transacoes_carteira()
returns table(tipo text, valor numeric, pedido_id uuid, created_at timestamptz)
language sql security definer stable as $$
  select t.tipo, t.valor, t.pedido_id, t.created_at
  from carteira_transacoes t
  join estabelecimentos e on e.id = t.estabelecimento_id
  where e.profile_id = auth.uid()
  order by t.created_at desc
  limit 100;
$$;
grant execute on function minhas_transacoes_carteira() to authenticated;
