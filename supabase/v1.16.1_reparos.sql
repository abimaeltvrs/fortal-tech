-- FORTAL TECH V1.16.1: dados específicos de orçamentos de reparo eletrônico.
-- Execute uma vez no SQL Editor do Supabase ANTES de usar a nova modalidade.
create table if not exists public.orcamento_reparos (
  orcamento_id uuid primary key references public.orcamentos(id) on delete cascade,
  tipo_placa text not null,
  fabricante text,
  modelo text,
  numero_serie text,
  defeito_relatado text,
  diagnostico text,
  horas numeric not null default 0,
  valor_hora numeric not null default 0,
  outros_custos numeric not null default 0,
  margem numeric not null default 30,
  garantia_dias integer not null default 90,
  observacoes_tecnicas text,
  updated_at timestamptz not null default now()
);
alter table public.orcamento_reparos enable row level security;
drop policy if exists "Admin gerencia reparos" on public.orcamento_reparos;
create policy "Admin gerencia reparos" on public.orcamento_reparos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select,insert,update,delete on public.orcamento_reparos to authenticated;
notify pgrst, 'reload schema';
