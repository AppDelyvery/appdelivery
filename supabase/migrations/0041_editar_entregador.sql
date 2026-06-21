-- APPDELYVERY — o entregador edita os próprios dados. Rodar após 0040.
-- Guarda telefone e a chave Pix no perfil (antes a chave era digitada a cada saque, 0033).
-- Editáveis: telefone, chave_pix, placa. Nome/CPF (identidade verificada), tipo de veículo
-- e status (verificação) ficam TRAVADOS — quem mexe é a operação (admin).

alter table entregadores add column if not exists telefone  text;
alter table entregadores add column if not exists chave_pix text;

create or replace function atualizar_meu_perfil_entregador(p_telefone text, p_chave_pix text, p_placa text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare v_ent uuid;
begin
  select id into v_ent from entregadores where profile_id = auth.uid();
  if v_ent is null then raise exception 'sem entregador'; end if;

  update entregadores set
    telefone  = nullif(btrim(p_telefone), ''),
    chave_pix = nullif(btrim(p_chave_pix), ''),
    placa     = nullif(btrim(p_placa), '')
  where id = v_ent;
end;
$$;

revoke all on function atualizar_meu_perfil_entregador(text, text, text) from public, anon;
grant execute on function atualizar_meu_perfil_entregador(text, text, text) to authenticated;
