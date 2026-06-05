-- 0022 — O lojista vê o status real + o entregador real designado.
-- Tira a última simulação ("Lucas Mendes") do acompanhamento do negócio.
-- Dados PÚBLICOS do entregador (nome/veículo/placa/nota) liberados só pra quem
-- é parte do pedido. Antecedentes (verificacoes) NUNCA entram aqui — LGPD.

create or replace function status_pedido_negocio(p_pedido_id uuid)
returns jsonb
language plpgsql security definer stable
set search_path = public
as $$
declare v_ok boolean; v_res jsonb;
begin
  -- só o dono do estabelecimento do pedido (ou admin) pode ver
  select exists (
    select 1 from pedidos p join estabelecimentos e on e.id = p.estabelecimento_id
    where p.id = p_pedido_id and (e.profile_id = auth.uid() or is_admin())
  ) into v_ok;
  if not v_ok then raise exception 'pedido nao e seu'; end if;

  select jsonb_build_object(
           'status', p.status,
           'tracking_token', p.tracking_token,
           'aceito_at', p.aceito_at,
           'coletado_at', p.coletado_at,
           'entregue_at', p.entregue_at,
           'entregador', case when en.id is null then null else jsonb_build_object(
             'nome', en.nome,
             'vehicle_type', en.vehicle_type,
             'placa', en.placa,
             'rating', en.rating
           ) end
         )
    into v_res
  from pedidos p
  left join entregadores en on en.id = p.entregador_id
  where p.id = p_pedido_id;
  return v_res;
end;
$$;

revoke all on function status_pedido_negocio(uuid) from public, anon;
grant execute on function status_pedido_negocio(uuid) to authenticated;
