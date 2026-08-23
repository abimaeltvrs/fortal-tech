-- ============================================================
-- FORTAL TECH V1.6.3 - HOTFIX FINANCEIRO
-- Execute TODO este script no Supabase SQL Editor.
-- ============================================================

create table if not exists public.financeiro_lancamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete set null,
  orcamento_id uuid references public.orcamentos(id) on delete set null,
  tipo text not null default 'receita',
  descricao text not null,
  valor numeric not null default 0,
  metodo_pagamento text,
  parcela_numero integer not null default 1,
  parcela_total integer not null default 1,
  vencimento date,
  status text not null default 'pendente',
  recebido_em timestamptz,
  created_at timestamptz not null default now()
);

alter table public.financeiro_lancamentos
  add column if not exists cliente_id uuid references public.clientes(id) on delete set null;

alter table public.financeiro_lancamentos
  add column if not exists orcamento_id uuid references public.orcamentos(id) on delete set null;

alter table public.financeiro_lancamentos
  add column if not exists tipo text default 'receita';

alter table public.financeiro_lancamentos
  add column if not exists descricao text;

alter table public.financeiro_lancamentos
  add column if not exists valor numeric default 0;

alter table public.financeiro_lancamentos
  add column if not exists metodo_pagamento text;

alter table public.financeiro_lancamentos
  add column if not exists parcela_numero integer default 1;

alter table public.financeiro_lancamentos
  add column if not exists parcela_total integer default 1;

alter table public.financeiro_lancamentos
  add column if not exists vencimento date;

alter table public.financeiro_lancamentos
  add column if not exists status text default 'pendente';

alter table public.financeiro_lancamentos
  add column if not exists recebido_em timestamptz;

alter table public.financeiro_lancamentos
  add column if not exists created_at timestamptz default now();

-- Remove obrigatoriedade de empresa_id herdada de banco antigo, se existir.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='financeiro_lancamentos'
      and column_name='empresa_id'
  ) then
    execute 'alter table public.financeiro_lancamentos alter column empresa_id drop not null';
  end if;
end $$;

-- Garante campos do orçamento usados no fluxo.
alter table public.orcamentos add column if not exists metodo_pagamento text default 'pix';
alter table public.orcamentos add column if not exists parcelas integer default 1;
alter table public.orcamentos add column if not exists enviado_em timestamptz;
alter table public.orcamentos add column if not exists aprovado_em timestamptz;
alter table public.orcamentos add column if not exists canal_envio text;

-- RLS
alter table public.financeiro_lancamentos enable row level security;

drop policy if exists "Admin gerencia financeiro" on public.financeiro_lancamentos;

create policy "Admin gerencia financeiro"
on public.financeiro_lancamentos
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Índices
create index if not exists idx_financeiro_orcamento
  on public.financeiro_lancamentos(orcamento_id);

create index if not exists idx_financeiro_cliente
  on public.financeiro_lancamentos(cliente_id);

create index if not exists idx_financeiro_status
  on public.financeiro_lancamentos(status);

notify pgrst, 'reload schema';
