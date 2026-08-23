-- ============================================================
-- FORTAL TECH V1.3.1 - HOTFIX OS
-- Limpa possíveis registros filhos órfãos/duplicados de tentativas anteriores
-- e atualiza o cache do Supabase.
-- ============================================================

-- Remove filhos que apontem para uma OS inexistente.
delete from public.os_sistemas s
where not exists (
  select 1 from public.ordens_servico os where os.id=s.os_id
);

delete from public.os_checklist c
where not exists (
  select 1 from public.ordens_servico os where os.id=c.os_id
);

delete from public.os_materiais m
where not exists (
  select 1 from public.ordens_servico os where os.id=m.os_id
);

-- Garante default UUID no id das tabelas filhas.
alter table public.os_sistemas
  alter column id set default gen_random_uuid();

alter table public.os_checklist
  alter column id set default gen_random_uuid();

alter table public.os_materiais
  alter column id set default gen_random_uuid();

notify pgrst, 'reload schema';
