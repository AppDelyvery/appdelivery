-- Lista as entregas ATIVAS do estabelecimento logado (várias ao mesmo tempo), pro
-- lojista movimentado acompanhar todas — não só uma. Escopo pelo dono (auth.uid()).
create or replace function public.minhas_entregas_ativas()
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_res jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id,
           'status', p.status,
           'coleta', p.coleta_endereco,
           'entrega', p.entrega_endereco,
           'created_at', p.created_at,
           'token', p.tracking_token,
           'preco', p.preco_total,
           'veiculo', p.vehicle_type,
           'entregador', en.nome
         ) order by p.created_at desc), '[]'::jsonb)
    into v_res
    from pedidos p
    join estabelecimentos e on e.id = p.estabelecimento_id
    left join entregadores en on en.id = p.entregador_id
   where e.profile_id = auth.uid()
     and p.status in ('buscando', 'aceito', 'a_caminho_coleta', 'coletado', 'a_caminho_entrega');
  return v_res;
end;
$function$;
grant execute on function public.minhas_entregas_ativas() to authenticated;
