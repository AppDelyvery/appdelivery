-- 0025 — Cotação de preço via API (Uber Direct tem). O sistema do lojista
-- pergunta o preço ANTES de criar o pedido, pra mostrar o frete pro cliente dele.
-- Usa preco_por_config (0023) — preço calculado no banco, pelas 3 categorias.

create or replace function cotar_via_api(p_key text, p_dist numeric)
returns jsonb
language plpgsql security definer stable
set search_path = public, extensions
as $$
declare v_est uuid;
begin
  select c.estabelecimento_id into v_est from chaves_api c
   where c.key_hash = hash_chave(p_key) and c.ativa = true;
  if v_est is null then raise exception 'chave invalida'; end if;

  return jsonb_build_object(
    'distancia_km', p_dist,
    'moto', preco_por_config('moto', p_dist),
    'carro', preco_por_config('carro', p_dist),
    'van', preco_por_config('van', p_dist)
  );
end;
$$;

revoke all on function cotar_via_api(text, numeric) from public;
grant execute on function cotar_via_api(text, numeric) to anon, authenticated;
