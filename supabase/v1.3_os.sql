-- ============================================================
-- FORTAL TECH V1.3 - ORDENS DE SERVIÇO
-- Execute no Supabase SQL Editor antes de testar.
-- ============================================================

-- Tabela principal
alter table public.ordens_servico add column if not exists numero text;
alter table public.ordens_servico add column if not exists cliente_id uuid references public.clientes(id) on delete restrict;
alter table public.ordens_servico add column if not exists tecnico_id uuid references public.profiles(id) on delete set null;
alter table public.ordens_servico add column if not exists tipo_atendimento text;
alter table public.ordens_servico add column if not exists prioridade text;
alter table public.ordens_servico add column if not exists data_visita date;
alter table public.ordens_servico add column if not exists horario_chegada time;
alter table public.ordens_servico add column if not exists horario_termino time;
alter table public.ordens_servico add column if not exists motivo text;
alter table public.ordens_servico add column if not exists problema_relatado text;
alter table public.ordens_servico add column if not exists diagnostico text;
alter table public.ordens_servico add column if not exists causa_identificada text;
alter table public.ordens_servico add column if not exists servico_executado text;
alter table public.ordens_servico add column if not exists equipamento_substituido text;
alter table public.ordens_servico add column if not exists teste_realizado text;
alter table public.ordens_servico add column if not exists resultado text;
alter table public.ordens_servico add column if not exists pendencias text;
alter table public.ordens_servico add column if not exists recomendacoes text;
alter table public.ordens_servico add column if not exists necessita_orcamento boolean default false;
alter table public.ordens_servico add column if not exists descricao_orcamento text;
alter table public.ordens_servico add column if not exists prazo_correcao text;
alter table public.ordens_servico add column if not exists condicao_final text;
alter table public.ordens_servico add column if not exists observacoes_finais text;
alter table public.ordens_servico add column if not exists status text default 'aberta';
alter table public.ordens_servico add column if not exists encerrada_em timestamptz;
alter table public.ordens_servico add column if not exists created_at timestamptz default now();
alter table public.ordens_servico add column if not exists updated_at timestamptz default now();

-- Banco antigo pode ter multiempresa
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='ordens_servico' and column_name='empresa_id'
  ) then
    execute 'alter table public.ordens_servico alter column empresa_id drop not null';
  end if;
end $$;

-- Filhas
create table if not exists public.os_sistemas (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  sistema text not null,
  outro_descricao text
);

create table if not exists public.os_checklist (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  sistema text not null,
  grupo text,
  item text not null,
  status text,
  observacao text
);

create table if not exists public.os_materiais (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  descricao text not null,
  quantidade numeric default 1,
  unidade text default 'un'
);

-- Se já existiam, garante colunas
alter table public.os_sistemas add column if not exists outro_descricao text;
alter table public.os_checklist add column if not exists grupo text;
alter table public.os_checklist add column if not exists observacao text;
alter table public.os_materiais add column if not exists unidade text default 'un';

-- Remove NOT NULL de empresa_id em tabelas antigas
do $$
declare t text;
begin
  foreach t in array array['os_sistemas','os_checklist','os_materiais']
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name=t and column_name='empresa_id'
    ) then
      execute format('alter table public.%I alter column empresa_id drop not null',t);
    end if;
  end loop;
end $$;

-- Checks previsíveis
do $$
declare r record;
begin
  for r in select conname from pg_constraint where conrelid='public.ordens_servico'::regclass and contype='c'
  loop execute format('alter table public.ordens_servico drop constraint if exists %I',r.conname); end loop;
end $$;

alter table public.ordens_servico
  add constraint ordens_servico_status_check
  check(status in ('aberta','agendada','em_atendimento','aguardando_material','aguardando_orcamento','concluida','cancelada'));

-- RLS
alter table public.ordens_servico enable row level security;
alter table public.os_sistemas enable row level security;
alter table public.os_checklist enable row level security;
alter table public.os_materiais enable row level security;

-- policies principal
drop policy if exists "Admin gerencia todas OS" on public.ordens_servico;
drop policy if exists "Tecnico visualiza suas OS" on public.ordens_servico;
drop policy if exists "Tecnico atualiza suas OS" on public.ordens_servico;
drop policy if exists "Tecnico cria suas OS" on public.ordens_servico;

create policy "Admin gerencia todas OS" on public.ordens_servico
for all to authenticated using(public.is_admin()) with check(public.is_admin());

create policy "Tecnico visualiza suas OS" on public.ordens_servico
for select to authenticated using(tecnico_id=auth.uid());

create policy "Tecnico atualiza suas OS" on public.ordens_servico
for update to authenticated using(tecnico_id=auth.uid()) with check(tecnico_id=auth.uid());

create policy "Tecnico cria suas OS" on public.ordens_servico
for insert to authenticated with check(tecnico_id=auth.uid());

-- policies filhas
do $$
declare t text;
begin
  foreach t in array array['os_sistemas','os_checklist','os_materiais']
  loop
    execute format('drop policy if exists "Admin gerencia %s" on public.%I',t,t);
    execute format('drop policy if exists "Tecnico gerencia %s" on public.%I',t,t);

    execute format(
      'create policy "Admin gerencia %s" on public.%I for all to authenticated using(public.is_admin()) with check(public.is_admin())',
      t,t
    );

    execute format(
      'create policy "Tecnico gerencia %s" on public.%I for all to authenticated
       using(exists(select 1 from public.ordens_servico os where os.id=%I.os_id and os.tecnico_id=auth.uid()))
       with check(exists(select 1 from public.ordens_servico os where os.id=%I.os_id and os.tecnico_id=auth.uid()))',
      t,t,t,t
    );
  end loop;
end $$;

notify pgrst, 'reload schema';
