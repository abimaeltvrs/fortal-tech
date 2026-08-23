-- ============================================================
-- FORTAL TECH V1.9.1 - INDEXAÇÃO OPENAI / FILE SEARCH
-- Execute no Supabase SQL Editor.
-- ============================================================

alter table public.manuais_tecnicos
  add column if not exists openai_file_id text;

alter table public.manuais_tecnicos
  add column if not exists vector_store_id text;

alter table public.manuais_tecnicos
  add column if not exists indexado_em timestamptz;

-- Normaliza status antigos
update public.manuais_tecnicos
set status_indexacao='pendente'
where status_indexacao is null;

notify pgrst, 'reload schema';
