-- ============================================================
-- FORTAL TECH V1.11 - GESTÃO FINANCEIRA / CAIXA
-- Execute no Supabase SQL Editor ANTES de testar a versão.
-- Preserva os lançamentos já existentes.
-- ============================================================

alter table public.financeiro_lancamentos
  add column if not exists tipo text;

alter table public.financeiro_lancamentos
  add column if not exists descricao text;

alter table public.financeiro_lancamentos
  add column if not exists categoria text;

alter table public.financeiro_lancamentos
  add column if not exists data_movimento date;

alter table public.financeiro_lancamentos
  add column if not exists fornecedor text;

alter table public.financeiro_lancamentos
  add column if not exists observacoes text;

alter table public.financeiro_lancamentos
  add column if not exists origem text default 'manual';

-- Lançamentos antigos provenientes de orçamento são entradas.
update public.financeiro_lancamentos
set tipo = coalesce(tipo,'entrada'),
    descricao = coalesce(descricao,
      case when orcamento_id is not null then 'Recebimento de orçamento' else 'Entrada financeira' end),
    categoria = coalesce(categoria,
      case when orcamento_id is not null then 'Recebimento de orçamento' else 'Serviços' end),
    data_movimento = coalesce(data_movimento, created_at::date),
    origem = coalesce(origem,
      case when orcamento_id is not null then 'orcamento' else 'manual' end)
where tipo is null
   or descricao is null
   or categoria is null
   or data_movimento is null
   or origem is null;

-- Compatibilidade com status antigo: aprovado/enviado/etc. permanecem,
-- mas valores recebidos/pagos são os que entram efetivamente no caixa.

create index if not exists financeiro_tipo_idx
  on public.financeiro_lancamentos(tipo);

create index if not exists financeiro_data_movimento_idx
  on public.financeiro_lancamentos(data_movimento);

create index if not exists financeiro_categoria_idx
  on public.financeiro_lancamentos(categoria);

notify pgrst, 'reload schema';
