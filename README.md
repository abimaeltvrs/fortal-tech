# FORTAL TECH V1.6.1

Correções e melhorias de Orçamentos.

Correção:
- `Sem OS relacionada` agora salva corretamente;
- `os_id` vazio é enviado como `null`, evitando:
  `invalid input syntax for type uuid: ""`.

Envio:
- botão `Enviar` em cada orçamento criado;
- opções:
  - WhatsApp
  - E-mail
  - Compartilhar
- usa telefone/e-mail cadastrados no cliente;
- em celulares compatíveis, usa o compartilhamento nativo e tenta anexar o PDF;
- no WhatsApp, se compartilhamento de arquivo não estiver disponível, abre a conversa com mensagem pronta;
- no e-mail, abre o cliente de e-mail com destinatário, assunto e mensagem já preenchidos;
- opção Compartilhar permite escolher qualquer aplicativo disponível no aparelho.

Observação:
Para envio de e-mail 100% automático sem abrir o aplicativo de e-mail, será necessário configurar um serviço de e-mail no backend (ex.: Resend). Isso exige uma conta/chave e remetente configurado.

Não há SQL novo nesta versão.
