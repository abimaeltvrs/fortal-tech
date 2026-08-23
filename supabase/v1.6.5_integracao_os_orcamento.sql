-- ============================================================
-- FORTAL TECH V1.6.5 - INTEGRAÇÃO OS → ORÇAMENTO
-- Execute no Supabase SQL Editor.
-- ============================================================

-- Garante índice para acelerar a leitura dos materiais de uma OS.
create index if not exists idx_os_materiais_os_id
on public.os_materiais(os_id);

notify pgrst, 'reload schema';
