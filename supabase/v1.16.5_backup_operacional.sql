-- FORTAL TECH V1.16.5 — backup operacional e restauração protegida
-- Execute no SQL Editor após V1.16.4. Somente administrador ativo.
CREATE OR REPLACE FUNCTION public.fortal_operational_export() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE result jsonb := '{}'::jsonb; tbl text; rows jsonb;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 FOREACH tbl IN ARRAY ARRAY['clientes','ordens_servico','os_sistemas','os_checklist','os_materiais','os_fotos','os_assinaturas','orcamentos','orcamento_itens','orcamento_reparos'] LOOP
  IF to_regclass('public.'||tbl) IS NOT NULL THEN
   EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(t)),''[]''::jsonb) FROM public.%I t',tbl) INTO rows;
   result := result || jsonb_build_object(tbl,rows);
  ELSE result := result || jsonb_build_object(tbl,'[]'::jsonb); END IF;
 END LOOP;
 RETURN jsonb_build_object('schema','fortal-operational-v1','tables',result);
END $$;

CREATE OR REPLACE FUNCTION public.fortal_operational_restore(payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE tbl text; rows jsonb; rec jsonb; cols text; vals text; col text; inserted integer; total integer := 0; result jsonb := '{}'::jsonb;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 IF payload->>'schema' <> 'fortal-operational-v1' OR jsonb_typeof(payload->'tables') <> 'object' THEN RAISE EXCEPTION 'Formato de backup inválido'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(payload->'tables') k WHERE k NOT IN ('clientes','ordens_servico','os_sistemas','os_checklist','os_materiais','os_fotos','os_assinaturas','orcamentos','orcamento_itens','orcamento_reparos')) THEN RAISE EXCEPTION 'Tabela não autorizada'; END IF;
 FOREACH tbl IN ARRAY ARRAY['clientes','ordens_servico','os_sistemas','os_checklist','os_materiais','os_fotos','os_assinaturas','orcamentos','orcamento_itens','orcamento_reparos'] LOOP
  rows := coalesce(payload->'tables'->tbl,'[]'::jsonb);
  IF jsonb_typeof(rows) <> 'array' OR jsonb_array_length(rows)>10000 THEN RAISE EXCEPTION 'Quantidade/formato inválido em %',tbl; END IF;
  IF to_regclass('public.'||tbl) IS NULL THEN
   IF jsonb_array_length(rows)>0 THEN RAISE EXCEPTION 'Tabela não encontrada: %',tbl; END IF;
   CONTINUE;
  END IF;
  inserted := 0;
  FOR rec IN SELECT value FROM jsonb_array_elements(rows) LOOP
   IF jsonb_typeof(rec)<>'object' OR NOT(rec ? 'id') THEN RAISE EXCEPTION 'Registro sem ID em %',tbl; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_object_keys(rec) k WHERE NOT EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name=tbl AND c.column_name=k AND c.is_generated='NEVER')) THEN RAISE EXCEPTION 'Coluna inválida em %',tbl; END IF;
   SELECT string_agg(format('%I',key),','),string_agg(format('($1->>%L)::%s',key,format_type(a.atttypid,a.atttypmod)),',') INTO cols,vals
   FROM jsonb_object_keys(rec) AS k(key) JOIN pg_attribute a ON a.attrelid=to_regclass('public.'||tbl) AND a.attname=k.key AND a.attnum>0 AND NOT a.attisdropped;
   EXECUTE format('INSERT INTO public.%I (%s) VALUES (%s) ON CONFLICT DO NOTHING',tbl,cols,vals) USING rec;
   GET DIAGNOSTICS total = ROW_COUNT;
   inserted := inserted+total;
  END LOOP;
  result := result || jsonb_build_object(tbl,inserted);
 END LOOP;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.fortal_operational_export() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fortal_operational_restore(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fortal_operational_export() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fortal_operational_restore(jsonb) TO authenticated;
-- Upload de fotos recuperadas, exclusivamente para administrador.
DROP POLICY IF EXISTS "Fortal admin restaura fotos" ON storage.objects;
CREATE POLICY "Fortal admin restaura fotos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK(bucket_id='os-arquivos' AND public.is_admin());
NOTIFY pgrst,'reload schema';
