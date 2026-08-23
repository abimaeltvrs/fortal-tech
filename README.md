# FORTAL TECH V1.3.1

Correções:
- corrige erro `duplicate key value violates unique constraint "os_sistemas_pkey"`;
- IDs dos sistemas/checklists/materiais passam a ser gerados pelo próprio Supabase;
- sincronização offline usa o mesmo fluxo seguro;
- adiciona botão inteligente `Criar` no Dashboard.

Atalhos de criação:
- Nova OS;
- Novo agendamento;
- Novo cliente;
- Novo orçamento;
- Movimentação financeira.

Os três primeiros já abrem diretamente os formulários existentes.
Orçamento e Financeiro ficam preparados para as próximas etapas.

Antes de testar:
1. Execute `supabase/v1.3.1_hotfix.sql`.
2. Atualize o GitHub com esta versão.
3. Aguarde a Vercel ficar Ready.
