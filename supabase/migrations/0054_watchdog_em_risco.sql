-- 0054 — Controle operacional #1: watchdog de pedido fora de controle.
-- O liberar_aceites_travados só pega 'aceito' com GPS parado (reverte pra buscando). Mas depois
-- da COLETA a carga já está com o entregador — não dá pra reofertar. Aqui detectamos dois riscos
-- e SINALIZAMOS (em_risco) pro admin agir (intervenção = controle #2). Não cancela sozinho.

alter table pedidos add column if not exists em_risco boolean not null default false;
alter table pedidos add column if not exists risco_at timestamptz;
alter table pedidos add column if not exists risco_motivo text;
create index if not exists idx_pedidos_em_risco on pedidos (risco_at) where em_risco;

-- knobs (ajustáveis pelo dono sem mexer em código)
alter table config add column if not exists risco_coleta_min integer default 15; -- min p/ coletar antes de sinalizar
alter table config add column if not exists risco_gps_min    integer default 5;  -- min de GPS parado pós-coleta

create or replace function detectar_pedidos_em_risco() returns integer
language plpgsql security definer set search_path = public as $$
declare v_coleta int; v_gps int; n int := 0; m int;
begin
  select coalesce(risco_coleta_min, 15), coalesce(risco_gps_min, 5) into v_coleta, v_gps from config where id = 1;

  -- 1) limpa flags que deixaram de ser risco (terminou, voltou pra buscando, reatribuiu, ou GPS voltou)
  update pedidos p set em_risco = false, risco_at = null, risco_motivo = null
  where p.em_risco and (
       p.status in ('entregue', 'cancelado', 'buscando')
    or (p.status in ('aceito', 'a_caminho_coleta') and p.aceito_at >= now() - make_interval(mins => v_coleta))
    or (p.status in ('coletado', 'a_caminho_entrega')
        and exists (select 1 from entregadores e where e.id = p.entregador_id and e.ultima_posicao_at >= now() - make_interval(mins => v_gps)))
  );

  -- 2) coleta atrasada: aceitou e não coletou no prazo
  update pedidos p set em_risco = true, risco_at = now(),
    risco_motivo = 'Coleta atrasada: >' || v_coleta || 'min sem coletar'
  where not p.em_risco and p.status in ('aceito', 'a_caminho_coleta')
    and p.coletado_at is null and p.entregue_at is null
    and p.aceito_at < now() - make_interval(mins => v_coleta);
  get diagnostics m = row_count; n := n + m;

  -- 3) carga em risco: coletou mas o entregador parou (GPS frio) — o caso que mais dói
  update pedidos p set em_risco = true, risco_at = now(),
    risco_motivo = 'Carga coletada e entregador parado >' || v_gps || 'min'
  where not p.em_risco and p.status in ('coletado', 'a_caminho_entrega') and p.entregue_at is null
    and exists (select 1 from entregadores e where e.id = p.entregador_id
                and (e.ultima_posicao_at is null or e.ultima_posicao_at < now() - make_interval(mins => v_gps)));
  get diagnostics m = row_count; n := n + m;

  return n;
end; $$;

-- agenda no pg_cron (mesmo padrão do liberar-aceites-travados), a cada minuto
do $$ begin perform cron.unschedule('detectar-pedidos-em-risco'); exception when others then null; end $$;
select cron.schedule('detectar-pedidos-em-risco', '* * * * *', 'select detectar_pedidos_em_risco()');
