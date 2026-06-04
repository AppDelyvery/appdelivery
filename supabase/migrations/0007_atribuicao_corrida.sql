-- APPDELYVERY — atribuição de corrida (entregador vê disponíveis e aceita). Rodar após 0006.
-- Privacidade: a lista NÃO expõe telefone/nome do cliente final — só o necessário pra decidir.
-- Só entregador APROVADO enxerga/aceita. Aceite é ATÔMICO (race-safe).

-- Lista de corridas disponíveis (campos seguros) — só p/ entregador aprovado.
create or replace function listar_corridas_disponiveis()
returns table(
  id uuid, coleta_endereco text, entrega_endereco text,
  distancia_km numeric, duracao_min int, preco_entregador numeric,
  vehicle_type vehicle_type, created_at timestamptz
)
language sql security definer stable as $$
  select p.id, p.coleta_endereco, p.entrega_endereco,
         p.distancia_km, p.duracao_min, p.preco_entregador, p.vehicle_type, p.created_at
  from pedidos p
  where p.status = 'buscando' and p.entregador_id is null
    and exists (select 1 from entregadores e where e.profile_id = auth.uid() and e.status = 'aprovado')
  order by p.created_at desc;
$$;
grant execute on function listar_corridas_disponiveis() to authenticated;

-- Aceitar corrida — atômico: só pega se ainda está 'buscando' e sem entregador.
-- Retorna 'ok' | 'nao-aprovado' | 'indisponivel'.
create or replace function aceitar_corrida(p_pedido_id uuid)
returns text language plpgsql security definer as $$
declare v_ent uuid; v_count int;
begin
  select id into v_ent from entregadores where profile_id = auth.uid() and status = 'aprovado';
  if v_ent is null then return 'nao-aprovado'; end if;

  update pedidos
     set entregador_id = v_ent, status = 'aceito', aceito_at = now()
   where id = p_pedido_id and status = 'buscando' and entregador_id is null;

  get diagnostics v_count = row_count;
  if v_count = 0 then return 'indisponivel'; end if;  -- outro pegou primeiro
  return 'ok';
end;
$$;
grant execute on function aceitar_corrida(uuid) to authenticated;
