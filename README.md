# FORTAL TECH V1.9.5

Correção do Assistente Técnico.

Problema corrigido:
- a V1.9.4 possuía um erro no frontend que impedia a nova tela estruturada de compilar;
- por isso a Vercel podia continuar servindo a versão anterior, com resposta em bloco corrido.

Nesta versão:
- resposta realmente separada em:
  - Resposta
  - Causa
  - Procedimento
  - Atenção
  - Observação
  - Fonte
- o Gemini procura referência visual quando a pergunta pede:
  - mostrar;
  - bornes;
  - ligação;
  - diagrama;
  - esquema;
  - componente;
  - localização.
- quando encontra uma página relevante, o app usa `pdfjs-dist` para renderizar a página REAL do PDF como imagem dentro do chat;
- botão `Abrir página` continua disponível;
- não gera desenho técnico inventado;
- botão Limpar conversa permanece.

IMPORTANTE:
Ao atualizar pelo GitHub, o `package.json` adiciona a dependência `pdfjs-dist`.
A Vercel instalará essa dependência automaticamente no novo deploy.

Não há SQL novo.
