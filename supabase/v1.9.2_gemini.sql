-- ============================================================
-- FORTAL TECH V1.9.2 - MIGRAÇÃO DO ASSISTENTE PARA GEMINI
-- Execute no Supabase SQL Editor.
-- ============================================================

alter table public.manuais_tecnicos
  add column if not exists provedor_ia text default 'gemini';

update public.manuais_tecnicos
set provedor_ia='gemini',
    status_indexacao='pronto';

notify pgrst, 'reload schema';
