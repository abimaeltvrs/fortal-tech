-- FORTAL TECH V1.14 - custo interno, acréscimo e unidade dos itens
alter table public.orcamento_itens
  add column if not exists unidade text default 'un',
  add column if not exists custo_unitario numeric default 0,
  add column if not exists acrescimo_percentual numeric default 0;

-- Orçamentos antigos: preserva o preço atual como custo-base, sem alterar o valor vendido.
update public.orcamento_itens
set custo_unitario = valor_unitario
where custo_unitario is null or custo_unitario = 0;

update public.orcamento_itens
set unidade = case when tipo='servico' then 'serv' else 'un' end
where unidade is null or unidade='';

notify pgrst, 'reload schema';
