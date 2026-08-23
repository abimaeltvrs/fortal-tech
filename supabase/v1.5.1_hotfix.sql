-- ============================================================
-- FORTAL TECH V1.5.1 - HOTFIX ASSINATURAS
-- Execute no Supabase SQL Editor.
-- ============================================================

-- Em bases antigas esta tabela pode ter a coluna assinatura_path.
-- Ela não deve ser obrigatória porque a versão atual salva a assinatura
-- diretamente em assinatura_data.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='os_assinaturas'
      and column_name='assinatura_path'
  ) then
    execute 'alter table public.os_assinaturas alter column assinatura_path drop not null';
  end if;
end $$;

alter table public.os_assinaturas
  add column if not exists assinatura_data text;

notify pgrst, 'reload schema';
