-- ============================================================
-- FORTAL TECH V1.8 - USUÁRIOS E PERMISSÕES
-- Execute no Supabase SQL Editor.
-- ============================================================

alter table public.profiles
  add column if not exists status text not null default 'ativo';

alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

-- Compatibilidade com nomes de perfil antigos.
update public.profiles
set perfil='tecnico'
where perfil is null or perfil not in ('admin','tecnico');

update public.profiles
set status='ativo'
where status is null or status not in ('ativo','inativo');

-- Remove checks antigos e aplica regras atuais.
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid='public.profiles'::regclass and contype='c'
  loop
    execute format('alter table public.profiles drop constraint if exists %I',r.conname);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_perfil_check
  check(perfil in ('admin','tecnico'));

alter table public.profiles
  add constraint profiles_status_check
  check(status in ('ativo','inativo'));

-- Admin pode visualizar e gerenciar todos os profiles.
alter table public.profiles enable row level security;

drop policy if exists "Usuario le proprio profile" on public.profiles;
drop policy if exists "Admin le profiles" on public.profiles;
drop policy if exists "Admin atualiza profiles" on public.profiles;

create policy "Usuario le proprio profile"
on public.profiles for select to authenticated
using(id=auth.uid() or public.is_admin());

create policy "Admin atualiza profiles"
on public.profiles for update to authenticated
using(public.is_admin())
with check(public.is_admin());

-- Função para validar acesso ativo.
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1 from public.profiles
    where id=auth.uid()
      and status='ativo'
  );
$$;

notify pgrst, 'reload schema';
