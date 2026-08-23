-- ============================================================
-- FORTAL TECH V1.6.2 - ENVIO, APROVAÇÃO E FINANCEIRO
-- Execute no Supabase SQL Editor.
-- ============================================================

alter table public.orcamentos
  add column if not exists metodo_pagamento text not null default 'pix';

alter table public.orcamentos
  add column if not exists parcelas integer not null default 1;

alter table public.orcamentos
  add column if not exists enviado_em timestamptz;

alter table public.orcamentos
  add column if not exists aprovado_em timestamptz;

alter table public.orcamentos
  add column if not exists canal_envio text;

-- Se houver checks antigos, recria status e pagamento de forma previsível.
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid='public.orcamentos'::regclass and contype='c'
  loop
    execute format('alter table public.orcamentos drop constraint if exists %I',r.conname);
  end loop;
end $$;

alter table public.orcamentos
  add constraint orcamentos_status_check
  check(status in ('elaboracao','enviado','aprovado','recusado','expirado'));

alter table public.orcamentos
  add constraint orcamentos_metodo_pagamento_check
  check(metodo_pagamento in ('pix','debito','credito'));

alter table public.orcamentos
  add constraint orcamentos_parcelas_check
  check(parcelas between 1 and 12);

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

alter table public.financeiro_lancamentos add column if not exists metodo_pagamento text;
alter table public.financeiro_lancamentos add column if not exists parcela_numero integer default 1;
alter table public.financeiro_lancamentos add column if not exists parcela_total integer default 1;
alter table public.financeiro_lancamentos add column if not exists vencimento date;
alter table public.financeiro_lancamentos add column if not exists recebido_em timestamptz;

do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid='public.financeiro_lancamentos'::regclass and contype='c'
  loop
    execute format('alter table public.financeiro_lancamentos drop constraint if exists %I',r.conname);
  end loop;
end $$;

alter table public.financeiro_lancamentos
  add constraint financeiro_status_check
  check(status in ('pendente','recebido','cancelado'));

alter table public.financeiro_lancamentos
  add constraint financeiro_tipo_check
  check(tipo in ('receita','despesa'));

alter table public.financeiro_lancamentos
  add constraint financeiro_metodo_check
  check(metodo_pagamento is null or metodo_pagamento in ('pix','debito','credito'));

alter table public.financeiro_lancamentos enable row level security;

drop policy if exists "Admin gerencia financeiro" on public.financeiro_lancamentos;

create policy "Admin gerencia financeiro"
on public.financeiro_lancamentos
for all to authenticated
using(public.is_admin())
with check(public.is_admin());

notify pgrst, 'reload schema';
