-- ============================================================
-- FORTAL TECH V1.6 - ORÇAMENTOS
-- Execute no Supabase SQL Editor.
-- ============================================================

create table if not exists public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  numero text unique not null,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  os_id uuid references public.ordens_servico(id) on delete set null,
  data_orcamento date not null default current_date,
  validade date,
  status text not null default 'elaboracao',
  desconto numeric not null default 0,
  total numeric not null default 0,
  forma_pagamento text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
  tipo text not null default 'servico',
  descricao text not null,
  quantidade numeric not null default 1,
  valor_unitario numeric not null default 0
);

-- Compatibilidade com banco antigo
alter table public.orcamentos add column if not exists os_id uuid references public.ordens_servico(id) on delete set null;
alter table public.orcamentos add column if not exists data_orcamento date default current_date;
alter table public.orcamentos add column if not exists validade date;
alter table public.orcamentos add column if not exists status text default 'elaboracao';
alter table public.orcamentos add column if not exists desconto numeric default 0;
alter table public.orcamentos add column if not exists total numeric default 0;
alter table public.orcamentos add column if not exists forma_pagamento text;
alter table public.orcamentos add column if not exists observacoes text;
alter table public.orcamentos add column if not exists updated_at timestamptz default now();

alter table public.orcamento_itens add column if not exists tipo text default 'servico';
alter table public.orcamento_itens add column if not exists descricao text;
alter table public.orcamento_itens add column if not exists quantidade numeric default 1;
alter table public.orcamento_itens add column if not exists valor_unitario numeric default 0;

-- Remove empresa_id obrigatório se existir
do $$
declare t text;
begin
  foreach t in array array['orcamentos','orcamento_itens']
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name=t and column_name='empresa_id'
    ) then
      execute format('alter table public.%I alter column empresa_id drop not null',t);
    end if;
  end loop;
end $$;

-- Checks
do $$
declare r record;
begin
  for r in select conname from pg_constraint where conrelid='public.orcamentos'::regclass and contype='c'
  loop execute format('alter table public.orcamentos drop constraint if exists %I',r.conname); end loop;

  for r in select conname from pg_constraint where conrelid='public.orcamento_itens'::regclass and contype='c'
  loop execute format('alter table public.orcamento_itens drop constraint if exists %I',r.conname); end loop;
end $$;

alter table public.orcamentos
  add constraint orcamentos_status_check
  check(status in ('elaboracao','enviado','aprovado','recusado','expirado'));

alter table public.orcamento_itens
  add constraint orcamento_itens_tipo_check
  check(tipo in ('servico','material'));

-- RLS
alter table public.orcamentos enable row level security;
alter table public.orcamento_itens enable row level security;

drop policy if exists "Admin gerencia orcamentos" on public.orcamentos;
drop policy if exists "Admin gerencia itens orcamento" on public.orcamento_itens;

create policy "Admin gerencia orcamentos"
on public.orcamentos
for all to authenticated
using(public.is_admin())
with check(public.is_admin());

create policy "Admin gerencia itens orcamento"
on public.orcamento_itens
for all to authenticated
using(public.is_admin())
with check(public.is_admin());

notify pgrst, 'reload schema';
