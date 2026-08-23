-- ============================================================
-- FORTAL TECH V1.5 - FOTOS E ASSINATURAS DA OS
-- Execute no Supabase SQL Editor.
-- ============================================================

create table if not exists public.os_fotos (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  tipo text not null,
  arquivo_path text not null,
  legenda text,
  created_at timestamptz not null default now()
);

alter table public.os_fotos add column if not exists legenda text;
alter table public.os_fotos add column if not exists created_at timestamptz default now();

create table if not exists public.os_assinaturas (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  tipo text not null,
  nome text,
  cargo text,
  assinatura_data text,
  created_at timestamptz not null default now()
);

alter table public.os_assinaturas add column if not exists assinatura_data text;
alter table public.os_assinaturas add column if not exists nome text;
alter table public.os_assinaturas add column if not exists cargo text;
alter table public.os_assinaturas add column if not exists created_at timestamptz default now();

-- Banco antigo pode ter empresa_id
do $$
declare t text;
begin
  foreach t in array array['os_fotos','os_assinaturas']
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name=t and column_name='empresa_id'
    ) then
      execute format('alter table public.%I alter column empresa_id drop not null',t);
    end if;
  end loop;
end $$;

alter table public.os_fotos enable row level security;
alter table public.os_assinaturas enable row level security;

drop policy if exists "Admin gerencia fotos OS" on public.os_fotos;
drop policy if exists "Tecnico gerencia fotos OS" on public.os_fotos;
drop policy if exists "Admin gerencia assinaturas OS" on public.os_assinaturas;
drop policy if exists "Tecnico gerencia assinaturas OS" on public.os_assinaturas;

create policy "Admin gerencia fotos OS"
on public.os_fotos for all to authenticated
using(public.is_admin()) with check(public.is_admin());

create policy "Tecnico gerencia fotos OS"
on public.os_fotos for all to authenticated
using(exists(select 1 from public.ordens_servico os where os.id=os_fotos.os_id and os.tecnico_id=auth.uid()))
with check(exists(select 1 from public.ordens_servico os where os.id=os_fotos.os_id and os.tecnico_id=auth.uid()));

create policy "Admin gerencia assinaturas OS"
on public.os_assinaturas for all to authenticated
using(public.is_admin()) with check(public.is_admin());

create policy "Tecnico gerencia assinaturas OS"
on public.os_assinaturas for all to authenticated
using(exists(select 1 from public.ordens_servico os where os.id=os_assinaturas.os_id and os.tecnico_id=auth.uid()))
with check(exists(select 1 from public.ordens_servico os where os.id=os_assinaturas.os_id and os.tecnico_id=auth.uid()));

-- Bucket privado para fotos das OS
insert into storage.buckets (id,name,public)
values ('os-arquivos','os-arquivos',false)
on conflict (id) do update set public=false;

drop policy if exists "Usuarios autenticados leem os arquivos" on storage.objects;
drop policy if exists "Usuarios autenticados enviam os arquivos" on storage.objects;
drop policy if exists "Usuarios autenticados atualizam os arquivos" on storage.objects;
drop policy if exists "Usuarios autenticados removem os arquivos" on storage.objects;

create policy "Usuarios autenticados leem os arquivos"
on storage.objects for select to authenticated
using(bucket_id='os-arquivos');

create policy "Usuarios autenticados enviam os arquivos"
on storage.objects for insert to authenticated
with check(bucket_id='os-arquivos');

create policy "Usuarios autenticados atualizam os arquivos"
on storage.objects for update to authenticated
using(bucket_id='os-arquivos')
with check(bucket_id='os-arquivos');

create policy "Usuarios autenticados removem os arquivos"
on storage.objects for delete to authenticated
using(bucket_id='os-arquivos');

notify pgrst, 'reload schema';
