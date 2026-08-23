# FORTAL TECH V1.2.1

Correções da V1.2:

- Corrige erro da Agenda: `Could not find the 'sistema' column`.
- Garante todas as colunas utilizadas pelo formulário de agendamento.
- Remove bloqueio de `empresa_id` herdado do banco antigo, caso exista.
- Recarrega o schema do Supabase/PostgREST.
- Mantém as regras ADMIN/TÉCNICO da Agenda.
- Corrige menu lateral no celular/PWA instalado.
- Nome e perfil do usuário não ultrapassam mais o menu.
- Botão de sair permanece alinhado.
- Ajusta modal de agendamento em telas pequenas.

## Ordem de atualização

1. Execute `supabase/v1.2.1_hotfix.sql` no SQL Editor do Supabase.
2. Atualize os arquivos do GitHub pelos desta versão.
3. Commit na branch `main`.
4. Aguarde a Vercel ficar `Ready`.
5. Feche e abra novamente o PWA instalado para receber a atualização.
