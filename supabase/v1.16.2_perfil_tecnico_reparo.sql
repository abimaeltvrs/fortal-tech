-- FORTAL TECH V1.16.2. Execute APÓS v1.16.1_reparos.sql.
-- Não cria conta de autenticação. O e-mail deve se cadastrar primeiro.
-- Proteção no banco: técnico_reparo só gerencia orçamentos marcados como reparo.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_perfil_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_perfil_check CHECK (perfil IN ('admin','tecnico','tecnico_reparo'));
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS modalidade text NOT NULL DEFAULT 'tradicional';
UPDATE public.orcamentos o SET modalidade='reparo' WHERE EXISTS (SELECT 1 FROM public.orcamento_reparos r WHERE r.orcamento_id=o.id);
ALTER TABLE public.orcamentos DROP CONSTRAINT IF EXISTS orcamentos_modalidade_check;
ALTER TABLE public.orcamentos ADD CONSTRAINT orcamentos_modalidade_check CHECK(modalidade IN ('tradicional','reparo'));

CREATE OR REPLACE FUNCTION public.is_repair_tech() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND perfil='tecnico_reparo' AND status='ativo');
$$;
REVOKE ALL ON FUNCTION public.is_repair_tech() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_repair_tech() TO authenticated;

-- O perfil técnico padrão permanece sem acesso a orçamentos.
CREATE POLICY "Reparo tecnico orcamentos" ON public.orcamentos FOR ALL TO authenticated
 USING(public.is_repair_tech() AND modalidade='reparo')
 WITH CHECK(public.is_repair_tech() AND modalidade='reparo');
CREATE POLICY "Reparo tecnico itens" ON public.orcamento_itens FOR ALL TO authenticated
 USING(public.is_repair_tech() AND EXISTS(SELECT 1 FROM public.orcamentos o WHERE o.id=orcamento_id AND o.modalidade='reparo'))
 WITH CHECK(public.is_repair_tech() AND EXISTS(SELECT 1 FROM public.orcamentos o WHERE o.id=orcamento_id AND o.modalidade='reparo'));
CREATE POLICY "Reparo tecnico detalhes" ON public.orcamento_reparos FOR ALL TO authenticated
 USING(public.is_repair_tech() AND EXISTS(SELECT 1 FROM public.orcamentos o WHERE o.id=orcamento_id AND o.modalidade='reparo'))
 WITH CHECK(public.is_repair_tech() AND EXISTS(SELECT 1 FROM public.orcamentos o WHERE o.id=orcamento_id AND o.modalidade='reparo'));

-- Técnico de reparos pode atuar em OS de toda a equipe, inclusive excluir.
CREATE POLICY "Reparo tecnico OS" ON public.ordens_servico FOR ALL TO authenticated
 USING(public.is_repair_tech()) WITH CHECK(public.is_repair_tech());
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['os_sistemas','os_checklist','os_materiais','os_fotos','os_assinaturas'] LOOP
  EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING(public.is_repair_tech()) WITH CHECK(public.is_repair_tech())', 'Reparo tecnico '||t,t);
 END LOOP;
END $$;

-- Acesso aos clientes já existentes depende das políticas de clientes em vigor.
-- Financeiro, relatórios, perfis e configurações NÃO recebem políticas adicionais.
-- Acesso financeiro é restrito no cliente e deve permanecer restrito nas políticas existentes.
-- Conceder o perfil APENAS após confirmar que a conta está criada:
-- UPDATE public.profiles SET perfil='tecnico_reparo', status='ativo', updated_at=now()
-- WHERE lower(email)='winstonamaro66@gmail.com';
NOTIFY pgrst, 'reload schema';
