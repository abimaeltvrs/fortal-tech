# FORTAL TECH V1.9.3

Correção do Assistente Técnico Gemini.

Alteração:
- modelo trocado de `gemini-2.5-flash-lite` para `gemini-3.5-flash-lite`;
- mantém o mesmo fluxo:
  - PDF privado no Supabase;
  - backend seguro na Vercel;
  - `GEMINI_API_KEY` protegida;
  - pergunta enviada junto com o PDF;
  - resposta baseada somente no manual selecionado.

Não há SQL novo nesta versão.

Teste:
1. Atualize o GitHub.
2. Aguarde a Vercel ficar Ready.
3. Abra Manuais / Assistente Técnico.
4. Selecione o manual.
5. Pergunte novamente, por exemplo:
   `Erro 8, qual a causa?`
