# FORTAL TECH V1.14.2

## Correção do envio de OS
- Remove dependência do Resend/API de e-mail.
- Usa o mesmo padrão já adotado no envio de Orçamento.
- Busca o e-mail cadastrado do cliente.
- Preenche destinatário, assunto e mensagem automaticamente.
- No celular/PWA, tenta compartilhar o PDF da OS diretamente pelo menu nativo.
- Quando o navegador não permite anexar pelo compartilhamento, gera o PDF e abre o app de e-mail com os campos preenchidos para o usuário confirmar o envio.
- Mantém o registro do último envio no Supabase.

Não exige nova configuração na Vercel. O SQL executado na V1.14.1 pode permanecer.
