-- APPDELYVERY — recarga de carteira via Pix (Asaas). Rodar após 0029.
-- O lojista gera uma cobrança Pix; quando o Asaas confirma o pagamento (webhook),
-- credita o saldo de forma idempotente. Spec: build-spec/06-FINANCEIRO.

create table if not exists recargas (
  id                 uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references estabelecimentos(id),
  valor              numeric(10,2) not null check (valor >= 50),
  asaas_payment_id   text unique,
  status             text not null default 'pendente',  -- pendente | pago
  created_at         timestamptz default now(),
  pago_at            timestamptz
);

alter table recargas enable row level security;

-- lojista vê e cria as próprias recargas; admin vê tudo
drop policy if exists recargas_own_sel on recargas;
create policy recargas_own_sel on recargas for select
  using (estabelecimento_id in (select id from estabelecimentos where profile_id = auth.uid()) or is_admin());
drop policy if exists recargas_own_ins on recargas;
create policy recargas_own_ins on recargas for insert
  with check (estabelecimento_id in (select id from estabelecimentos where profile_id = auth.uid()));

-- credita a recarga (chamada pelo WEBHOOK com service role) — idempotente
create or replace function confirmar_recarga(p_asaas_id text)
returns text language plpgsql security definer as $$
declare v_rec recargas%rowtype;
begin
  select * into v_rec from recargas where asaas_payment_id = p_asaas_id;
  if v_rec.id is null then return 'recarga-nao-encontrada'; end if;
  if v_rec.status = 'pago' then return 'ja-creditada'; end if;
  update recargas set status = 'pago', pago_at = now() where id = v_rec.id;
  update estabelecimentos set saldo_carteira = coalesce(saldo_carteira, 0) + v_rec.valor
   where id = v_rec.estabelecimento_id;
  insert into carteira_transacoes (estabelecimento_id, tipo, valor)
   values (v_rec.estabelecimento_id, 'credito', v_rec.valor);
  return 'ok';
end;
$$;
-- só o servidor (service role) credita; NUNCA o lojista direto
revoke all on function confirmar_recarga(text) from anon, authenticated;
grant execute on function confirmar_recarga(text) to service_role;
