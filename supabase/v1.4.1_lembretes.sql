-- ============================================================
-- FORTAL TECH V1.4.1 - LEMBRETES INTERNOS DA AGENDA
-- ============================================================

alter table public.agendamentos
  add column if not exists lembrete_ativo boolean not null default true;

alter table public.agendamentos
  add column if not exists lembrete_minutos integer not null default 60;

notify pgrst, 'reload schema';
