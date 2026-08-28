# FORTAL TECH V1.12.4 — Correção de Salvar / Finalizar OS

Correções funcionais:

## Salvar OS
- removida a validação nativa do navegador que podia bloquear o validador do aplicativo;
- o app agora sempre executa sua própria validação antes de salvar;
- a OS só fecha depois que:
  - OS principal;
  - sistemas;
  - checklist;
  - materiais;
  - fotos;
  - assinaturas
  forem salvos com sucesso;
- em caso de erro online, o modal permanece aberto e os dados digitados não são apagados.

## Campos obrigatórios
Quando faltar algo:
- mostra exatamente os campos pendentes;
- destaca o campo/seção em amarelo;
- rola automaticamente o MODAL até o primeiro campo obrigatório;
- aplica um destaque visual pulsante;
- tenta colocar o foco no campo;
- os nomes dos campos pendentes são clicáveis para navegar diretamente até eles.

Campos mínimos para salvar:
- Cliente;
- Data da visita;
- Horário de chegada;
- pelo menos um Sistema envolvido.

Campos adicionais para concluir:
- Condição final;
- Nome do responsável pelo cliente;
- Assinatura do cliente;
- Assinatura do técnico.

## Finalizar OS
- o botão `Finalizar OS` agora executa tudo em uma única ação;
- valida os campos obrigatórios;
- registra status `concluida`;
- registra horário de término automaticamente;
- registra `encerrada_em`;
- salva a OS;
- salva fotos e assinaturas;
- fecha a edição somente após confirmação do salvamento.

Não é mais necessário tocar em `Finalizar OS` e depois em `Salvar OS`.

Não há SQL novo nesta versão.
