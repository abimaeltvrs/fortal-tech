# FORTAL TECH V1.6.4

Fechamento do vínculo Orçamento → Financeiro.

Aprovação:
- ao aprovar, o sistema verifica primeiro se já existem lançamentos;
- se já existirem, não duplica;
- se não existirem, cria automaticamente;
- se a criação financeira falhar, o orçamento volta automaticamente para:
  `Enviado / Aguardando aprovação`;
- evita ficar `Aprovado` sem lançamento financeiro.

Banco:
- índice único protege contra duplicar a mesma parcela do mesmo orçamento.

Visual:
- orçamento aprovado mostra `Lançado no Financeiro`;
- botão `Financeiro` abre diretamente os lançamentos daquele orçamento;
- Financeiro exibe um aviso de filtro e opção `Mostrar todos`.

Antes de testar:
1. Execute `supabase/v1.6.4_protecao_financeiro.sql`.
2. Atualize o GitHub.
3. Aguarde a Vercel ficar Ready.
