-- ============================================================
-- FORTAL TECH V1.9 - MANUAIS / ASSISTENTE TÉCNICO
-- Execute no Supabase SQL Editor.
-- ============================================================

create table if not exists public.manuais_tecnicos(
  id uuid primary key default gen_random_uuid(),
  fabricante text not null,
  modelo text not null,
  categoria text,
  nome_arquivo text not null,
  arquivo_path text not null,
  status_indexacao text not null default 'pendente',
  created_at timestamptz not null default now()
);

alter table public.manuais_tecnicos enable row level security;

drop policy if exists "Usuarios ativos leem manuais" on public.manuais_tecnicos;
drop policy if exists "Admin gerencia manuais" on public.manuais_tecnicos;

create policy "Usuarios ativos leem manuais"
on public.manuais_tecnicos for select to authenticated
using(public.is_active_user());

create policy "Admin gerencia manuais"
on public.manuais_tecnicos for all to authenticated
using(public.is_admin())
with check(public.is_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('manuais-tecnicos','manuais-tecnicos',false,52428800,array['application/pdf'])
on conflict(id) do update
set file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Usuarios ativos leem PDFs tecnicos" on storage.objects;
drop policy if exists "Admin envia PDFs tecnicos" on storage.objects;
drop policy if exists "Admin exclui PDFs tecnicos" on storage.objects;

create policy "Usuarios ativos leem PDFs tecnicos"
on storage.objects for select to authenticated
using(bucket_id='manuais-tecnicos' and public.is_active_user());

create policy "Admin envia PDFs tecnicos"
on storage.objects for insert to authenticated
with check(bucket_id='manuais-tecnicos' and public.is_admin());

create policy "Admin exclui PDFs tecnicos"
on storage.objects for delete to authenticated
using(bucket_id='manuais-tecnicos' and public.is_admin());

-- Estrutura preparada para indexação semântica.
create extension if not exists vector;

create table if not exists public.manual_chunks(
  id bigserial primary key,
  manual_id uuid not null references public.manuais_tecnicos(id) on delete cascade,
  pagina integer,
  conteudo text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

alter table public.manual_chunks enable row level security;

drop policy if exists "Usuarios ativos leem trechos" on public.manual_chunks;
drop policy if exists "Admin gerencia trechos" on public.manual_chunks;

create policy "Usuarios ativos leem trechos"
on public.manual_chunks for select to authenticated
using(public.is_active_user());

create policy "Admin gerencia trechos"
on public.manual_chunks for all to authenticated
using(public.is_admin())
with check(public.is_admin());

notify pgrst, 'reload schema';
