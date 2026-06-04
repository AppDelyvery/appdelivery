-- 0019 — Métricas do entregador pro menu (padrão 99 T04): rating, entregas,
-- Taxa de Aceitação (TA) e Taxa de Finalização (TF), últimos 30 dias.
-- Lê cancelamentos (só-admin via RLS) → precisa SECURITY DEFINER.

create or replace function metricas_entregador()
returns jsonb
language plpgsql security definer stable
set search_path = public
as $$
declare
  v_ent uuid; v_rating numeric;
  v_entregues int; v_cancel int; v_aceitas int; v_recusadas int;
  v_tf numeric; v_ta numeric;
begin
  select id, rating into v_ent, v_rating from entregadores where profile_id = auth.uid();
  if v_ent is null then raise exception 'sem cadastro de entregador'; end if;

  -- TF: finalizadas / (finalizadas + canceladas após aceitar), 30 dias
  select count(*) into v_entregues from pedidos
   where entregador_id = v_ent and status = 'entregue' and entregue_at >= now() - interval '30 days';
  select count(*) into v_cancel from cancelamentos
   where entregador_id = v_ent and por = 'entregador' and created_at >= now() - interval '30 days';
  v_tf := case when (v_entregues + v_cancel) = 0 then null
               else round(v_entregues::numeric / (v_entregues + v_cancel) * 100) end;

  -- TA: aceitas / (aceitas + recusadas), 30 dias (ofertas)
  select count(*) filter (where status = 'aceita'),
         count(*) filter (where status = 'recusada')
    into v_aceitas, v_recusadas
    from ofertas where entregador_id = v_ent and ofertada_at >= now() - interval '30 days';
  v_ta := case when (v_aceitas + v_recusadas) = 0 then null
               else round(v_aceitas::numeric / (v_aceitas + v_recusadas) * 100) end;

  return jsonb_build_object(
    'rating', v_rating,
    'total_entregas', (select count(*) from pedidos where entregador_id = v_ent and status = 'entregue'),
    'taxa_finalizacao', v_tf,
    'taxa_aceitacao', v_ta
  );
end;
$$;

revoke all on function metricas_entregador() from public, anon;
grant execute on function metricas_entregador() to authenticated;
