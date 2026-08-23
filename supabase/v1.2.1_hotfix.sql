-- ============================================================
-- FORTAL TECH V1.2.1 - HOTFIX AGENDA
-- Corrige schema antigo do projeto e força atualização do cache.
-- Execute no Supabase > SQL Editor > New query > RUN.
-- ============================================================

alter table public.agendamentos
  add column if not exists sistema text;

alter table public.agendamentos
  add column if not exists titulo text;

alter table public.agendamentos
  add column if not exists tipo_atendimento text;

alter table public.agendamentos
  add column if not exists prioridade text default 'media';

alter table public.agendamentos
  add column if not exists inicio timestamptz;

alter table public.agendamentos
  add column if not exists fim_previsto timestamptz;

alter table public.agendamentos
  add column if not exists endereco_atendimento text;

alter table public.agendamentos
  add column if not exists status text default 'agendado';

alter table public.agendamentos
  add column if not exists observacoes text;

alter table public.agendamentos
  add column if not exists cliente_id uuid references public.clientes(id) on delete restrict;

alter table public.agendamentos
  add column if not exists tecnico_id uuid references public.profiles(id) on delete set null;

-- Projeto anterior pode ter coluna empresa_id obrigatória.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='agendamentos'
      and column_name='empresa_id'
  ) then
    execute 'alter table public.agendamentos alter column empresa_id drop not null';
  end if;
end $$;

-- Recria checks compatíveis com a FORTAL TECH.
do $$
declare r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid='public.agendamentos'::regclass
      and contype='c'
  loop
    execute format(
      'alter table public.agendamentos drop constraint if exists %I',
      r.conname
    );
  end loop;
end $$;

alter table public.agendamentos
  add constraint agendamentos_prioridade_check
  check (prioridade is null or prioridade in ('baixa','media','alta','emergencial'));

alter table public.agendamentos
  add constraint agendamentos_status_check
  check (
    status is null or status in (
      'agendado',
      'confirmado',
      'em_deslocamento',
      'em_atendimento',
      'concluido',
      'cancelado',
      'reagendado'
    )
  );

-- Garante RLS e políticas.
alter table public.agendamentos enable row level security;

drop policy if exists "Admin gerencia agenda" on public.agendamentos;
drop policy if exists "Tecnico visualiza propria agenda" on public.agendamentos;
drop policy if exists "Tecnico atualiza propria agenda" on public.agendamentos;
drop policy if exists "Tecnico cria propria agenda" on public.agendamentos;

create policy "Admin gerencia agenda"
on public.agendamentos
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Tecnico visualiza propria agenda"
on public.agendamentos
for select
to authenticated
using (tecnico_id = auth.uid());

create policy "Tecnico atualiza propria agenda"
on public.agendamentos
for update
to authenticated
using (tecnico_id = auth.uid())
with check (tecnico_id = auth.uid());

create policy "Tecnico cria propria agenda"
on public.agendamentos
for insert
to authenticated
with check (tecnico_id = auth.uid());

-- Força o PostgREST/Supabase a recarregar o schema imediatamente.
notify pgrst, 'reload schema';
