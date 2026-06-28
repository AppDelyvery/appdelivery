-- 0057 — Controle operacional #4: SLA do 'buscando' (pedido sem entregador).
-- Default: sinaliza em_risco após sla_buscando_min (aparece no despacho, admin cancela+estorna).
-- Opcional (sla_buscando_cancel_min > 0): auto-cancela + estorna depois de um limite maior.

alter table config add column if not exists sla_buscando_min        integer default 12; -- min p/ sinalizar
alter table config add column if not exists sla_buscando_cancel_min integer default 0;  -- 0=off; auto-cancela+estorna

create or replace function detectar_pedidos_em_risco() returns integer
language plpgsql security definer set search_path = public as $$
declare v_coleta int; v_gps int; v_sla int; v_cancel int; n int := 0; m int;
begin
  select coalesce(risco_coleta_min, 15), coalesce(risco_gps_min, 5),
         coalesce(sla_buscando_min, 12), coalesce(sla_buscando_cancel_min, 0)
    into v_coleta, v_gps, v_sla, v_cancel from config where id = 1;

  -- 0) SLA duro do buscando: auto-cancela + estorna (trg_estornar devolve o frete), se ligado
  if v_cancel > 0 then
    insert into cancelamentos (pedido_id, entregador_id, por, motivo, status_antes)
      select p.id, null, 'sistema', 'SLA: sem entregador >' || v_cancel || 'min', 'buscando'
      from pedidos p where p.status = 'buscando' and p.created_at < now() - make_interval(mins => v_cancel);
    update pedidos set status = 'cancelado', em_risco = false, risco_at = null, risco_motivo = null
      where status = 'buscando' and created_at < now() - make_interval(mins => v_cancel);
  end if;

  -- 1) limpa flags que deixaram de ser risco (incl. buscando ainda dentro do SLA)
  update pedidos p set em_risco = false, risco_at = null, risco_motivo = null
  where p.em_risco and (
       p.status in ('entregue', 'cancelado')
    or (p.status = 'buscando' and p.created_at >= now() - make_interval(mins => v_sla))
    or (p.status in ('aceito', 'a_caminho_coleta') and p.aceito_at >= now() - make_interval(mins => v_coleta))
    or (p.status in ('coletado', 'a_caminho_entrega')
        and exists (select 1 from entregadores e where e.id = p.entregador_id and e.ultima_posicao_at >= now() - make_interval(mins => v_gps)))
  );

  -- 2) buscando sem entregador além do SLA
  update pedidos p set em_risco = true, risco_at = now(), risco_motivo = 'Sem entregador há >' || v_sla || 'min'
  where not p.em_risco and p.status = 'buscando' and p.created_at < now() - make_interval(mins => v_sla);
  get diagnostics m = row_count; n := n + m;

  -- 3) coleta atrasada: aceitou e não coletou no prazo
  update pedidos p set em_risco = true, risco_at = now(), risco_motivo = 'Coleta atrasada: >' || v_coleta || 'min sem coletar'
  where not p.em_risco and p.status in ('aceito', 'a_caminho_coleta')
    and p.coletado_at is null and p.entregue_at is null
    and p.aceito_at < now() - make_interval(mins => v_coleta);
  get diagnostics m = row_count; n := n + m;

  -- 4) carga em risco: coletou mas o entregador parou (GPS frio)
  update pedidos p set em_risco = true, risco_at = now(), risco_motivo = 'Carga coletada e entregador parado >' || v_gps || 'min'
  where not p.em_risco and p.status in ('coletado', 'a_caminho_entrega') and p.entregue_at is null
    and exists (select 1 from entregadores e where e.id = p.entregador_id
                and (e.ultima_posicao_at is null or e.ultima_posicao_at < now() - make_interval(mins => v_gps)));
  get diagnostics m = row_count; n := n + m;

  return n;
end; $$;
