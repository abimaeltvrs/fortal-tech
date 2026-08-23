# FORTAL TECH V1.5.1

Correções da criação/edição da Ordem de Serviço.

Salvamento:
- valida os campos obrigatórios antes de tentar gravar;
- informa exatamente quais itens estão faltando;
- evidencia os campos pendentes em amarelo;
- rola automaticamente para o primeiro campo faltante;
- cada item da mensagem pode ser tocado para ir direto ao campo;
- botão muda para `Salvando...` durante a gravação;
- se o Supabase retornar erro, a mensagem técnica aparece dentro da OS.

Ao concluir uma OS também são exigidos:
- condição final;
- nome do responsável do cliente;
- assinatura do cliente;
- assinatura do técnico.

Assinaturas:
- componente refeito com Pointer Events para celular;
- assinatura fica preservada ao alterar outros campos;
- redesenho automático após mudanças de layout;
- mantém a assinatura armazenada no estado até salvar.

Antes de testar:
1. Execute `supabase/v1.5.1_hotfix.sql`.
2. Atualize o GitHub.
3. Aguarde a Vercel ficar Ready.
