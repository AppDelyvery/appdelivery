-- APPDELYVERY — o lojista edita os próprios dados operacionais. Rodar após 0039.
-- Só razão social, endereço e telefone. CNPJ (identidade verificada), plano e status (ativo)
-- ficam TRAVADOS — quem mexe é a operação (admin). RPC SECURITY DEFINER: não há policy de
-- update do lojista em estabelecimentos, e o cérebro mora no banco.

create or replace function atualizar_meu_negocio(p_razao_social text, p_endereco text, p_telefone text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare v_est uuid;
begin
  select id into v_est from estabelecimentos where profile_id = auth.uid();
  if v_est is null then raise exception 'sem estabelecimento'; end if;

  update estabelecimentos set
    razao_social = coalesce(nullif(btrim(p_razao_social), ''), razao_social),  -- nunca esvazia (campo obrigatório)
    endereco     = nullif(btrim(p_endereco), ''),
    telefone     = nullif(btrim(p_telefone), '')
  where id = v_est;
end;
$$;

revoke all on function atualizar_meu_negocio(text, text, text) from public, anon;
grant execute on function atualizar_meu_negocio(text, text, text) to authenticated;
