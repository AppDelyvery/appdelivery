-- 0016 — Disponibilidade do entregador (Conectar/Desconectar, padrão 99).
-- is_online + posicao são livres pro próprio entregador (guard 0003 só trava
-- status/rating). Mas posicao é geography → expor via RPC que monta o ponto.
-- Só entregador APROVADO pode ficar online.

create or replace function definir_disponibilidade(p_online boolean, p_lng double precision default null, p_lat double precision default null)
returns text
language plpgsql security definer
set search_path = public
as $$
declare v_ent uuid; v_status text;
begin
  select id, status into v_ent, v_status
    from entregadores where profile_id = auth.uid();
  if v_ent is null then
    raise exception 'sem cadastro de entregador';
  end if;
  if p_online and v_status <> 'aprovado' then
    raise exception 'cadastro nao aprovado';
  end if;

  update entregadores
     set is_online = p_online,
         posicao = case when p_lng is not null and p_lat is not null
                        then st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
                        else posicao end,
         ultima_posicao_at = case when p_lng is not null then now() else ultima_posicao_at end
   where id = v_ent;
  return 'ok';
end;
$$;

-- Atualização contínua de posição enquanto online (chamada periódica do GPS).
create or replace function atualizar_minha_posicao(p_lng double precision, p_lat double precision)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  update entregadores
     set posicao = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
         ultima_posicao_at = now()
   where profile_id = auth.uid() and is_online = true;
end;
$$;

revoke all on function definir_disponibilidade(boolean, double precision, double precision) from public, anon;
revoke all on function atualizar_minha_posicao(double precision, double precision) from public, anon;
grant execute on function definir_disponibilidade(boolean, double precision, double precision) to authenticated;
grant execute on function atualizar_minha_posicao(double precision, double precision) to authenticated;
