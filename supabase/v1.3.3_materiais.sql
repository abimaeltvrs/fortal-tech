-- ============================================================
-- FORTAL TECH V1.3.3 - PREÇO DOS MATERIAIS
-- Execute no Supabase SQL Editor.
-- ============================================================

alter table public.os_materiais
  add column if not exists preco_unitario numeric not null default 0;

-- Se a tabela já existia com estrutura antiga, garante default.
alter table public.os_materiais
  alter column preco_unitario set default 0;

notify pgrst, 'reload schema';
