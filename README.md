# FORTAL TECH V1.14.1

- Envio automático de OS por e-mail com PDF anexado.
- Destinatário, assunto e mensagem preenchidos automaticamente.
- Opção Compartilhar para WhatsApp/e-mail/apps do celular.
- Registro do último envio.

## Configuração
1. Execute `supabase/v1.14.1_envio_os.sql`.
2. Na Vercel configure `RESEND_API_KEY` e `OS_EMAIL_FROM`.
3. `OS_EMAIL_FROM` deve ser um remetente/domínio autorizado no serviço de e-mail.
