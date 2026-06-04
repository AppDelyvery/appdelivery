-- APPDELYVERY — suspender negócio + gerenciar operadores. Rodar após 0010.

-- negócio pode ser suspenso (não cria pedido enquanto inativo)
alter table estabelecimentos add column if not exists ativo boolean not null default true;

-- admin promove/rebaixa OPERADOR por e-mail (SECURITY DEFINER — só admin).
-- (RLS de profiles só deixa self-update; por isso a operação privilegiada vem por função.)
create or replace function definir_operador(p_email text, p_ativar boolean)
returns text language plpgsql security definer as $$
declare v_id uuid;
begin
  if not is_admin() then return 'so-admin'; end if;
  select id into v_id from auth.users where email = p_email;
  if v_id is null then return 'usuario-nao-encontrado'; end if;
  update profiles set role = case when p_ativar then 'operador' else 'estabelecimento' end where id = v_id;
  if not found then return 'sem-perfil'; end if;
  return 'ok';
end;
$$;
grant execute on function definir_operador(text, boolean) to authenticated;

-- lista de operadores (admin vê quem é operador/admin)
create or replace function listar_operadores()
returns table(email text, nome text, role user_role)
language sql security definer stable as $$
  select u.email, p.nome, p.role
  from profiles p join auth.users u on u.id = p.id
  where p.role in ('admin','operador') and is_admin()   -- só admin enxerga
  order by p.role, p.nome;
$$;
grant execute on function listar_operadores() to authenticated;
