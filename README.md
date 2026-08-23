# FORTAL TECH V1.6

Novo módulo: Orçamentos.

Inclui:
- criar, editar e excluir orçamento;
- vincular orçamento a cliente;
- vincular orçamento a uma Ordem de Serviço;
- itens do tipo Serviço ou Material;
- quantidade e valor unitário;
- subtotal automático;
- desconto;
- total final;
- validade;
- forma de pagamento;
- status:
  - Em elaboração
  - Enviado
  - Aprovado
  - Recusado
  - Expirado
- PDF profissional do orçamento;
- botão `Orçamento` em OS que estiver marcada como `Necessita orçamento`;
- atalho `Criar > Novo orçamento` agora abre o módulo real.

Acesso:
- módulo permanece restrito ao Administrador.

Antes de testar:
1. Execute `supabase/v1.6_orcamentos.sql`.
2. Atualize o GitHub.
3. Aguarde a Vercel ficar Ready.
