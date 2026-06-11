-- APPDELYVERY — saque/repasse do entregador via Pix. Rodar após 0032.
-- Entregador saca o saldo acumulado (mín. R$ 20) pra própria chave Pix. A transferência
-- real é feita pela action server (Asaas, no-op sem chave); aqui é a contabilidade segura.

create table if not exists saques (
  id                uuid primary key default gen_random_uuid(),
  entregador_id     uuid not null references entregadores(id),
  valor             numeric(10,2) not null check (valor >= 20),
  chave_pix         text not null,
  asaas_transfer_id text,
  status            text not null default 'processando',  -- processando | pago | falhou
  created_at        timestamptz default now()
);

alter table saques enable row level security;
drop policy if exists saques_own on saques;
create policy saques_own on saques for select
  using (entregador_id in (select id from entregadores where profile_id = auth.uid()) or is_admin());

-- reserva: valida saldo, debita e cria o saque 'processando'. Retorna o id (uuid) ou um código de erro.
create or replace function reservar_saque(p_valor numeric, p_chave_pix text)
returns text language plpgsql security definer as $$
declare v_ent uuid; v_saldo numeric; v_id uuid;
begin
  select id, coalesce(saldo, 0) into v_ent, v_saldo from entregadores where profile_id = auth.uid() for update;
  if v_ent is null then return 'nao-e-entregador'; end if;
  if p_valor < 20 then return 'minimo-20'; end if;
  if v_saldo < p_valor then return 'saldo-insuficiente'; end if;
  update entregadores set saldo = saldo - p_valor where id = v_ent;
  insert into saques (entregador_id, valor, chave_pix) values (v_ent, p_valor, p_chave_pix) returning id into v_id;
  return v_id::text;
end; $$;
grant execute on function reservar_saque(numeric, text) to authenticated;

-- finaliza após a transferência: marca 'pago' (com id) ou 'falhou' (e estorna o saldo).
create or replace function finalizar_saque(p_saque_id uuid, p_status text, p_transfer_id text)
returns text language plpgsql security definer as $$
declare v_saque saques%rowtype;
begin
  select * into v_saque from saques where id = p_saque_id
    and entregador_id in (select id from entregadores where profile_id = auth.uid());
  if v_saque.id is null then return 'saque-nao-encontrado'; end if;
  if v_saque.status <> 'processando' then return 'ja-finalizado'; end if;
  if p_status = 'pago' then
    update saques set status = 'pago', asaas_transfer_id = p_transfer_id where id = p_saque_id;
  else
    update entregadores set saldo = saldo + v_saque.valor where id = v_saque.entregador_id;  -- estorna
    update saques set status = 'falhou' where id = p_saque_id;
  end if;
  return 'ok';
end; $$;
grant execute on function finalizar_saque(uuid, text, text) to authenticated;
