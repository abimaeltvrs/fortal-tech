# FORTAL TECH V1.4.4

Novo módulo no Dashboard: Notícias & Mercado.

Inclui:
- carrossel de notícias no Dashboard;
- atualização automática a cada acesso ao assunto;
- rotação automática das notícias;
- navegação manual;
- botão `Ler notícia`;
- temas padrão:
  - CFTV
  - Controle de Acesso
  - Segurança Eletrônica
  - Redes e Infraestrutura
  - Sistema de Alarme
  - Nobreak e Energia
- permite adicionar qualquer assunto personalizado;
- permite remover assuntos;
- botão de configuração diretamente no carrossel;
- cache local das últimas notícias por assunto;
- quando estiver offline, mostra as últimas notícias armazenadas;
- ao voltar a internet, atualiza novamente.

Implementação:
- `/api/news.js` funciona como endpoint server-side na Vercel;
- o navegador não acessa diretamente a fonte RSS;
- não é necessária chave de API.

Não há SQL novo nesta versão.
