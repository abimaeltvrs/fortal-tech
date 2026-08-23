# FORTAL TECH V1.9

Novo módulo: Manuais / Assistente Técnico.

Nesta etapa:
- nova aba disponível para Administrador e Técnico;
- Administrador envia PDFs;
- cadastro por Fabricante, Modelo/Equipamento e Categoria;
- biblioteca pesquisável;
- abrir PDF dentro do dispositivo;
- Administrador pode excluir manuais;
- Técnico pode consultar, mas não alterar a biblioteca;
- bucket privado no Supabase;
- tabela de chunks e pgvector preparada para busca semântica;
- interface de chat criada.

IMPORTANTE:
A biblioteca de PDFs já funciona nesta versão.
O chat ainda não inventa respostas sobre o PDF. Ele fica preparado e informa que falta configurar a API/indexador.
Isso é proposital: a chave da IA nunca deve ficar no frontend.

Próxima etapa:
- criar backend seguro;
- configurar chave da API;
- extrair/indexar os PDFs;
- gerar embeddings;
- busca semântica;
- respostas com citação de manual e página.

Antes de testar:
1. Execute `supabase/v1.9_manuais_assistente.sql`.
2. Atualize o GitHub.
3. Aguarde o deploy.
4. Entre como Administrador.
5. Abra Manuais / Assistente e envie um PDF.
