-- 0059 — endereço do negócio com coordenadas (base da coleta semi-automática).
-- atualizar_meu_negocio passa a gravar lat/lng (geocodadas no client via AddressAutocomplete),
-- pra que o endereço cadastrado vire o ponto de coleta PADRÃO de toda entrega do lojista.
-- lat/lng já existem na tabela; aqui só passam a ser persistidos no edit do perfil.

drop function if exists atualizar_meu_negocio(text, text, text);

create or replace function atualizar_meu_negocio(
  p_razao_social text, p_endereco text, p_telefone text,
  p_lat double precision default null, p_lng double precision default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_est uuid;
begin
  select id into v_est from estabelecimentos where profile_id = auth.uid();
  if v_est is null then raise exception 'sem estabelecimento'; end if;

  update estabelecimentos set
    razao_social = coalesce(nullif(btrim(p_razao_social), ''), razao_social),  -- nunca esvazia (obrigatório)
    endereco     = nullif(btrim(p_endereco), ''),
    telefone     = nullif(btrim(p_telefone), ''),
    lat          = coalesce(p_lat, lat),  -- mantém a coord atual se não vier nova
    lng          = coalesce(p_lng, lng)
  where id = v_est;
end; $$;

revoke all on function atualizar_meu_negocio(text, text, text, double precision, double precision) from public, anon;
grant execute on function atualizar_meu_negocio(text, text, text, double precision, double precision) to authenticated;
