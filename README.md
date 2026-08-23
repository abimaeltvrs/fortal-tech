# FORTAL TECH V1.11 — Gestão Financeira / Caixa

O Financeiro agora funciona como caixa da empresa.

Principais recursos:
- lançamento manual de Entrada;
- lançamento manual de Saída;
- contas a receber;
- contas a pagar;
- saldo de caixa;
- entradas recebidas;
- saídas pagas;
- valores vencidos;
- categorias financeiras;
- forma de pagamento;
- vínculo opcional de entrada com cliente;
- fornecedor/favorecido nas saídas;
- observações;
- filtros por período, tipo, status e categoria;
- busca de movimentações.

Regra do Caixa:
- Entrada pendente = conta a receber e NÃO aumenta o saldo;
- Entrada recebida = aumenta o caixa;
- Saída pendente = conta a pagar e NÃO reduz o saldo;
- Saída paga = reduz o caixa.

Integração:
- lançamentos antigos provenientes de orçamento são preservados;
- lançamentos de orçamento continuam identificados;
- lançamento automático de orçamento não pode ser excluído pelo Caixa.

IMPORTANTE:
Execute `supabase/v1.11_financeiro_caixa.sql` antes de testar.
