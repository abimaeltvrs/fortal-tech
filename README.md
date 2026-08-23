# FORTAL TECH V1.6.5

Integração OS → Orçamento.

Agora:
- ao criar um orçamento e selecionar uma OS, o sistema oferece/importa os materiais e peças registrados nela;
- importa descrição/nome do item;
- importa quantidade;
- importa preço/valor unitário;
- o subtotal e o total do orçamento são recalculados automaticamente;
- os itens importados continuam editáveis;
- é possível excluir itens que não serão cobrados;
- é possível adicionar novos Serviços ou Materiais;
- botão `Importar materiais/peças da OS` permite refazer a leitura;
- evita repetir no mesmo formulário o mesmo item importado da OS;
- ao usar o botão `Orçamento` diretamente em uma OS, a importação é feita automaticamente.

O vínculo continua sendo:
OS → Orçamento → Aprovação → Financeiro.

Antes de testar:
1. Execute `supabase/v1.6.5_integracao_os_orcamento.sql`.
2. Atualize o GitHub.
3. Aguarde a Vercel ficar Ready.
4. Crie uma OS com materiais/peças e preços.
5. Crie um orçamento e selecione essa OS.
