alter table public.ordens_servico
  add column if not exists os_enviada_em timestamptz,
  add column if not exists os_enviada_para text,
  add column if not exists os_envio_metodo text;
notify pgrst, 'reload schema';
