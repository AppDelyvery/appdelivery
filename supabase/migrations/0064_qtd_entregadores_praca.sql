-- Conta entregadores DISPONÍVEIS na praça pro veículo do pedido (online + aprovado +
-- GPS fresco). Serve o feedback de busca do negócio: se 0, avisa "nenhum disponível agora".
create or replace function public.qtd_entregadores_praca(p_pedido_id uuid)
 returns int
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_veic vehicle_type; v_n int;
begin
  select vehicle_type into v_veic from pedidos where id = p_pedido_id;
  if v_veic is null then return 0; end if;
  select count(*) into v_n
    from entregadores e
   where e.is_online = true
     and e.status = 'aprovado'
     and e.vehicle_type = v_veic
     and e.posicao is not null
     and e.ultima_posicao_at >= now() - interval '3 minutes';
  return coalesce(v_n, 0);
end;
$function$;
grant execute on function public.qtd_entregadores_praca(uuid) to authenticated;
