# FORTAL TECH V1.3.3

Melhorias na Ordem de Serviço:

- após salvar corretamente, a janela da OS fecha;
- a lista de OS é atualizada automaticamente;
- confirmação visual de OS criada/atualizada;
- botão `Gerar PDF` em cada OS;
- PDF inclui cliente, atendimento, sistemas, checklist, diagnóstico,
  materiais, pendências, recomendações e condição final;
- materiais agora possuem:
  - nome/descrição;
  - quantidade;
  - unidade;
  - preço unitário;
  - subtotal;
  - total geral;
- em OS com prioridade `Emergencial`, o total de materiais recebe destaque;
- o PDF também destaca o custo dos materiais da OS emergencial.

Assinaturas digitais e fotos permanecem para a próxima etapa.

Antes de testar:
1. Execute `supabase/v1.3.3_materiais.sql`.
2. Atualize o GitHub com os arquivos desta versão.
3. Aguarde a Vercel ficar Ready.
