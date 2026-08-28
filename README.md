# FORTAL TECH V1.12.8 — Hotfix definitivo de salvamento/sincronização da OS

Correções:
- sanitização centralizada do payload da tabela `ordens_servico`;
- `clientes` e outros campos de relacionamento nunca são enviados ao Supabase;
- a fila de sincronização offline também é higienizada antes de enviar OS antigas;
- bundles antigos salvos offline são filtrados no momento da sincronização;
- service worker atualizado para `fortal-tech-v1.12.8-pwa`;
- HTML/navegação passam a priorizar a versão da rede quando houver internet;
- caches antigos do PWA são removidos ao ativar a nova versão;
- sistema de rascunho permanece ativo.

Não há SQL novo nesta versão.

Após o deploy:
1. Abra o site pelo navegador uma vez.
2. Feche completamente o PWA/app instalado.
3. Abra novamente.
4. Reabra a OS pelo rascunho e tente salvar.
