# FORTAL TECH V1.6.3

Correções funcionais:
- garante a criação da tabela `financeiro_lancamentos`;
- garante todas as colunas usadas no fluxo de aprovação;
- corrige bases antigas que ainda tenham `empresa_id`;
- recria a política RLS para Administrador;
- força atualização do schema do Supabase;
- mensagem mais clara caso o Financeiro ainda não esteja disponível.

Correções visuais:
- status do orçamento não ultrapassa mais o card;
- status `Enviado / Aguardando aprovação` quebra linha corretamente;
- ações ficam organizadas no celular;
- Aprovar e Enviar ganham mais espaço;
- PDF, editar e excluir ficam alinhados;
- card se adapta melhor a telas pequenas.

Antes de testar:
1. Execute `supabase/v1.6.3_hotfix_financeiro.sql`.
2. Atualize o GitHub com esta versão.
3. Aguarde a Vercel ficar Ready.
4. Teste `Aprovar` em um orçamento Enviado.
