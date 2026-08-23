# FORTAL TECH V1.9.2

Assistente Técnico migrado da OpenAI para Gemini.

O que mudou:
- não depende mais de créditos da OpenAI;
- usa `GEMINI_API_KEY` armazenada somente na Vercel;
- modelo utilizado: `gemini-2.5-flash-lite`;
- o modelo possui nível gratuito sujeito aos limites/quota do Google;
- não existe mais botão `Indexar IA`;
- qualquer PDF cadastrado fica pronto para consulta;
- a cada pergunta, o backend obtém temporariamente o PDF privado do Supabase e envia seu conteúdo ao Gemini;
- o Gemini é instruído a responder somente com base no PDF;
- se não localizar a informação, deve dizer que não encontrou;
- quando conseguir identificar seção ou página com segurança, pode citá-la;
- não inventa página quando ela não puder ser determinada.

Limites:
- PDFs de até 50 MB para este fluxo;
- o nível gratuito possui cotas de uso definidas pelo Google;
- no Free Tier, o Google informa que dados podem ser usados para melhorar seus produtos.

Antes de testar:
1. Confirme `GEMINI_API_KEY` em Vercel → Environment Variables.
2. Execute `supabase/v1.9.2_gemini.sql`.
3. Atualize o GitHub.
4. Aguarde a Vercel ficar Ready.
5. Abra o manual e faça uma pergunta no chat.

A `OPENAI_API_KEY` pode permanecer cadastrada por enquanto, mas não é mais usada pelo Assistente Técnico desta versão.
