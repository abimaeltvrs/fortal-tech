# FORTAL TECH V1.12.5 — Rascunho automático

Objetivo:
Nenhum preenchimento deve ser perdido se a página atualizar, o PWA fechar ou o navegador recarregar.

Implementado inicialmente nos formulários mais críticos:
- Ordem de Serviço;
- Orçamento;
- Entrada/Saída do Financeiro.

Funcionamento:
- enquanto o usuário digita, o formulário é salvo automaticamente no armazenamento local do aparelho;
- o salvamento acontece poucos milissegundos após cada alteração;
- se a página atualizar ou o app fechar, ao abrir o mesmo formulário o rascunho é restaurado;
- aparece o aviso `Rascunho recuperado`;
- existe opção `Descartar rascunho`;
- o rascunho só é apagado automaticamente depois que o documento é salvo com sucesso.

OS:
O rascunho preserva:
- dados do atendimento;
- sistemas;
- checklist;
- materiais;
- fotos adicionadas ao estado do formulário;
- assinaturas;
- responsável pelo cliente;
- seções abertas.

Orçamento:
Preserva:
- cliente;
- OS relacionada;
- itens;
- valores;
- pagamento;
- observações.

Financeiro:
Preserva:
- Entrada/Saída;
- descrição;
- categoria;
- valor;
- datas;
- status;
- pagamento;
- cliente/fornecedor;
- observações.

Observação:
O rascunho fica apenas no aparelho onde foi digitado. Ele não é sincronizado com o Supabase até o usuário salvar o documento.

Não há SQL novo nesta versão.
