-- ============================================================
-- FORTAL TECH V1.6.4 - PROTEÇÃO FINANCEIRA
-- Execute no Supabase SQL Editor.
-- ============================================================

-- Garante que os campos principais existam.
alter table public.financeiro_lancamentos
  add column if not exists orcamento_id uuid references public.orcamentos(id) on delete set null;

alter table public.financeiro_lancamentos
  add column if not exists parcela_numero integer default 1;

alter table public.financeiro_lancamentos
  add column if not exists parcela_total integer default 1;

-- Remove possíveis duplicações exatas já existentes antes de criar o índice.
delete from public.financeiro_lancamentos a
using public.financeiro_lancamentos b
where a.id > b.id
  and a.orcamento_id is not null
  and a.orcamento_id = b.orcamento_id
  and coalesce(a.parcela_numero,1) = coalesce(b.parcela_numero,1);

-- Proteção no próprio banco contra duplicar uma parcela do mesmo orçamento.
create unique index if not exists ux_financeiro_orcamento_parcela
on public.financeiro_lancamentos(orcamento_id, parcela_numero)
where orcamento_id is not null;

notify pgrst, 'reload schema';
