-- APPDELYVERY — config editável pelo dono (preço, take rate, PIN, raio). Rodar após 0009.
-- Autonomia total: o dono muda as regras no painel, sem depender da Impulso.

create table if not exists config (
  id            int primary key default 1,
  base_moto     numeric(10,2) not null default 8,
  base_carro    numeric(10,2) not null default 13,
  base_van      numeric(10,2) not null default 20,
  per_km        numeric(10,2) not null default 1.5,
  minimo        numeric(10,2) not null default 10,
  take_rate     numeric(4,3) not null default 0.20,   -- fração da plataforma (0.20 = 20%)
  raio_m        int not null default 5000,
  pin_supervisor text,
  updated_at    timestamptz default now(),
  constraint config_single check (id = 1)
);
insert into config (id) values (1) on conflict (id) do nothing;

alter table config enable row level security;
drop policy if exists config_read on config;
drop policy if exists config_write on config;
create policy config_read on config for select using (true);            -- todos leem (preço aparece pro lojista)
create policy config_write on config for update using (is_admin()) with check (is_admin());
