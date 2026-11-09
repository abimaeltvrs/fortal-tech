-- FORTAL TECH V1.16.4 — executar como proprietário no SQL Editor.
-- Funções SECURITY DEFINER retornam dados somente para administrador ativo.
CREATE OR REPLACE FUNCTION public.fortal_storage_overview() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, storage AS $$
DECLARE result jsonb;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso restrito ao administrador'; END IF;
 SELECT jsonb_build_object(
  'database',jsonb_build_object('bytes',pg_database_size(current_database())),
  'buckets',COALESCE((SELECT jsonb_agg(jsonb_build_object('bucket',bucket_id,'count',cnt,'bytes',bytes)) FROM (
    SELECT bucket_id,count(*) cnt,COALESCE(sum(CASE WHEN metadata->>'size' ~ '^[0-9]+$' THEN (metadata->>'size')::numeric ELSE 0 END),0) bytes
    FROM storage.objects WHERE bucket_id IN ('os-arquivos','manuais-tecnicos') GROUP BY bucket_id
  ) x),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.fortal_storage_inventory() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, storage AS $$
DECLARE result jsonb;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso restrito ao administrador'; END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('bucket',bucket_id,'path',name,'size',CASE WHEN metadata->>'size' ~ '^[0-9]+$' THEN (metadata->>'size')::numeric ELSE 0 END) ORDER BY bucket_id,name),'[]'::jsonb)
 INTO result FROM storage.objects WHERE bucket_id IN ('os-arquivos','manuais-tecnicos') AND name NOT LIKE '%/.emptyFolderPlaceholder';
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.fortal_storage_orphans() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, storage AS $$
DECLARE result jsonb;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso restrito ao administrador'; END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('bucket',o.bucket_id,'path',o.name,'size',CASE WHEN o.metadata->>'size' ~ '^[0-9]+$' THEN (o.metadata->>'size')::numeric ELSE 0 END) ORDER BY o.bucket_id,o.name),'[]'::jsonb)
 INTO result FROM storage.objects o
 WHERE (o.bucket_id='os-arquivos' AND NOT EXISTS(SELECT 1 FROM public.os_fotos f WHERE f.arquivo_path=o.name))
 OR (o.bucket_id='manuais-tecnicos' AND NOT EXISTS(SELECT 1 FROM public.manuais_tecnicos m WHERE m.arquivo_path=o.name));
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.fortal_storage_overview() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fortal_storage_inventory() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fortal_storage_orphans() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fortal_storage_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fortal_storage_inventory() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fortal_storage_orphans() TO authenticated;
-- Permitir que administrador autenticado baixe os dois buckets para backup.
DROP POLICY IF EXISTS "Fortal admin backup storage" ON storage.objects;
CREATE POLICY "Fortal admin backup storage" ON storage.objects FOR SELECT TO authenticated
USING(bucket_id IN ('os-arquivos','manuais-tecnicos') AND public.is_admin());
-- Permitir exclusão SOMENTE ao administrador; o aplicativo limita a órfãos.
DROP POLICY IF EXISTS "Fortal admin limpa storage" ON storage.objects;
CREATE POLICY "Fortal admin limpa storage" ON storage.objects FOR DELETE TO authenticated
USING(bucket_id IN ('os-arquivos','manuais-tecnicos') AND public.is_admin());
NOTIFY pgrst,'reload schema';
