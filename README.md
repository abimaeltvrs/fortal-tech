# FORTAL TECH V1.6.2

Fluxo de orçamento e financeiro.

Envio:
- depois do envio por WhatsApp, E-mail ou Compartilhar:
  - status muda automaticamente para `Enviado / Aguardando aprovação`;
  - registra `enviado_em`;
  - registra o canal utilizado.

Pagamento:
- forma de pagamento estruturada:
  - Pix
  - Cartão de débito
  - Cartão de crédito
- no crédito, permite escolher de 1x a 12x.

Aprovação:
- orçamento enviado ganha botão `Aprovar`;
- ao aprovar:
  - status passa para `Aprovado`;
  - registra `aprovado_em`;
  - cria automaticamente lançamentos no Financeiro.

Financeiro:
- Pix: 1 lançamento;
- Débito: 1 lançamento;
- Crédito parcelado: cria 1 lançamento por parcela;
- parcelas são distribuídas mensalmente;
- total das parcelas respeita exatamente o total do orçamento;
- lançamentos iniciam como `Pendente`;
- botão `Recebido` baixa cada lançamento;
- cards de `A receber` e `Recebido`.

Antes de testar:
1. Execute `supabase/v1.6.2_financeiro.sql`.
2. Atualize o GitHub.
3. Aguarde a Vercel ficar Ready.
