create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists clientes_set_updated_at on public.clientes;
create trigger clientes_set_updated_at before update on public.clientes for each row execute function public.set_updated_at();
drop trigger if exists ordens_servico_set_updated_at on public.ordens_servico;
create trigger ordens_servico_set_updated_at before update on public.ordens_servico for each row execute function public.set_updated_at();
drop trigger if exists orcamentos_set_updated_at on public.orcamentos;
create trigger orcamentos_set_updated_at before update on public.orcamentos for each row execute function public.set_updated_at();
