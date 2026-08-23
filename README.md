# FORTAL TECH V1.9.1

Assistente Técnico conectado à OpenAI.

Fluxo:
1. Administrador envia o PDF.
2. Toca em `Indexar IA`.
3. Backend da Vercel baixa o PDF privado do Supabase.
4. O PDF é enviado à OpenAI Files API.
5. É criado um Vector Store específico para o manual.
6. O arquivo é indexado.
7. Status muda para `Pronto para IA`.
8. Administrador ou Técnico seleciona o manual.
9. Faz uma pergunta no chat.
10. A Responses API usa File Search somente naquele manual.

Segurança:
- OPENAI_API_KEY permanece somente na Vercel;
- nenhuma chave fica no frontend, GitHub ou APK;
- PDFs continuam privados no Supabase;
- o chat é instruído a não inventar respostas quando o manual não trouxer a informação.

Modelo:
- `gpt-5.6-luna`, escolhido para reduzir custo do assistente.

Observação:
- File Search fornece citações ao arquivo utilizado.
- número exato da página não é garantido pelo File Search em toda resposta;
- uma etapa posterior pode adicionar extração paginada se for necessário citar página exata.

Antes de testar:
1. Execute `supabase/v1.9.1_openai_file_search.sql`.
2. Atualize o GitHub.
3. Aguarde a Vercel redeployar para carregar OPENAI_API_KEY.
4. Abra Manuais.
5. Em um PDF já enviado, toque em `Indexar IA`.
6. Aguarde aparecer `Pronto para IA`.
7. Selecione o manual e faça uma pergunta.
