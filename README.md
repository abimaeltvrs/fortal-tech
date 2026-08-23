# FORTAL TECH V1.6.8

Correção da integração OS → Orçamento.

Corrigido:
- ao importar materiais/peças de uma OS, o sistema agora lê corretamente a coluna `preco_unitario`;
- importa:
  - item/descrição;
  - quantidade;
  - preço unitário;
- o subtotal de cada item é calculado automaticamente;
- o total do orçamento é recalculado com os valores importados.

Não há SQL novo nesta versão.

Teste recomendado:
1. Abra uma OS com material contendo preço.
2. Crie um orçamento.
3. Selecione essa OS.
4. Confirme se item, quantidade e preço unitário foram preenchidos.
