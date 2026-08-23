# FORTAL TECH V1.8

Módulo de Usuários e Permissões.

Administrador:
- visualiza todos os usuários;
- altera perfil entre Administrador e Técnico;
- ativa/desativa acesso;
- acesso total ao sistema.

Técnico:
- Dashboard operacional;
- Agenda;
- Clientes;
- Ordens de Serviço;
- não visualiza Orçamentos;
- não visualiza Financeiro;
- não visualiza Relatórios administrativos;
- não visualiza Usuários;
- não visualiza Configurações administrativas.

Segurança:
- técnico não consegue acessar páginas administrativas apenas digitando/navegando internamente;
- administrador não pode desativar o próprio usuário pela tela;
- administrador não pode remover o próprio perfil administrativo pela tela.

Cadastro:
- o novo usuário cria sua conta pela tela de acesso;
- depois o administrador define o perfil na aba Usuários.

Antes de testar:
1. Execute `supabase/v1.8_usuarios.sql`.
2. Atualize o GitHub.
3. Aguarde a Vercel ficar Ready.
